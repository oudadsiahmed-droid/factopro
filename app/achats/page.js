'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function Achats() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('commandes')
  const [commandes, setCommandes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showFournisseurForm, setShowFournisseurForm] = useState(false)
  const [lignes, setLignes] = useState([{ nom_produit: '', quantite: 1, prix_unitaire: 0 }])
  const [form, setForm] = useState({ fournisseur_id: '', notes: '', statut: 'en_attente' })
  const [formF, setFormF] = useState({ nom: '', telephone: '', email: '', ville: '' })
  const [expandedId, setExpandedId] = useState(null)
  const [achatLignes, setAchatLignes] = useState({})

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    const [{ data: cmds }, { data: fours }] = await Promise.all([
      supabase.from('commandes_achat').select('*, fournisseurs(nom)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('fournisseurs').select('*').eq('user_id', user.id).order('nom')
    ])
    setCommandes(cmds || [])
    setFournisseurs(fours || [])
    setLoading(false)
  }

  const genNumero = () => `ACH-${String(Date.now()).slice(-4)}`

  const saveCommande = async () => {
    if (!form.fournisseur_id) { alert('Khtar fournisseur!'); return }
    const lignesValides = lignes.filter(l => l.nom_produit && l.quantite > 0)
    if (lignesValides.length === 0) { alert('Zid hta ligne wahda!'); return }
    const total = lignesValides.reduce((s, l) => s + (Number(l.prix_unitaire) * Number(l.quantite)), 0)
    const { data: cmd } = await supabase.from('commandes_achat').insert({
      user_id: user.id,
      fournisseur_id: form.fournisseur_id,
      numero: genNumero(),
      montant_total: total,
      statut: form.statut,
      notes: form.notes
    }).select().single()
    await supabase.from('achat_lignes').insert(
      lignesValides.map(l => ({
        commande_id: cmd.id,
        nom_produit: l.nom_produit,
        quantite: Number(l.quantite),
        prix_unitaire: Number(l.prix_unitaire),
        total: Number(l.prix_unitaire) * Number(l.quantite)
      }))
    )
    setShowForm(false)
    setForm({ fournisseur_id: '', notes: '', statut: 'en_attente' })
    setLignes([{ nom_produit: '', quantite: 1, prix_unitaire: 0 }])
    loadData()
  }

  const saveFournisseur = async () => {
    if (!formF.nom) { alert('Kteb nom fournisseur!'); return }
    await supabase.from('fournisseurs').insert({ ...formF, user_id: user.id })
    setShowFournisseurForm(false)
    setFormF({ nom: '', telephone: '', email: '', ville: '' })
    loadData()
  }

  const updateStatut = async (id, statut) => {
    await supabase.from('commandes_achat').update({ statut }).eq('id', id)
    loadData()
  }

  const deleteCommande = async (id) => {
    if (!confirm('Supprimer cette commande?')) return
    await supabase.from('commandes_achat').delete().eq('id', id)
    loadData()
  }

  const loadLignes = async (id) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!achatLignes[id]) {
      const { data } = await supabase.from('achat_lignes').select('*').eq('commande_id', id)
      setAchatLignes(prev => ({ ...prev, [id]: data || [] }))
    }
  }

  const statutConfig = {
    'en_attente': { label: '⏳ En attente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    'recu': { label: '✅ Reçu', cls: 'bg-green-100 text-green-700 border-green-200' },
    'annule': { label: '❌ Annulé', cls: 'bg-red-100 text-red-700 border-red-200' },
  }

  const totalCommandes = commandes.reduce((s, c) => s + (c.montant_total || 0), 0)

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
            <h1 className="text-xl font-bold text-white">🛒 Achats</h1>
            <p className="text-slate-300 text-xs mt-0.5">{commandes.length} commande(s)</p>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm">
            + Nouvelle commande
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* TABS */}
        <div className="flex gap-2 mb-4">
          {[['commandes','🧾 Commandes'],['fournisseurs','🏭 Fournisseurs']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${tab === key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'commandes' && (
          <>
            {/* STATS */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <div className="text-xl font-bold text-blue-700">{commandes.length}</div>
                <div className="text-xs text-slate-400 mt-0.5">Total</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <div className="text-xl font-bold text-amber-600">{commandes.filter(c => c.statut === 'en_attente').length}</div>
                <div className="text-xs text-slate-400 mt-0.5">En attente</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <div className="text-lg font-bold text-purple-700">{totalCommandes.toFixed(0)}</div>
                <div className="text-xs text-slate-400 mt-0.5">MAD total</div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
            ) : commandes.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="text-4xl mb-3">🛒</div>
                <p className="text-sm">Mazal mkayn commandes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {commandes.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="font-bold text-blue-700 text-sm">{c.numero}</div>
                        <div className="text-xs text-slate-500 mt-0.5">🏭 {c.fournisseurs?.nom || '—'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">📅 {new Date(c.created_at).toLocaleDateString('fr-MA')}</div>
                        {c.notes && <div className="text-xs text-slate-400 mt-0.5 italic">{c.notes}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">{c.montant_total?.toFixed(2)}</div>
                        <div className="text-xs text-slate-400">MAD</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                      <select value={c.statut} onChange={e => updateStatut(c.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer ${statutConfig[c.statut]?.cls}`}>
                        <option value="en_attente">⏳ En attente</option>
                        <option value="recu">✅ Reçu</option>
                        <option value="annule">❌ Annulé</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => loadLignes(c.id)}
                          className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg">
                          {expandedId === c.id ? '▲ Masquer' : '▼ Détails'}
                        </button>
                        <button onClick={() => deleteCommande(c.id)}
                          className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-1.5 rounded-lg">🗑️</button>
                      </div>
                    </div>
                    {expandedId === c.id && achatLignes[c.id] && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        {achatLignes[c.id].map((l, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-50">
                            <span>{l.nom_produit} <span className="text-slate-400">x{l.quantite}</span></span>
                            <span className="font-semibold">{l.total?.toFixed(2)} MAD</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'fournisseurs' && (
          <>
            <button onClick={() => setShowFournisseurForm(true)}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-xl py-3 text-sm font-semibold mb-4">
              + Nouveau fournisseur
            </button>
            {showFournisseurForm && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
                <div className="space-y-2">
                  {[{k:'nom',p:'Nom *'},{k:'telephone',p:'Téléphone'},{k:'email',p:'Email'},{k:'ville',p:'Ville'}].map(f => (
                    <input key={f.k} placeholder={f.p} value={formF[f.k]} onChange={e => setFormF({...formF,[f.k]:e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={saveFournisseur} className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold">✅ Enregistrer</button>
                  <button onClick={() => setShowFournisseurForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">Annuler</button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {fournisseurs.map(f => (
                <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-700 font-bold text-sm">{f.nom?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 text-sm">{f.nom}</div>
                    {f.telephone && <div className="text-xs text-slate-500">📞 {f.telephone}</div>}
                    {f.email && <div className="text-xs text-slate-500">✉️ {f.email}</div>}
                    {f.ville && <div className="text-xs text-slate-400">📍 {f.ville}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL NOUVELLE COMMANDE */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-slate-800 mb-4">🛒 Nouvelle commande d'achat</h2>
            <div className="space-y-3 mb-4">
              <select value={form.fournisseur_id} onChange={e => setForm({...form, fournisseur_id: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Khtar fournisseur *</option>
                {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
              <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="en_attente">⏳ En attente</option>
                <option value="recu">✅ Reçu</option>
              </select>
              <input placeholder="Notes (optionnel)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Produits</p>
              {lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 mb-2">
                  <input placeholder="Produit" value={l.nom_produit} onChange={e => { const n=[...lignes]; n[i].nom_produit=e.target.value; setLignes(n) }}
                    className="col-span-5 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                  <input type="number" placeholder="Qté" value={l.quantite} onChange={e => { const n=[...lignes]; n[i].quantite=e.target.value; setLignes(n) }}
                    className="col-span-3 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                  <input type="number" placeholder="PU" value={l.prix_unitaire} onChange={e => { const n=[...lignes]; n[i].prix_unitaire=e.target.value; setLignes(n) }}
                    className="col-span-3 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                  <button onClick={() => setLignes(lignes.filter((_,j)=>j!==i))} className="col-span-1 text-red-400 text-lg">×</button>
                </div>
              ))}
              <button onClick={() => setLignes([...lignes, { nom_produit: '', quantite: 1, prix_unitaire: 0 }])}
                className="text-xs text-blue-600 font-semibold mt-1">+ Ajouter ligne</button>
            </div>
            <div className="text-right text-sm font-bold text-slate-800 mb-4">
              Total: {lignes.reduce((s,l) => s + (Number(l.prix_unitaire)*Number(l.quantite)), 0).toFixed(2)} MAD
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm">Annuler</button>
              <button onClick={saveCommande} className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}