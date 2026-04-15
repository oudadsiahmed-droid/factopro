'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const CATEGORIES = ['Tous', 'Produits Menagers', 'Huile alimentaire', 'Farine et Sucre', 'Lait et Fromage', 'Biscuits', 'Boissons', 'Conserves', 'The et Cafe']

export default function POSPage() {
  const supabase = createClient()
  const [produits, setProduits] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [categorie, setCategorie] = useState('Tous')
  const [marqueActive, setMarqueActive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTicket, setShowTicket] = useState(false)
  const [lastVente, setLastVente] = useState(null)

  useEffect(() => { fetchProduits() }, [])

  async function fetchProduits() {
    const { data } = await supabase.from('produits').select('*').order('nom')
    setProduits(data || [])
    setLoading(false)
  }

  function addToCart(produit) {
    if (produit.quantite <= 0) { alert('Stock khlas!'); return }
    const existing = cart.find(x => x.id === produit.id)
    if (existing) {
      if (existing.qty >= produit.quantite) { alert('Stock mkafish!'); return }
      setCart(cart.map(x => x.id === produit.id ? {...x, qty: x.qty + 1} : x))
    } else {
      setCart([...cart, {...produit, qty: 1}])
    }
  }

  function removeFromCart(id) { setCart(cart.filter(x => x.id !== id)) }
  function updateQty(id, qty) {
    if (qty <= 0) { removeFromCart(id); return }
    setCart(cart.map(x => x.id === id ? {...x, qty} : x))
  }

  const total = cart.reduce((a, x) => a + (x.prix * x.qty), 0)

  async function checkout() {
    if (!cart.length) { alert('Panier khawi!'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Tsejel vente
      const { data: vente, error: venteError } = await supabase
        .from('ventes')
        .insert({ user_id: user.id, total })
        .select().single()
      if (venteError) throw venteError

      // 2. Tsejel lignes
      const lignes = cart.map(item => ({
        vente_id: vente.id,
        produit_id: item.id,
        nom_produit: item.nom,
        categorie: item.categorie || 'Autres',
        prix: item.prix,
        quantite: item.qty,
        total: item.prix * item.qty
      }))
      const { error: lignesError } = await supabase.from('vente_lignes').insert(lignes)
      if (lignesError) throw lignesError

      // 3. Update stock
      for (const item of cart) {
        await supabase.from('produits')
          .update({ quantite: item.quantite - item.qty })
          .eq('id', item.id)
      }

      setLastVente({ ...vente, lignes: cart.map(item => ({...item, categorie: item.categorie})), total })
      setShowTicket(true)
      setCart([])
      fetchProduits()
    } catch (err) {
      alert('Khta: ' + err.message)
    }
    setSaving(false)
  }

  function printTicket() {
  const date = new Date().toLocaleString('fr-MA')
  const w = window.open('', '_blank', 'width=400,height=600')
  w.document.write(`
    <html><head><title>Ticket</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Courier New',monospace;background:#fff;padding:20px;width:300px;}
      .header{text-align:center;margin-bottom:16px;}
      .logo{font-size:22px;font-weight:bold;letter-spacing:2px;}
      .subtitle{font-size:11px;color:#666;margin-top:2px;}
      .date{font-size:11px;color:#888;margin-top:6px;}
      .divider{border:none;border-top:1px dashed #999;margin:10px 0;}
      .divider-solid{border:none;border-top:2px solid #000;margin:10px 0;}
      .item{display:flex;justify-content:space-between;margin:5px 0;font-size:12px;}
      .item-name{flex:1;}
      .item-qty{color:#555;margin:0 8px;}
      .item-price{font-weight:bold;}
      .total-row{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;margin:6px 0;}
      .footer{text-align:center;margin-top:16px;}
      .footer-msg{font-size:13px;font-weight:bold;letter-spacing:1px;}
      .footer-sub{font-size:10px;color:#888;margin-top:4px;}
      .barcode{text-align:center;font-size:9px;color:#aaa;margin-top:8px;letter-spacing:3px;}
    </style></head>
    <body>
      <div class="header">
        <div class="logo">MON HANOUT</div>
        <div class="subtitle">Votre magasin de confiance</div>
        <div class="date">${date}</div>
      </div>
      <hr class="divider-solid"/>
      <div style="font-size:11px;color:#666;margin-bottom:6px;">ARTICLES</div>
      ${lastVente.lignes.map(item => `
        <div class="item">
          <span class="item-name">${item.nom}</span>
          <span class="item-qty">x${item.qty}</span>
          <span class="item-price">${(item.prix * item.qty).toFixed(2)} MAD</span>
        </div>
      `).join('')}
      <hr class="divider"/>
      <div class="total-row">
        <span>TOTAL</span>
        <span>${lastVente.total.toFixed(2)} MAD</span>
      </div>
      <hr class="divider-solid"/>
      <div class="footer">
        <div class="footer-msg">MERCI DE VOTRE VISITE</div>
        <div class="footer-sub">A bientot chez Mon Hanout!</div>
        <div class="barcode">|||| |||| |||| |||| ||||</div>
      </div>
    </body></html>
  `)
  w.document.close()
  w.print()
}

  const produitsFiltres = produits.filter(p => {
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase()) ||
      (p.code_barre && p.code_barre.includes(search))
    const matchCat = categorie === 'Tous' || p.categorie === categorie
    const matchMarque = !marqueActive || p.marque === marqueActive
    return matchSearch && matchCat && matchMarque
  })

  const marques = categorie === 'Tous' ? [] :
    [...new Set(produits.filter(p => p.categorie === categorie && p.marque).map(p => p.marque))].sort()

  if (showTicket && lastVente) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border p-6 w-full max-w-sm">
          <div id="ticket-content">
            <div className="center mb-4">
              <h2 className="font-bold text-lg">Mon Hanout</h2>
              <p className="text-xs text-gray-400">{new Date().toISOString().replace('T', ' ').substring(0, 19)}</p>
            </div>
            <div className="border-t border-dashed my-3"/>
            {lastVente.lignes.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>{item.nom} x{item.qty}</span>
                <span className="font-medium">{(item.prix * item.qty).toFixed(2)} MAD</span>
              </div>
            ))}
            <div className="border-t border-dashed my-3"/>
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL</span>
              <span>{lastVente.total.toFixed(2)} MAD</span>
            </div>
            <div className="border-t border-dashed my-3"/>
            <p className="text-center text-xs text-gray-400">Merci de votre visite!</p>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={printTicket}
              className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium">
              Imprimer
            </button>
            <button onClick={() => setShowTicket(false)}
              className="flex-1 border py-2 rounded-xl text-sm">
              Vente jdida
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4">Point de Vente</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <input type="text" placeholder="Chercher ou scanner code-barre..."
            value={search} onChange={e => { setSearch(e.target.value); setMarqueActive(null) }}
            className="w-full border rounded-lg px-4 py-2 mb-3 text-sm"/>

          <div className="flex gap-2 mb-3 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => { setCategorie(cat); setMarqueActive(null) }}
                className={`px-3 py-1 rounded-full text-sm border ${
                  categorie === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>
                {cat}
              </button>
            ))}
          </div>

          {categorie !== 'Tous' && marques.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap bg-white p-2 rounded-lg border">
              <button onClick={() => setMarqueActive(null)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  !marqueActive ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>
                Kol chi
              </button>
              {marques.map(m => (
                <button key={m} onClick={() => setMarqueActive(m)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    marqueActive === m ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>
                  {m}
                </button>
              ))}
            </div>
          )}

          {loading ? <p className="text-gray-400">Chargement...</p> : (
            <div className="grid grid-cols-3 gap-3">
              {produitsFiltres.map(p => (
                <div key={p.id} onClick={() => addToCart(p)}
                  className={`bg-white border rounded-xl p-3 cursor-pointer transition-all ${
                    p.quantite <= 0 ? 'opacity-40 cursor-not-allowed' :
                    p.quantite <= p.alerte_stock ? 'border-amber-300 hover:border-amber-400' :
                    'hover:border-blue-400'}`}>
                  {p.marque && <p className="text-xs text-gray-400 mb-1">{p.marque}</p>}
                  <p className="font-medium text-sm">{p.nom}</p>
                  <p className="text-blue-600 font-bold mt-1">{p.prix} MAD</p>
                  <p className={`text-xs mt-1 ${
                    p.quantite <= 0 ? 'text-red-500' :
                    p.quantite <= p.alerte_stock ? 'text-amber-500' : 'text-gray-400'}`}>
                    Stock: {p.quantite}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-4 h-fit">
          <h2 className="font-bold text-lg mb-3">Panier</h2>
          {cart.length === 0 ? (
            <p className="text-gray-400 text-sm">Panier khawi</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.nom}</p>
                    <p className="text-xs text-gray-400">{item.prix} MAD</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.id, item.qty - 1)}
                      className="w-6 h-6 border rounded text-sm">-</button>
                    <span className="w-6 text-center text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-6 h-6 border rounded text-sm">+</button>
                    <button onClick={() => removeFromCart(item.id)}
                      className="text-red-400 text-xs ml-1">✕</button>
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-blue-600">{total.toFixed(2)} MAD</span>
                </div>
                <button onClick={checkout} disabled={saving}
                  className="w-full mt-3 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Kattsejel...' : 'Confirmer la vente'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}