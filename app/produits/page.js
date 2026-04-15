'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const CATEGORIES_DEFAULT = ['Produits Menagers','Huile alimentaire','Farine et Sucre','Lait et Fromage','Biscuits','Boissons','Conserves','The et Cafe']

export default function Produits() {
  const supabase = createClient()
  const [produits, setProduits] = useState([])
  const [categories, setCategories] = useState(CATEGORIES_DEFAULT)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [editProduit, setEditProduit] = useState(null)
  const [newCat, setNewCat] = useState('')
  const [filterCat, setFilterCat] = useState('Tous')
  const [filterMarque, setFilterMarque] = useState('Tous')
  const [form, setForm] = useState({
    nom:'',marque:'',prix:'',quantite:'',
    alerte_stock:'5',unite:'unité',
    code_barre:'',categorie:CATEGORIES_DEFAULT[0]
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data } = await supabase.from('produits').select('*').order('categorie')
    setProduits(data || [])
    const cats = [...new Set((data||[]).map(p=>p.categorie).filter(Boolean))]
    setCategories([...new Set([...CATEGORIES_DEFAULT,...cats])])
    setLoading(false)
  }

  async function addProduit() {
    if (!form.nom||!form.prix||!form.categorie){alert('Kml: nom, prix, w categorie');return}
    const {data:{user}} = await supabase.auth.getUser()
    const {error} = await supabase.from('produits').insert({
      ...form,
      prix:parseFloat(form.prix),
      quantite:parseInt(form.quantite)||0,
      alerte_stock:parseInt(form.alerte_stock)||5,
      user_id:user.id
    })
    if(error){alert('Khta: '+error.message);return}
    setForm({nom:'',marque:'',prix:'',quantite:'',alerte_stock:'5',unite:'unité',code_barre:'',categorie:categories[0]})
    setShowForm(false)
    fetchAll()
  }

  async function updateProduit() {
    if(!editProduit) return
    const {error} = await supabase.from('produits')
      .update({
        nom: editProduit.nom,
        prix:parseFloat(editProduit.prix),
        quantite:parseInt(editProduit.quantite),
        alerte_stock:parseInt(editProduit.alerte_stock)
      })
      .eq('id',editProduit.id)
    if(error){alert('Khta: '+error.message);return}
    setEditProduit(null)
    fetchAll()
  }

  async function deleteProduit(id) {
    if(!confirm('Wach hqq tbghi tmsah?')) return
    await supabase.from('produits').delete().eq('id',id)
    fetchAll()
  }

  function addCategorie() {
    if(!newCat.trim()) return
    setCategories([...categories,newCat.trim()])
    setForm({...form,categorie:newCat.trim()})
    setNewCat('')
    setShowCatForm(false)
  }

  const produitsFiltres = produits.filter(p => {
    const matchCat = filterCat==='Tous'||p.categorie===filterCat
    const matchMarque = filterMarque==='Tous'||p.marque===filterMarque
    return matchCat&&matchMarque
  })

  const marques = filterCat==='Tous'?[]:
    [...new Set(produits.filter(p=>p.categorie===filterCat&&p.marque).map(p=>p.marque))].sort()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestion Produits</h1>
          <div className="flex gap-2">
            <button onClick={()=>setShowCatForm(!showCatForm)}
              className="border border-gray-300 px-4 py-2 rounded-xl text-sm hover:bg-gray-50">
              + Categorie
            </button>
            <button onClick={()=>setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">
              + Zid Produit
            </button>
          </div>
        </div>

        {/* Form Categorie */}
        {showCatForm && (
          <div className="bg-white border rounded-xl p-4 mb-4">
            <p className="font-medium mb-3">Zid Categorie jdida</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Smiyat categorie..."
                value={newCat} onChange={e=>setNewCat(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"/>
              <button onClick={addCategorie}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Zid</button>
              <button onClick={()=>setShowCatForm(false)}
                className="border px-4 py-2 rounded-lg text-sm">Annuler</button>
            </div>
          </div>
        )}

        {/* Form Edit */}
        {editProduit && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="font-medium mb-3">Edit: <span className="text-blue-600">{editProduit.nom}</span></p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nom</label>
                <input type="text" value={editProduit.nom}
                  onChange={e=>setEditProduit({...editProduit,nom:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Prix (MAD)</label>
                <input type="number" value={editProduit.prix}
                  onChange={e=>setEditProduit({...editProduit,prix:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Stock</label>
                <input type="number" value={editProduit.quantite}
                  onChange={e=>setEditProduit({...editProduit,quantite:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"/>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={updateProduit}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-medium">
                Sauvegarder
              </button>
              <button onClick={()=>setEditProduit(null)}
                className="border px-6 py-2 rounded-xl text-sm">Annuler</button>
            </div>
          </div>
        )}

        {/* Form Zid Produit */}
        {showForm && (
          <div className="bg-white border rounded-xl p-4 mb-4">
            <p className="font-medium mb-3">Zid Produit jdid</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categorie</label>
                <select value={form.categorie} onChange={e=>setForm({...form,categorie:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {categories.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Marque</label>
                <input type="text" placeholder="ex: Ariel, Tide..."
                  value={form.marque} onChange={e=>setForm({...form,marque:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nom produit</label>
                <input type="text" placeholder="ex: Ariel 1kg"
                  value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Code-barre</label>
                <input type="text" placeholder="ex: 6111001001"
                  value={form.code_barre} onChange={e=>setForm({...form,code_barre:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Prix (MAD)</label>
                <input type="number" placeholder="ex: 36.00"
                  value={form.prix} onChange={e=>setForm({...form,prix:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Stock initial</label>
                <input type="number" placeholder="ex: 50"
                  value={form.quantite} onChange={e=>setForm({...form,quantite:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Alerte stock</label>
                <input type="number" placeholder="ex: 5"
                  value={form.alerte_stock} onChange={e=>setForm({...form,alerte_stock:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Unité</label>
                <select value={form.unite} onChange={e=>setForm({...form,unite:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option>unité</option>
                  <option>kg</option>
                  <option>L</option>
                  <option>g</option>
                  <option>ml</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addProduit}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-medium">
                Zid Produit
              </button>
              <button onClick={()=>setShowForm(false)}
                className="border px-6 py-2 rounded-xl text-sm">Annuler</button>
            </div>
          </div>
        )}

        {/* Categories filter */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button onClick={()=>{setFilterCat('Tous');setFilterMarque('Tous')}}
            className={`px-3 py-1 rounded-full text-sm border ${filterCat==='Tous'?'bg-blue-600 text-white border-blue-600':'bg-white'}`}>
            Tous
          </button>
          {categories.map(c=>(
            <button key={c} onClick={()=>{setFilterCat(c);setFilterMarque('Tous')}}
              className={`px-3 py-1 rounded-full text-sm border ${filterCat===c?'bg-blue-600 text-white border-blue-600':'bg-white'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Marques filter */}
        {filterCat!=='Tous'&&marques.length>0&&(
          <div className="flex gap-2 mb-3 flex-wrap bg-white p-2 rounded-lg border">
            <button onClick={()=>setFilterMarque('Tous')}
              className={`px-3 py-1 rounded-full text-sm border ${filterMarque==='Tous'?'bg-gray-800 text-white':'bg-gray-100'}`}>
              Kol chi
            </button>
            {marques.map(m=>(
              <button key={m} onClick={()=>setFilterMarque(m)}
                className={`px-3 py-1 rounded-full text-sm border ${filterMarque===m?'bg-gray-800 text-white':'bg-gray-100'}`}>
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          {loading?(
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ):produitsFiltres.length===0?(
            <div className="p-8 text-center text-gray-400">Ma kayn walo</div>
          ):(
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Produit','Marque','Categorie','Prix','Stock','Actions'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produitsFiltres.map(p=>(
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{p.nom}</p>
                      {p.code_barre&&<p className="text-xs text-gray-400">{p.code_barre}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.marque||'—'}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">{p.categorie}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm">{p.prix} MAD</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.quantite<=0?'bg-red-100 text-red-600':
                        p.quantite<=p.alerte_stock?'bg-amber-100 text-amber-700':
                        'bg-green-100 text-green-700'}`}>
                        {p.quantite} {p.unite}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={()=>setEditProduit(p)}
                          className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                          Edit
                        </button>
                        <button onClick={()=>deleteProduit(p.id)}
                          className="text-red-500 hover:text-red-700 text-sm">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-right">{produitsFiltres.length} produits</p>
      </div>
    </div>
  )
}