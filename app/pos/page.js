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
  const searchRef = useRef(null)

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

  const produitsFiltres = produits.filter(p => {
    const matchCat = categorieActive === 'Tous' || p.categorie === categorieActive
    const matchSearch = p.nom?.toLowerCase().includes(search.toLowerCase()) ||
      p.code_barre?.includes(search) || p.marque?.toLowerCase().includes(search.toLowerCase())
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

  const total = panier.reduce((s, i) => s + (Number(i.prix) || 0) * i.qte, 0)

  const encaisser = async () => {
    if (panier.length === 0) return
    setProcessing(true)
    try {
      const { data: vente } = await supabase.from('ventes').insert({
        user_id: user.id,
        total,
        created_at: new Date().toISOString()
      }).select().single()

      await supabase.from('vente_lignes').insert(
        panier.map(i => ({
          vente_id: vente.id,
          produit_id: i.id,
          nom_produit: i.nom,
          quantite: i.qte,
          prix_unitaire: i.prix,
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

      setPanier([])
      alert('Vente enregistree! Total: ' + total.toFixed(2) + ' MAD')
      init()
    } catch (e) {
      alert('Erreur lors de la vente')
    }
    setProcessing(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100vh', fontFamily: 'sans-serif' }}>

      <div style={{ background: '#F8FAFC', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: '#1E293B', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>F</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Point de Vente</span>
          </div>
          <button onClick={() => router.push('/dashboard')} style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>Dashboard</button>
        </div>

        <div style={{ padding: '10px 12px 4px' }}>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Chercher ou scanner code-barre..."
            style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '0.5px solid #E2E8F0', fontSize: 13, outline: 'none', background: 'white' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, padding: '6px 12px', overflowX: 'auto' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategorieActive(cat)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                whiteSpace: 'nowrap', cursor: 'pointer', border: '0.5px solid',
                background: categorieActive === cat ? '#1E40AF' : 'white',
                color: categorieActive === cat ? 'white' : '#64748B',
                borderColor: categorieActive === cat ? '#1E40AF' : '#E2E8F0'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '8px 12px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>Chargement...</div>
          ) : produitsFiltres.map(p => (
            <div
              key={p.id}
              onClick={() => ajouterAuPanier(p)}
              style={{ background: 'white', borderRadius: 10, border: '0.5px solid #E2E8F0', padding: 10, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#93C5FD'; e.currentTarget.style.background = '#EFF6FF' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'white' }}
            >
              <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase' }}>{p.marque}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', margin: '2px 0', lineHeight: 1.3 }}>{p.nom}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8' }}>{Number(p.prix).toFixed(2)} MAD</div>
              <div style={{ fontSize: 10, color: Number(p.quantite) <= Number(p.alerte_stock) ? '#EF4444' : '#94A3B8', marginTop: 2 }}>
                Stock: {p.quantite} {Number(p.quantite) <= Number(p.alerte_stock) ? '⚠️' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#1E293B', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Panier ({panier.length})</h2>
        </div>

        <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
          {panier.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#475569', fontSize: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
              Panier khawi
            </div>
          ) : panier.map(item => (
            <div key={item.id} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 11, color: '#CBD5E1', flex: 1 }}>{item.nom}</div>
                <div style={{ fontSize: 12, color: '#60A5FA', fontWeight: 600 }}>{((Number(item.prix) || 0) * item.qte).toFixed(2)} MAD</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <button onClick={() => modifierQte(item.id, -1)} style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14 }}>-</button>
                <span style={{ fontSize: 13, color: 'white', fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.qte}</span>
                <button onClick={() => modifierQte(item.id, 1)} style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14 }}>+</button>
                <span style={{ fontSize: 11, color: '#64748B' }}>{Number(item.prix).toFixed(2)} MAD/u</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
          {panier.length > 0 && (
            <button onClick={() => setPanier([])} style={{ width: '100%', padding: '7px', marginBottom: 8, borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 12, cursor: 'pointer' }}>
              Vider le panier
            </button>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{total.toFixed(2)} MAD</span>
          </div>
          <button
            onClick={encaisser}
            disabled={panier.length === 0 || processing}
            style={{ width: '100%', padding: '12px', borderRadius: 10, background: panier.length === 0 ? '#334155' : '#2563EB', border: 'none', color: panier.length === 0 ? '#64748B' : 'white', fontSize: 14, fontWeight: 600, cursor: panier.length === 0 ? 'default' : 'pointer' }}
          >
            {processing ? 'Traitement...' : 'Encaisser'}
          </button>
        </div>
      </div>

    </div>
  )
}