'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function Inventaire() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [inventaires, setInventaires] = useState([])
  const [produits, setProduits] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [currentInv, setCurrentInv] = useState(null)
  const [lignes, setLignes] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    const [{ data: invs }, { data: prods }] = await Promise.all([
      supabase.from('inventaires').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('produits').select('*').eq('user_id', user.id).order('nom')
    ])
    setInventaires(invs || [])
    setProduits(prods || [])
    setLoading(false)
  }

  const startNewInventaire = async () => {
    const numero = `INV-${Date.now().toString().slice(-6)}`
    const { data: inv } = await supabase.from('inventaires').insert({
      user_id: user.id,
      numero,
      statut: 'en_cours'
    }).select().single()

    // Zid kol produits f inventaire b stock theorique
    const lignesData = produits.map(p => ({
      inventaire_id: inv.id,
      produit_id: p.id,
      nom_produit: p.nom,
      stock_theorique: p.quantite,
      stock_reel: p.quantite, // default = theorique
      ecart: 0
    }))
    await supabase.from('inventaire_lignes').insert(lignesData)

    setCurrentInv(inv)
    setLignes(lignesData.map((l, i) => ({ ...l, id: i, produit: produits[i] })))
    setCreating(true)
    loadData()
  }

  const loadInventaire = async (inv) => {
    const { data: l } = await supabase.from('inventaire_lignes').select('*').eq('inventaire_id', inv.id).order('nom_produit')
    setCurrentInv(inv)
    setLignes(l || [])
    setCreating(true)
  }

  const updateLigne = (idx, val) => {
    const newLignes = [...lignes]
    const reel = Number(val) || 0
    const theorique = Number(newLignes[idx].stock_theorique)
    newLignes[idx] = { ...newLignes[idx], stock_reel: reel, ecart: reel - theorique }
    setLignes(newLignes)
  }

  const saveInventaire = async () => {
    setSaving(true)
    for (const l of lignes) {
      if (l.id && typeof l.id === 'string') {
        await supabase.from('inventaire_lignes').update({
          stock_reel: l.stock_reel,
          ecart: l.ecart
        }).eq('id', l.id)
      }
    }
    setSaving(false)
    alert('✅ Inventaire sauvegardé!')
  }

  const validerInventaire = async () => {
    if (!confirm('Valider inventaire — stock f database yتbddel b stock réel?')) return
    setSaving(true)
    for (const l of lignes) {
      if (l.produit_id) {
        await supabase.from('produits').update({ quantite: l.stock_reel }).eq('id', l.produit_id)
      }
      if (l.id && typeof l.id === 'string') {
        await supabase.from('inventaire_lignes').update({
          stock_reel: l.stock_reel,
          ecart: l.ecart
        }).eq('id', l.id)
      }
    }
    await supabase.from('inventaires').update({ statut: 'valide' }).eq('id', currentInv.id)
    setSaving(false)
    setCreating(false)
    loadData()
    alert('✅ Inventaire validé — stock mis à jour!')
  }

  const totalEcart = lignes.reduce((s, l) => s + Math.abs(l.ecart || 0), 0)
  const nbDiff = lignes.filter(l => l.ecart !== 0).length

  return (
    <div className="min-h-screen bg-amber-50">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">F</div>
          <span className="font-semibold text-gray-900">FactoPro</span>
        </div>
        <button onClick={() => { setCreating(false); router.push('/dashboard') }} className="text-sm text-blue-600 font-medium">← Dashboard</button>
      </nav>

      {!creating ? (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-slate-800">📦 Inventaire</h1>
              <p className="text-xs text-slate-400">{inventaires.length} inventaire(s)</p>
            </div>
            <button onClick={startNewInventaire}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold">
              + Nouvel inventaire
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
          ) : inventaires.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-sm">Mazal mkayn inventaires</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inventaires.map(inv => (
                <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-blue-700 text-sm">{inv.numero}</div>
                    <div className="text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString('fr-MA')}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${inv.statut === 'valide' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {inv.statut === 'valide' ? '✅ Validé' : '⏳ En cours'}
                    </span>
                    <button onClick={() => loadInventaire(inv)}
                      className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-semibold">
                      {inv.statut === 'valide' ? '👁️ Voir' : '✏️ Continuer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-800">📦 {currentInv?.numero}</h1>
              <p className="text-xs text-slate-400">{produits.length} produits</p>
            </div>
            <button onClick={() => setCreating(false)} className="text-sm text-slate-500">← Retour</button>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <div className="text-xl font-bold text-blue-700">{lignes.length}</div>
              <div className="text-xs text-slate-400">Produits</div>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-3 text-center">
              <div className="text-xl font-bold text-amber-600">{nbDiff}</div>
              <div className="text-xs text-slate-400">Différences</div>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-3 text-center">
              <div className="text-xl font-bold text-red-600">{totalEcart}</div>
              <div className="text-xs text-slate-400">Écart total</div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
            <div className="grid grid-cols-12 gap-0 bg-slate-800 text-white text-xs font-semibold px-4 py-3">
              <div className="col-span-5">Produit</div>
              <div className="col-span-2 text-center">Stock théorique</div>
              <div className="col-span-3 text-center">Stock réel</div>
              <div className="col-span-2 text-center">Écart</div>
            </div>
            <div className="divide-y divide-slate-100">
              {lignes.map((l, idx) => (
                <div key={idx} className={`grid grid-cols-12 gap-0 px-4 py-2 items-center ${l.ecart < 0 ? 'bg-red-50' : l.ecart > 0 ? 'bg-green-50' : ''}`}>
                  <div className="col-span-5 text-sm font-medium text-slate-800">{l.nom_produit}</div>
                  <div className="col-span-2 text-center text-sm text-slate-500">{l.stock_theorique}</div>
                  <div className="col-span-3 text-center">
                    {currentInv?.statut === 'valide' ? (
                      <span className="text-sm font-semibold">{l.stock_reel}</span>
                    ) : (
                      <input
                        type="number"
                        value={l.stock_reel}
                        onChange={e => updateLigne(idx, e.target.value)}
                        className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                  <div className={`col-span-2 text-center text-sm font-bold ${l.ecart < 0 ? 'text-red-600' : l.ecart > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                    {l.ecart > 0 ? '+' : ''}{l.ecart}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-3">
            <button onClick={() => {
              const w = window.open('', '_blank')
              w.document.write(`
                <html><head><title>Inventaire ${currentInv?.numero}</title>
                <style>body{font-family:Arial;padding:20px;} table{width:100%;border-collapse:collapse;} th{background:#2f2f2f;color:white;padding:8px;} td{padding:7px 8px;border-bottom:1px solid #ddd;} .red{color:red;} .green{color:green;} h2{text-align:center;}</style>
                </head><body>
                <h2>📦 Inventaire — ${currentInv?.numero}</h2>
                <p style="text-align:center">Date: ${new Date().toLocaleDateString('fr-MA')} | Produits: ${lignes.length} | Différences: ${nbDiff}</p>
                <table>
                <tr><th>Produit</th><th>Stock Théorique</th><th>Stock Réel</th><th>Écart</th></tr>
                ${lignes.map(l => `<tr>
                  <td>${l.nom_produit}</td>
                  <td style="text-align:center">${l.stock_theorique}</td>
                  <td style="text-align:center">${l.stock_reel}</td>
                  <td style="text-align:center;color:${l.ecart<0?'red':l.ecart>0?'green':'gray'}">${l.ecart>0?'+':''}${l.ecart}</td>
                </tr>`).join('')}
                </table>
                <script>window.print()</script>
                </body></html>
              `)
              w.document.close()
            }}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 py-3 rounded-xl text-sm font-semibold">
              🖨️ Imprimer tout
            </button>
            <button onClick={() => {
              const diff = lignes.filter(l => l.ecart !== 0)
              if(diff.length === 0) { alert('Mkayn hta farq — kol stock mzyan! ✅'); return }
              const w = window.open('', '_blank')
              w.document.write(`
                <html><head><title>Différences — ${currentInv?.numero}</title>
                <style>body{font-family:Arial;padding:20px;} table{width:100%;border-collapse:collapse;} th{background:#2f2f2f;color:white;padding:8px;text-align:center;} td{padding:7px 8px;border-bottom:1px solid #ddd;text-align:center;} td:nth-child(1){text-align:left;} h2{text-align:center;} .red{color:red;font-weight:bold;} .green{color:green;font-weight:bold;}</style>
                </head><body>
                <h2>⚠️ Différences Stock — ${currentInv?.numero}</h2>
                <p style="text-align:center;color:#555">Date: ${new Date().toLocaleDateString('fr-MA')} | ${diff.length} produit(s) avec écart</p>
                <table>
                <tr><th>Produit</th><th>Stock Théorique</th><th>Stock Réel</th><th>Écart</th></tr>
                ${diff.map(l => `<tr>
                  <td>${l.nom_produit}</td>
                  <td>${l.stock_theorique}</td>
                  <td>${l.stock_reel}</td>
                  <td class="${l.ecart<0?'red':'green'}">${l.ecart>0?'+':''}${l.ecart}</td>
                </tr>`).join('')}
                </table>
                <script>window.print()</script>
                </body></html>
              `)
              w.document.close()
            }}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-sm font-semibold">
              ⚠️ Imprimer différences
            </button>
          </div>
          {currentInv?.statut !== 'valide' && (
            <div className="flex gap-3">
              <button onClick={saveInventaire} disabled={saving}
                className="flex-1 bg-slate-700 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-semibold">
                {saving ? '⏳...' : '💾 Sauvegarder'}
              </button>
              <button onClick={validerInventaire} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-semibold">
                {saving ? '⏳...' : '✅ Valider — Mettre à jour stock'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}