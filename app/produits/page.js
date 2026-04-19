'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function Produits() {
  const router = useRouter()
  const [produits, setProduits] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [categorieActive, setCategorieActive] = useState('Tous')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduit, setEditProduit] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [form, setForm] = useState({
    nom: '', marque: '', prix: '', prix_achat: '', quantite: '',
    alerte_stock: '5', unite: 'unité', code_barre: '', categorie: ''
  })
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => { loadProduits() }, [])

  const loadProduits = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data } = await supabase.from('produits').select('*').eq('user_id', user.id).order('categorie')
    setProduits(data || [])
    setCategories(['Tous', ...new Set((data || []).map(p => p.categorie).filter(Boolean))])
    setLoading(false)
  }

  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setScanning(true)
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 100)
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39'] })
        const interval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                clearInterval(interval)
                stopScan()
                await handleBarcode(barcodes[0].rawValue)
              }
            } catch (e) {}
          }
        }, 300)
        streamRef.current._interval = interval
      } else { alert('Scan non supporté. Utilisez Chrome.'); stopScan() }
    } catch (e) { alert('Accès caméra refusé'); setScanning(false) }
  }

  const stopScan = () => {
    if (streamRef.current) {
      if (streamRef.current._interval) clearInterval(streamRef.current._interval)
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const handleBarcode = async (code) => {
    setScanLoading(true)
    setScanStatus('🔍 Cherche dans votre stock...')
    setForm(f => ({ ...f, code_barre: code }))
    const { data: existing } = await supabase.from('produits').select('*').eq('code_barre', code).single()
    if (existing) {
      setForm({ nom: existing.nom, marque: existing.marque || '', prix: existing.prix, prix_achat: existing.prix_achat || '', quantite: existing.quantite, alerte_stock: existing.alerte_stock || 5, unite: existing.unite || 'unité', code_barre: code, categorie: existing.categorie || '' })
      setScanLoading(false)
      setScanStatus('✅ Produit trouvé dans votre stock!')
      return
    }
    let nom = '', marque = '', categorie = ''
    setScanStatus('🍕 Cherche dans Food Facts...')
    try {
      const r1 = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const d1 = await r1.json()
      if (d1.status === 1 && d1.product?.product_name) {
        const p = d1.product
        nom = p.product_name_fr || p.product_name || ''
        marque = p.brands?.split(',')[0]?.trim() || ''
        categorie = p.categories?.split(',')[0]?.trim() || ''
      }
    } catch (e) {}
    if (!nom) {
      setScanStatus('📦 Cherche dans UPC Database...')
      try {
        const r4 = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`)
        const d4 = await r4.json()
        if (d4.code === 'OK' && d4.items?.[0]) {
          nom = d4.items[0].title || ''
          marque = d4.items[0].brand || ''
          categorie = d4.items[0].category || ''
        }
      } catch (e) {}
    }
    if (nom) {
      setForm(f => ({ ...f, nom, marque, categorie, code_barre: code }))
      setScanStatus('✅ Produit trouvé!')
    } else {
      setScanStatus('⚠️ Produit mkaynach — kteb lma3lomat yedwi')
    }
    setScanLoading(false)
  }

  const saveProduit = async () => {
    if (!form.nom || !form.prix || !form.categorie) { alert('Kml: nom, prix, w categorie'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      nom: form.nom, marque: form.marque,
      prix: parseFloat(form.prix),
      prix_achat: parseFloat(form.prix_achat) || 0,
      quantite: parseInt(form.quantite) || 0,
      alerte_stock: parseInt(form.alerte_stock) || 5,
      unite: form.unite, code_barre: form.code_barre, categorie: form.categorie
    }
    if (editProduit) {
      await supabase.from('produits').update(payload).eq('id', editProduit.id)
    } else {
      await supabase.from('produits').insert({ ...payload, user_id: user.id })
    }
    setShowForm(false); setEditProduit(null); setScanStatus('')
    setForm({ nom: '', marque: '', prix: '', prix_achat: '', quantite: '', alerte_stock: '5', unite: 'unité', code_barre: '', categorie: '' })
    loadProduits()
  }

  const setEditFn = (p) => {
    setEditProduit(p)
    setForm({ nom: p.nom, marque: p.marque || '', prix: p.prix, prix_achat: p.prix_achat || '', quantite: p.quantite, alerte_stock: p.alerte_stock || 5, unite: p.unite || 'unité', code_barre: p.code_barre || '', categorie: p.categorie || '' })
    setShowForm(true)
  }

  const deleteProduit = async (id) => {
    if (!confirm('Supprimer ce produit?')) return
    await supabase.from('produits').delete().eq('id', id)
    loadProduits()
  }

  const produitsFiltres = produits.filter(p => {
    const matchCat = categorieActive === 'Tous' || p.categorie === categorieActive
    const matchSearch = p.nom?.toLowerCase().includes(search.toLowerCase()) || p.marque?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const stockTotal = produits.reduce((s, p) => s + (p.quantite || 0), 0)
  const alertes = produits.filter(p => Number(p.quantite) <= Number(p.alerte_stock)).length

  return (
    <div className="min-h-screen bg-amber-50">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">F</div>
          <span className="font-semibold text-gray-900">FactoPro</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 font-medium">← Dashboard</button>
      </nav>

      <div className="relative h-32 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80" alt="warehouse" className="w-full h-full object-cover" style={{ filter: 'brightness(0.35)' }} />
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <div>
            <h1 className="text-xl font-bold text-white">Gestion Produits</h1>
            <p className="text-slate-300 text-xs mt-0.5">{produits.length} produits au total</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditProduit(null); setScanStatus(''); setForm({ nom:'',marque:'',prix:'',prix_achat:'',quantite:'',alerte_stock:'5',unite:'unité',code_barre:'',categorie:'' }) }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
            + Nouveau produit
          </button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-xl font-bold text-blue-700">{produits.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Produits</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-xl font-bold text-emerald-700">{stockTotal}</div>
            <div className="text-xs text-slate-400 mt-0.5">Stock total</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{alertes}</div>
            <div className="text-xs text-slate-400 mt-0.5">Alertes</div>
          </div>
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher un produit..."
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3" />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategorieActive(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition whitespace-nowrap flex-shrink-0 ${categorieActive === cat ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : produitsFiltres.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">Aucun produit trouvé</div>
        ) : (
          <div className="space-y-3">
            {produitsFiltres.map(p => {
              const empty = p.quantite <= 0
              const low = !empty && Number(p.quantite) <= Number(p.alerte_stock)
              const marge = p.prix_achat > 0 ? Number(p.prix) - Number(p.prix_achat) : null
              const margePct = p.prix_achat > 0 ? (marge / Number(p.prix_achat) * 100).toFixed(0) : null
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{p.nom}</div>
                      {p.marque && <div className="text-xs text-slate-400">{p.marque}</div>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-slate-800">{Number(p.prix).toFixed(2)} MAD</div>
                      {marge !== null && (
                        <div className="text-xs text-emerald-600 font-semibold">+{marge.toFixed(2)} MAD ({margePct}%)</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100 font-medium">{p.categorie}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${empty ? 'bg-red-100 text-red-700' : low ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {p.quantite} {p.unite}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditFn(p)} className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg">✏️</button>
                      <button onClick={() => deleteProduit(p.id)} className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-1.5 rounded-lg">🗑️</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              {editProduit ? '✏️ Modifier produit' : '➕ Nouveau produit'}
            </h2>
            {!editProduit && (
              <div className="mb-4">
                <button onClick={scanning ? stopScan : startScan}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${scanning ? 'bg-red-500 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {scanning ? '⏹ Arrêter scan' : '📷 Scanner le code-barre'}
                </button>
                {scanLoading && <div className="text-center mt-2 text-xs text-blue-600">{scanStatus}</div>}
                {!scanLoading && scanStatus && <div className="text-center mt-2 text-xs font-medium text-slate-600">{scanStatus}</div>}
              </div>
            )}
            {scanning && (
              <div className="mb-4 rounded-xl overflow-hidden relative bg-black" style={{ height: 180 }}>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-16 border-2 border-blue-400 rounded-lg" />
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1 font-medium">Nom *</label>
                  <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1 font-medium">Marque</label>
                  <input value={form.marque} onChange={e => setForm({...form, marque: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1 font-medium">💰 Prix achat (MAD)</label>
                  <input type="number" value={form.prix_achat} onChange={e => setForm({...form, prix_achat: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ex: 3.50" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1 font-medium">🏷️ Prix vente (MAD) *</label>
                  <input type="number" value={form.prix} onChange={e => setForm({...form, prix: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {form.prix && form.prix_achat && Number(form.prix_achat) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-700">
                  📈 Marge: {(Number(form.prix) - Number(form.prix_achat)).toFixed(2)} MAD — {((Number(form.prix) - Number(form.prix_achat)) / Number(form.prix_achat) * 100).toFixed(0)}%
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1 font-medium">Catégorie *</label>
                  <input value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1 font-medium">Quantité</label>
                  <input type="number" value={form.quantite} onChange={e => setForm({...form, quantite: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1 font-medium">Alerte stock</label>
                  <input type="number" value={form.alerte_stock} onChange={e => setForm({...form, alerte_stock: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1 font-medium">Unité</label>
                  <select value={form.unite} onChange={e => setForm({...form, unite: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="unité">unité</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="boîte">boîte</option>
                    <option value="sachet">sachet</option>
                    <option value="carton">carton</option>
                    <option value="pièce">pièce</option>
                    <option value="paire">paire</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1 font-medium">Code barre</label>
                <input value={form.code_barre} onChange={e => setForm({...form, code_barre: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="6111..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowForm(false); setEditProduit(null); stopScan(); setScanStatus('') }} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">Annuler</button>
              <button onClick={saveProduit} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl text-sm font-semibold">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}