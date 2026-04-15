'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ clients: 0, factures: 0, total_ttc: 0, en_attente: 0 })
  const [ventes, setVentes] = useState({ aujourd_hui: 0, semaine: 0, mois: 0, ca_jour: 0, ca_mois: 0, top_produit: '' })
const [alertes, setAlertes] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
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
 
    const { data: allProduits } = await supabase
      .from('produits')
      .select('nom, quantite, alerte_stock, unite')
      .eq('user_id', user.id)
    const alertesList = (allProduits || []).filter(p => Number(p.quantite) <= Number(p.alerte_stock))
    console.log('Produits:', allProduits?.length, 'Alertes:', alertesList.length)
    setAlertes(alertesList)
    
    // Notifications browser
    if (alertesList.length > 0) {
      if (Notification.permission === 'granted') {
        new Notification('⚠️ Alertes Stock!', {
          body: alertesList.map(p => `${p.nom}: ${p.quantite} ${p.unite} ghir bqyin`).join('\n'),
          icon: '/favicon.ico'
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('⚠️ Alertes Stock!', {
              body: alertesList.map(p => `${p.nom}: ${p.quantite} ${p.unite} ghir bqyin`).join('\n'),
              icon: '/favicon.ico'
            })
          }
        })
      }
    }
    
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">FactoPro</span>
        </div>
      <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500 hidden sm:block truncate max-w-[160px]">{user?.email}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 font-medium">
              Déconnexion
            </button>
          </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Tableau de bord</h1>
        <p className="text-gray-500 mb-8">Bienvenue sur FactoPro 👋</p>

        {/* Stats Factures */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Clients', value: stats.clients, icon: '👥', color: 'bg-blue-50 text-blue-600' },
            { label: 'Factures', value: stats.factures, icon: '🧾', color: 'bg-green-50 text-green-600' },
            { label: 'En attente', value: stats.en_attente, icon: '⏳', color: 'bg-yellow-50 text-yellow-600' },
            { label: "Chiffre d'affaires", value: stats.total_ttc.toFixed(2)+' MAD', icon: '💰', color: 'bg-purple-50 text-purple-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${stat.color} text-xl mb-3`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stat.value}</p>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Stats Ventes POS */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Ventes POS</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Ventes lyum", value: ventes.aujourd_hui },
              { label: "CA lyum (MAD)", value: ventes.ca_jour },
              { label: "Ventes shhar", value: ventes.mois },
              { label: "CA shhar (MAD)", value: ventes.ca_mois },
              { label: "Top produit", value: ventes.top_produit },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-gray-900">{loading ? '...' : s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes Stock */}
        {alertes.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">⚠️</span>
              <h2 className="font-semibold text-red-600">Alertes Stock ({alertes.length})</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {alertes.map(p => (
                <div key={p.nom} className={`rounded-xl p-3 text-center border ${
                  p.quantite <= 0 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-amber-50 border-amber-200'}`}>
                  <p className={`text-xl font-bold ${p.quantite <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.quantite <= 0 ? 'KHLAS' : p.quantite+' '+p.unite}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{p.nom}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Nouveau client', icon: '👤', href: '/clients' },
              { label: 'Nouvelle facture', icon: '🧾', href: '/factures' },
              { label: 'Point de Vente', icon: '🛒', href: '/pos' },
              { label: 'Produits', icon: '📦', href: '/produits' },
              { label: 'Paramètres', icon: '⚙️', href: '/settings' },
            ].map(action => (
              <button key={action.label} onClick={() => router.push(action.href)}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition">
                <span className="text-2xl">{action.icon}</span>
                <span className="font-medium text-gray-700 text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}