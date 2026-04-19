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
    const facture = factures.find(f => f.id === id)
    
    // Ila tbddel l payee — naqs stock
    if (statut === 'payee' && facture?.statut !== 'payee') {
      const { data: lignes } = await supabase.from('facture_lignes').select('*').eq('facture_id', id)
      if (lignes?.length > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: produits } = await supabase.from('produits').select('*').eq('user_id', user.id)
        for (const l of lignes) {
          const produit = produits?.find(p => p.nom === (l.designation || l.description))
          if (produit) {
            await supabase.from('produits')
              .update({ quantite: Math.max(0, produit.quantite - Number(l.quantite)) })
              .eq('id', produit.id)
          }
        }
      }
    }
    
    await supabase.from('factures').update({ statut }).eq('id', id)
    loadFactures()
  }

  const deleteFacture = async (id) => {
    if (!confirm('Supprimer cette facture?')) return
    await supabase.from('factures').delete().eq('id', id)
    loadFactures()
  }

  const statutConfig = {
    'payee':      { label: '✅ Payée',      cls: 'bg-green-100 text-green-700 border-green-200' },
    'en_attente': { label: '⏳ En attente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    'annulee':    { label: '❌ Annulée',    cls: 'bg-red-100 text-red-700 border-red-200' },
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">F</div>
          <span className="font-semibold text-gray-900">FactoPro</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 font-medium">← Dashboard</button>
      </nav>

      {/* HERO */}
      <div className="relative h-32 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80" alt="warehouse" className="w-full h-full object-cover" style={{ filter: 'brightness(0.35)' }} />
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <div>
            <h1 className="text-xl font-bold text-white">Factures</h1>
            <p className="text-slate-300 text-xs mt-0.5">{factures.length} facture(s) au total</p>
          </div>
          <button onClick={() => router.push('/factures/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
            + Nouvelle facture
          </button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto">

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-xl font-bold text-emerald-700">{factures.filter(f => f.statut === 'payee').length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Payées</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{factures.filter(f => f.statut === 'en_attente').length}</div>
            <div className="text-xs text-slate-400 mt-0.5">En attente</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-lg font-bold text-blue-700">{factures.reduce((s, f) => s + (f.montant_ttc || 0), 0).toFixed(0)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Total MAD</div>
          </div>
        </div>

        {/* LISTE */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : factures.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-sm">Aucune facture pour l'instant</p>
          </div>
        ) : (
          <div className="space-y-3">
            {factures.map(f => (
              <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                {/* TOP ROW */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-blue-700 text-sm">{f.numero}</div>
                      {f.type === 'devis' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Devis</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      👤 {f.clients?.nom || '—'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      📅 {new Date(f.created_at).toLocaleDateString('fr-MA')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800 text-base">{f.montant_ttc?.toFixed(2)}</div>
                    <div className="text-xs text-slate-400">MAD TTC</div>
                  </div>
                </div>

                {/* STATUT + ACTIONS */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <select value={f.statut} onChange={e => updateStatut(f.id, e.target.value)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer ${statutConfig[f.statut]?.cls || 'bg-slate-100 text-slate-600'}`}>
                    <option value="payee">✅ Payée</option>
                    <option value="en_attente">⏳ En attente</option>
                    <option value="annulee">❌ Annulée</option>
                  </select>
                  <div className="flex gap-3">
                    {f.type === 'devis' && (
                      <button onClick={async () => {
                        if (!confirm('Convertir ce devis en facture?')) return
                        await supabase.from('factures').update({ type: 'facture', numero: f.numero.replace('DEV','FAC') }).eq('id', f.id)
                        loadFactures()
                        alert('✅ Devis converti en facture!')
                      }}
                        className="text-xs text-purple-600 font-semibold bg-purple-50 px-3 py-1.5 rounded-lg">
                        🔄 → Facture
                      </button>
                    )}
                    <button onClick={() => window.open(`/factures/${f.id}/print`, '_blank')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg">
                      🖨️ Imprimer
                    </button>
                    {(
                      <button onClick={async () => {
                        const settings = JSON.parse(localStorage.getItem(`factopro_settings_${(await (createClient()).auth.getUser()).data.user?.id}`) || '{}')
                        const res = await fetch('/api/send-facture', {
                          method: 'POST',
                          headers: {'Content-Type':'application/json'},
                          body: JSON.stringify({
                            to: f.clients?.email || prompt('Kteb email dyal client:'),
                            numero: f.numero,
                            clientNom: f.clients?.nom || 'Client',
                            montantTTC: f.montant_ttc?.toFixed(2),
                            pdfUrl: `${window.location.origin}/factures/${f.id}/print`,
                            settings
                          })
                        })
                        const data = await res.json()
                        alert(data.ok ? '✅ Email envoyé!' : '❌ Erreur: ' + data.error)
                      }}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg">
                        📧 Email
                      </button>
                    )}
                    <button onClick={() => deleteFacture(f.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold bg-red-50 px-3 py-1.5 rounded-lg">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}