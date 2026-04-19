'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function NouvelleFacture() {
  const router = useRouter()
  const [clients, setClients] = useState([])
  const [produits, setProduits] = useState([])
  const [clientId, setClientId] = useState('')
  const [tva, setTva] = useState(20)
  const [remise, setRemise] = useState(0)
  const [avance, setAvance] = useState(0)
  const [lignes, setLignes] = useState([{ designation: '', quantite: 1, prix_unitaire: 0 }])
  const [saving, setSaving] = useState(false)
  const [type, setType] = useState('facture')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: c } = await supabase.from('clients').select('*').eq('user_id', user.id)
    const { data: p } = await supabase.from('produits').select('*').eq('user_id', user.id)
    setClients(c || [])
    setProduits(p || [])
  }

  const addLigne = () => setLignes([...lignes, { designation: '', quantite: 1, prix_unitaire: 0 }])
  const removeLigne = (i) => setLignes(lignes.filter((_, idx) => idx !== i))
  const updateLigne = (i, field, value) => {
    const newLignes = [...lignes]
    newLignes[i][field] = value
    // Ila tbddel designation — fetch prix automatic
    if (field === 'designation') {
      const produit = produits.find(p => p.nom === value)
      if (produit) {
        newLignes[i].prix_unitaire = produit.prix
      }
    }
    setLignes(newLignes)
  }

  const montantHT = lignes.reduce((s, l) => s + (Number(l.quantite) * Number(l.prix_unitaire)), 0)
  const montantRemise = montantHT * (Number(remise) / 100)
  const montantApresRemise = montantHT - montantRemise
  const montantTVA = montantApresRemise * (Number(tva) / 100)
  const montantTTC = montantApresRemise + montantTVA
  const resteAPayer = montantTTC - Number(avance)

  const saveFacture = async () => {
    if (!clientId) { alert('Choisis un client'); return }
    if (lignes.every(l => !l.designation)) { alert('Zid au moins une ligne'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { count } = await supabase.from('factures').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    const prefix = type === 'devis' ? 'DEV' : 'FAC'
    const numero = `${prefix}-${String((count || 0) + 1).padStart(4, '0')}`
    const { data: facture, error: factureError } = await supabase.from('factures').insert({
      user_id: user.id,
      client_id: clientId,
      numero,
      type,
      statut: 'en_attente',
      montant_ht: montantHT,
      montant_ttc: montantTTC,
      tva,
      remise,
      avance,
      date_emission: new Date().toISOString().split('T')[0]
    }).select().single()
    if (factureError) { alert('Erreur facture: ' + factureError.message); setSaving(false); return }
    if (!facture?.id) { alert('Facture ID mkaynach!'); setSaving(false); return }
    const { error: lignesError } = await supabase.from('facture_lignes').insert(
      lignes.filter(l => l.designation).map(l => ({
        facture_id: facture.id,
        designation: l.designation,
        description: l.designation,
        quantite: Number(l.quantite),
        prix_unitaire: Number(l.prix_unitaire),
        total: Number(l.quantite) * Number(l.prix_unitaire)
      }))
    )
    if (lignesError) { alert('Erreur lignes: ' + lignesError.message); setSaving(false); return }
    setSaving(false)
    router.push('/factures')
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">F</div>
          <span className="font-semibold text-gray-900">FactoPro</span>
        </div>
        <button onClick={() => router.push('/factures')} className="text-sm text-slate-500 hover:text-slate-700">← Retour</button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-800 mb-4">Nouvelle Facture</h1>

        {/* TYPE */}
        <div className="flex gap-3 mb-5">
          {[['facture','🧾 Facture'],['devis','📋 Devis']].map(([val,label]) => (
            <button key={val} onClick={() => setType(val)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${type === val ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* CLIENT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Client</h2>
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- Choisir un client --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        {/* LIGNES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Lignes</h2>
          <div className="space-y-3">
            {lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input value={l.designation} onChange={e => updateLigne(i, 'designation', e.target.value)}
                    placeholder="Désignation" list={`produits-${i}`}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <datalist id={`produits-${i}`}>
                    {produits.map(p => <option key={p.id} value={p.nom} />)}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <input type="number" value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)}
                    placeholder="Qté" min="1"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-3">
                  <input type="number" value={l.prix_unitaire} onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)}
                    placeholder="Prix HT"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-1 text-xs text-slate-500 text-right">
                  {(Number(l.quantite) * Number(l.prix_unitaire)).toFixed(0)}
                </div>
                <div className="col-span-1 text-right">
                  <button onClick={() => removeLigne(i)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addLigne} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">+ Ajouter ligne</button>
        </div>

        {/* TOTAUX */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Totaux</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">TVA (%)</label>
              <input type="number" value={tva} onChange={e => setTva(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Remise (%)</label>
              <input type="number" value={remise} onChange={e => setRemise(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Montant HT</span><span className="font-medium">{montantHT.toFixed(2)} MAD</span></div>
            {remise > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Remise ({remise}%)</span><span className="text-red-500">-{montantRemise.toFixed(2)} MAD</span></div>}
            <div className="flex justify-between text-sm"><span className="text-slate-500">TVA ({tva}%)</span><span className="font-medium">{montantTVA.toFixed(2)} MAD</span></div>
            <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2"><span>Total TTC</span><span className="text-blue-700">{montantTTC.toFixed(2)} MAD</span></div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-slate-500 block mb-1">Avance (MAD)</label>
            <input type="number" value={avance} onChange={e => setAvance(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {avance > 0 && (
            <div className="flex justify-between text-sm mt-2 text-emerald-700 font-semibold">
              <span>Reste à payer</span><span>{resteAPayer.toFixed(2)} MAD</span>
            </div>
          )}
        </div>

        <button onClick={saveFacture} disabled={saving}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-xl font-semibold text-sm transition">
          {saving ? 'Enregistrement...' : type === 'devis' ? '💾 Enregistrer le devis' : '💾 Enregistrer la facture'}
        </button>
      </div>
    </div>
  )
}