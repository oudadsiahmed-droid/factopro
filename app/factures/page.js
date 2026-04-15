'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function FacturesPage() {
  const router = useRouter()
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadFactures() }, [])

  const loadFactures = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data } = await supabase
      .from('factures')
      .select('*, clients(nom)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setFactures(data || [])
    setLoading(false)
  }

  const updateStatut = async (id, statut) => {
    await supabase.from('factures').update({ statut }).eq('id', id)
    loadFactures()
  }

  const deleteFacture = async (id) => {
    if (!confirm('Supprimer cette facture?')) return
    await supabase.from('factures').delete().eq('id', id)
    loadFactures()
  }

  const statutColors = {
    'payee': 'bg-green-100 text-green-700 border-green-200',
    'en_attente': 'bg-amber-100 text-amber-700 border-amber-200',
    'annulee': 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <div className="min-h-screen bg-amber-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">F</div>
          <span className="font-semibold text-gray-900">FactoPro</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          ← Dashboard
        </button>
      </nav>

      {/* Banner */}
      <div className="relative h-36 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80"
          alt="warehouse"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.4)' }}
        />
        <div className="absolute inset-0 flex flex-col justify-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧾</span>
            <div>
              <h1 className="text-2xl font-bold text-white">Factures</h1>
              <p className="text-slate-300 text-sm">{factures.length} facture(s) au total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-5">

        {/* Header actions */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-3">
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 text-center">
              <div className="text-xl font-bold text-green-600">{factures.filter(f => f.statut === 'payee').length}</div>
              <div className="text-xs text-slate-400">Payées</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 text-center">
              <div className="text-xl font-bold text-amber-600">{factures.filter(f => f.statut === 'en_attente').length}</div>
              <div className="text-xs text-slate-400">En attente</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 text-center">
              <div className="text-xl font-bold text-blue-600">{factures.reduce((s, f) => s + (f.montant_ttc || 0), 0).toFixed(2)}</div>
              <div className="text-xs text-slate-400">Total MAD</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/factures/new')}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2"
          >
            + Nouvelle facture
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : factures.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">🧾</div>
              <p className="text-sm">Aucune facture pour l'instant</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Numéro</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant TTC</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {factures.map((f, i) => (
                  <tr key={f.id} className={`border-b border-slate-100 hover:bg-amber-50 transition ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-5 py-4 text-sm font-semibold text-blue-700">{f.numero}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{f.clients?.nom || '—'}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-800">{f.montant_ttc?.toFixed(2)} MAD</td>
                    <td className="px-5 py-4">
                      <select
                        value={f.statut}
                        onChange={e => updateStatut(f.id, e.target.value)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer ${statutColors[f.statut] || 'bg-slate-100 text-slate-600'}`}
                      >
                        <option value="payee">Payée</option>
                        <option value="en_attente">En attente</option>
                        <option value="annulee">Annulée</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => router.push(`/factures/${f.id}/print`)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          🖨️ Imprimer
                        </button>
                        <button
                          onClick={() => deleteFacture(f.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
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

      </div>
    </div>
  )
}