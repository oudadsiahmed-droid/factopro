'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function POSPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [produits, setProduits] = useState([])
  const [categories, setCategories] = useState([])
  const [categorieActive, setCategorieActive] = useState('Tous')
  const [search, setSearch] = useState('')
  const [panier, setPanier] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showPanier, setShowPanier] = useState(false)
  const [recu, setRecu] = useState(null)
  const [cashRecu, setCashRecu] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    const { data } = await supabase
      .from('produits')
      .select('*')
      .eq('user_id', user.id)
      .gt('quantite', 0)
      .order('nom')
    setProduits(data || [])
    const cats = ['Tous', ...new Set((data || []).map(p => p.categorie).filter(Boolean))]
    setCategories(cats)
    setLoading(false)
  }

  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setScanning(true)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 100)
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39'] })
        const scan = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue
                clearInterval(scan)
                stopScan()
                const found = produits.find(p => p.code_barre === code)
                if (found) { ajouterAuPanier(found) }
                else { alert('Produit non trouvé: ' + code) }
              }
            } catch (e) {}
          }
        }, 300)
        streamRef.current._scanInterval = scan
      } else {
        alert('Scan non supporté. Utilisez Chrome.')
        stopScan()
      }
    } catch (e) {
      alert('Accès caméra refusé')
      setScanning(false)
    }
  }

  const stopScan = () => {
    if (streamRef.current) {
      if (streamRef.current._scanInterval) clearInterval(streamRef.current._scanInterval)
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const produitsFiltres = produits.filter(p => {
    const matchCat = categorieActive === 'Tous' || p.categorie === categorieActive
    const matchSearch = !search ||
      p.nom?.toLowerCase().includes(search.toLowerCase()) ||
      p.code_barre?.includes(search) ||
      p.marque?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const ajouterAuPanier = (produit) => {
    setPanier(prev => {
      const exist = prev.find(i => i.id === produit.id)
      if (exist) {
        if (exist.qte >= produit.quantite) return prev
        return prev.map(i => i.id === produit.id ? { ...i, qte: i.qte + 1 } : i)
      }
      return [...prev, { ...produit, qte: 1 }]
    })
  }

  const modifierQte = (id, delta) => {
    setPanier(prev => prev
      .map(i => i.id === id ? { ...i, qte: i.qte + delta } : i)
      .filter(i => i.qte > 0)
    )
  }

  const setQte = (id, val, maxQte) => {
    const newQte = Math.min(Math.max(parseInt(val) || 1, 1), maxQte)
    setPanier(prev => prev.map(i => i.id === id ? { ...i, qte: newQte } : i))
  }

  const total = panier.reduce((s, i) => s + (Number(i.prix) || 0) * i.qte, 0)

  const encaisser = async () => {
    if (panier.length === 0) return
    setProcessing(true)
    try {
      const { data: vente } = await supabase.from('ventes').insert({
        user_id: user.id, total,
        created_at: new Date().toISOString()
      }).select().single()

      await supabase.from('vente_lignes').insert(
        panier.map(i => ({
          vente_id: vente.id, produit_id: i.id,
          nom_produit: i.nom, quantite: i.qte,
          prix_unitaire: i.prix,
          prix_achat: i.prix_achat || 0,
          total: (Number(i.prix) || 0) * i.qte
        }))
      )

      for (const item of panier) {
        const prod = produits.find(p => p.id === item.id)
        if (prod) {
          await supabase.from('produits')
            .update({ quantite: prod.quantite - item.qte })
            .eq('id', item.id)
        }
      }

      setRecu({ items: [...panier], total, date: new Date().toLocaleString('fr-MA') })
      setPanier([])
      setShowPanier(false)
      setCashRecu('')
      init()
    } catch (e) {
      alert('Erreur lors de la vente')
    }
    setProcessing(false)
  }

  if (recu) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 340, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 60, height: 60, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1E293B' }}>Vente réussie!</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{recu.date}</div>
          </div>
          <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: 16, marginBottom: 16 }}>
            {recu.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                <span style={{ color: '#475569' }}>{item.nom} <span style={{ color: '#94A3B8' }}>x{item.qte}</span></span>
                <span style={{ fontWeight: 600, color: '#1E293B' }}>{((Number(item.prix) || 0) * item.qte).toFixed(2)} MAD</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontWeight: 600, color: '#1E40AF', fontSize: 15 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#1E40AF' }}>{recu.total.toFixed(2)} MAD</span>
          </div>
          <button onClick={() => setRecu(null)} style={{ width: '100%', padding: 14, borderRadius: 12, background: '#2563EB', border: 'none', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Nouvelle vente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', fontFamily: 'sans-serif', paddingBottom: 100 }}>

      <div style={{ background: '#1E293B', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>F</div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>Point de Vente</span>
        </div>
        <button
          onClick={() => setShowPanier(true)}
          style={{ position: 'relative', background: panier.length > 0 ? '#2563EB' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'white', fontSize: 14, fontWeight: 600 }}
        >
          🛒
          {panier.length > 0 && (
            <span style={{ background: '#EF4444', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {panier.length}
            </span>
          )}
          {panier.length > 0 && <span>{total.toFixed(2)} MAD</span>}
        </button>
      </div>

      <div style={{ padding: '12px 16px 6px', display: 'flex', gap: 8 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Chercher produit ou code-barre..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '0.5px solid #E2E8F0', fontSize: 14, outline: 'none', background: 'white' }}
        />
        <button
          onClick={scanning ? stopScan : startScan}
          style={{ width: 46, height: 46, borderRadius: 12, border: 'none', background: scanning ? '#EF4444' : '#2563EB', color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {scanning ? '⏹' : '📷'}
        </button>
      </div>

      {scanning && (
        <div style={{ margin: '0 16px 8px', borderRadius: 12, overflow: 'hidden', position: 'relative', background: '#000', height: 200 }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 220, height: 80, border: '2px solid #60A5FA', borderRadius: 8 }} />
          </div>
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: 12 }}>
            Pointez vers le code-barre
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: '6px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategorieActive(cat)}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer', border: '0.5px solid', background: categorieActive === cat ? '#1E40AF' : 'white', color: categorieActive === cat ? 'white' : '#64748B', borderColor: categorieActive === cat ? '#1E40AF' : '#E2E8F0' }}
          >{cat}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '10px 16px' }}>
        {loading ? (
          <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>⏳ Chargement...</div>
        ) : produitsFiltres.length === 0 ? (
          <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '3rem', color: '#94A3B8', fontSize: 14 }}>Aucun produit trouvé</div>
        ) : produitsFiltres.map(p => {
          const inPanier = panier.find(i => i.id === p.id)
          return (
            <div key={p.id} onClick={() => ajouterAuPanier(p)}
              style={{ background: inPanier ? '#EFF6FF' : 'white', borderRadius: 14, padding: 14, cursor: 'pointer', border: inPanier ? '1.5px solid #93C5FD' : '0.5px solid #E2E8F0', position: 'relative' }}
            >
              {inPanier && (
                <div style={{ position: 'absolute', top: 8, right: 8, background: '#2563EB', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {inPanier.qte}
                </div>
              )}
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>{p.marque}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', lineHeight: 1.3, marginBottom: 6 }}>{p.nom}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1D4ED8' }}>{Number(p.prix).toFixed(2)} MAD</div>
              <div style={{ fontSize: 11, color: Number(p.quantite) <= Number(p.alerte_stock) ? '#EF4444' : '#94A3B8', marginTop: 4 }}>
                Stock: {p.quantite} {Number(p.quantite) <= Number(p.alerte_stock) ? '⚠️' : ''}
              </div>
            </div>
          )
        })}
      </div>

      {showPanier && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} onClick={() => setShowPanier(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#1E293B', borderRadius: '20px 20px 0 0', padding: 20, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>🛒 Panier ({panier.length})</h2>
              <button onClick={() => setShowPanier(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
              {panier.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: 13 }}>Panier khawi</div>
              ) : panier.map(item => (
                <div key={item.id} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#CBD5E1', flex: 1 }}>{item.nom}</span>
                    <span style={{ fontSize: 13, color: '#60A5FA', fontWeight: 600 }}>{((Number(item.prix) || 0) * item.qte).toFixed(2)} MAD</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => modifierQte(item.id, -1)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}>-</button>
                    <input
                      type="number"
                      value={item.qte}
                      min="1"
                      onChange={e => setQte(item.id, e.target.value, item.quantite)}
                      style={{ width: 48, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '0.5px solid rgba(255,255,255,0.2)', color: 'white', fontSize: 14, fontWeight: 600, textAlign: 'center', outline: 'none' }}
                    />
                    <button onClick={() => modifierQte(item.id, 1)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}>+</button>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{Number(item.prix).toFixed(2)} MAD/u</span>
                  </div>
                </div>
              ))}
            </div>

            {panier.length > 0 && (
              <button onClick={() => setPanier([])} style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 13, cursor: 'pointer' }}>
                Vider le panier
              </button>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: '#94A3B8' }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{total.toFixed(2)} MAD</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>💵 Cash reçu (MAD)</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {[Math.ceil(total/10)*10, Math.ceil(total/50)*50, Math.ceil(total/100)*100].filter((v,i,a)=>a.indexOf(v)===i).map(v => (
                  <button key={v} onClick={() => setCashRecu(v.toString())}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 13, cursor: 'pointer' }}>
                    {v}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={cashRecu}
                onChange={e => setCashRecu(e.target.value)}
                placeholder="Kteb montant..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
              {Number(cashRecu) >= total && (
                <div style={{ marginTop: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6ee7b7', fontSize: 13 }}>🪙 Monnaie rendue</span>
                  <span style={{ color: '#10b981', fontSize: 20, fontWeight: 700 }}>{(Number(cashRecu) - total).toFixed(2)} MAD</span>
                </div>
              )}
              {Number(cashRecu) > 0 && Number(cashRecu) < total && (
                <div style={{ marginTop: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 14px' }}>
                  <span style={{ color: '#fca5a5', fontSize: 12 }}>⚠️ Manque: {(total - Number(cashRecu)).toFixed(2)} MAD</span>
                </div>
              )}
            </div>

            <button onClick={encaisser} disabled={panier.length === 0 || processing}
              style={{ width: '100%', padding: 16, borderRadius: 14, background: panier.length === 0 ? '#334155' : '#2563EB', border: 'none', color: panier.length === 0 ? '#64748B' : 'white', fontSize: 16, fontWeight: 700, cursor: panier.length === 0 ? 'default' : 'pointer' }}
            >
              {processing ? 'Traitement...' : '💳 Encaisser ' + total.toFixed(2) + ' MAD'}
            </button>
          </div>
        </div>
      )}

      {panier.length > 0 && !showPanier && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'white', borderTop: '0.5px solid #E2E8F0', zIndex: 10 }}>
          <button onClick={() => setShowPanier(true)}
            style={{ width: '100%', padding: 16, borderRadius: 14, background: '#2563EB', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>🛒 {panier.length} article{panier.length > 1 ? 's' : ''}</span>
            <span>{total.toFixed(2)} MAD →</span>
          </button>
        </div>
      )}

    </div>
  )
}