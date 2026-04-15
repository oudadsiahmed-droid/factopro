'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ clients: 0, factures: 0, total_ttc: 0, en_attente: 0 })
  const [ventes, setVentes] = useState({ aujourd_hui: 0, semaine: 0, mois: 0, ca_jour: 0, ca_mois: 0, top_produit: '' })
  const [alertes, setAlertes] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)

    const now = new Date()
    const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const debutSemaine = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { count: clients },
      { count: factures },
      { data: facturesData },
      { data: ventesJour },
      { data: ventesMois },
      { data: ventesLignes }
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('factures').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('factures').select('montant_ttc, statut').eq('user_id', user.id),
      supabase.from('ventes').select('*').eq('user_id', user.id).gte('created_at', debutJour),
      supabase.from('ventes').select('*').eq('user_id', user.id).gte('created_at', debutMois),
      supabase.from('vente_lignes').select('nom_produit, quantite, vente_id, ventes!inner(user_id)').eq('ventes.user_id', user.id)
    ])

    const total_ttc = facturesData?.reduce((sum, f) => sum + (f.montant_ttc || 0), 0) || 0
    const en_attente = facturesData?.filter(f => f.statut === 'en_attente').length || 0
    setStats({ clients: clients || 0, factures: factures || 0, total_ttc, en_attente })

    const ca_jour = ventesJour?.reduce((a, v) => a + (v.total || 0), 0) || 0
    const ca_mois = ventesMois?.reduce((a, v) => a + (v.total || 0), 0) || 0

    // Top produit
    const produitCount = {}
    ventesLignes?.forEach(l => {
      produitCount[l.nom_produit] = (produitCount[l.nom_produit] || 0) + l.quantite
    })
    const top = Object.entries(produitCount).sort((a, b) => b[1] - a[1])[0]

    setVentes({
      aujourd_hui: ventesJour?.length || 0,
      mois: ventesMois?.length || 0,
      ca_jour: ca_jour.toFixed(2),
      ca_mois: ca_mois.toFixed(2),
      top_produit: top ? `${top[0]} (${top[1]}x)` : '—'
    })

    // Alertes stock
    const { data: allProduits } = await supabase
      .from('produits')
      .select('nom, quantite, alerte_stock, unite')
      .eq('user_id', user.id)

    const alertesList = (allProduits || []).filter(p => Number(p.quantite) <= Number(p.alerte_stock))
    setAlertes(alertesList)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm">Chargement...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">F</div>
          <span className="font-semibold text-gray-900">FactoPro</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-400 hidden sm:block">{user?.email}</span>
          <button onClick={handleLogout} className="text-xs text-red-500 hover:text-red-700 font-medium">
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Banner image */}
      <div className="relative h-32 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80"
          alt="warehouse"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.55)' }}
        />
        <div className="absolute inset-0 flex flex-col justify-center px-5">
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-slate-300 text-sm mt-1">Bienvenue sur FactoPro 👋</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="text-xl mb-1">👥</div>
            <div className="text-2xl font-bold text-blue-700">{loading ? '...' : stats.clients}</div>
            <div className="text-xs text-slate-500 mt-1">Clients</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="text-xl mb-1">🧾</div>
            <div className="text-2xl font-bold text-green-700">{loading ? '...' : stats.factures}</div>
            <div className="text-xs text-slate-500 mt-1">Factures</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="text-xl mb-1">⏳</div>
            <div className="text-2xl font-bold text-amber-700">{loading ? '...' : stats.en_attente}</div>
            <div className="text-xs text-slate-500 mt-1">En attente</div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <div className="text-xl mb-1">💰</div>
            <div className="text-lg font-bold text-purple-700">{loading ? '...' : stats.total_ttc.toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-1">CA (MAD)</div>
          </div>
        </div>

        {/* Ventes POS */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">📊 Ventes POS</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="text-lg font-bold text-slate-800">{ventes.aujourd_hui}</div>
              <div className="text-xs text-slate-400 mt-1">Ventes lyum</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="text-lg font-bold text-slate-800">{ventes.ca_jour} MAD</div>
              <div className="text-xs text-slate-400 mt-1">CA lyum (MAD)</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="text-lg font-bold text-slate-800">{ventes.mois}</div>
              <div className="text-xs text-slate-400 mt-1">Ventes shhar</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="text-lg font-bold text-slate-800">{ventes.ca_mois} MAD</div>
              <div className="text-xs text-slate-400 mt-1">CA shhar (MAD)</div>
            </div>
          </div>
          {ventes.top_produit !== '—' && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <div>
                <div className="text-sm font-semibold text-blue-700">{ventes.top_produit}</div>
                <div className="text-xs text-slate-400">Top produit</div>
              </div>
            </div>
          )}
        </div>

        {/* Alertes stock */}
        {alertes.length > 0 && (
          <div className="bg-white border-l-4 border-amber-400 rounded-xl border border-amber-100 p-4 mb-4">
            <h2 className="text-sm font-semibold text-amber-700 mb-3">⚠️ Alertes Stock ({alertes.length})</h2>
            <div className="space-y-2">
              {alertes.map(p => (
                <div key={p.nom} className="bg-amber-50 rounded-lg px-3 py-2 flex justify-between items-center border border-amber-100">
                  <span className="text-sm text-amber-900 font-medium">{p.nom}</span>
                  <span className="text-sm font-bold text-amber-600">{p.quantite} {p.unite}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">⚡ Actions rapides</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Nouveau client', icon: '👤', href: '/clients', color: 'border-t-blue-500' },
              { label: 'Nouvelle facture', icon: '🧾', href: '/factures', color: 'border-t-green-500' },
              { label: 'Point de Vente', icon: '🛒', href: '/pos', color: 'border-t-purple-500' },
              { label: 'Produits', icon: '📦', href: '/produits', color: 'border-t-amber-500' },
              { label: 'Paramètres', icon: '⚙️', href: '/settings', color: 'border-t-pink-500' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className={`bg-white rounded-xl p-3 flex flex-col items-center border border-slate-200 border-t-2 ${action.color} hover:shadow-sm transition`}
              >
                <span className="text-xl mb-1">{action.icon}</span>
                <span className="text-xs text-slate-600 font-medium text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}