'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const supabase = createClient()

const LANGS = {
  fr: {
    titre: 'Tableau de bord', bienvenue: 'Bienvenue sur FactoPro 👋',
    clients: 'Clients', factures: 'Factures', enAttente: 'En attente', ca: 'CA (MAD)',
    benefice: '💰 Bénéfice Net POS', beneficeLyum: 'Bénéfice lyum', beneficeMois: 'Bénéfice ce mois',
    ventesPOS: '📊 Ventes POS', ventesLyum: 'Ventes lyum', caLyum: 'CA lyum (MAD)',
    ventesShhar: 'Ventes shhar', caShhar: 'CA shhar (MAD)', topProduit: 'Top produit',
    stock: '📦 Stock', produits: 'Produits', unites: 'Unités total', categories: 'Catégories',
    alertes: '🚨 Alertes Stock', actionsRapides: '⚡ Actions rapides',
    deconnexion: 'Déconnexion', rapport: '📊 Télécharger Rapport Excel',
    periode: 'Khtar période', lyum: '📅 Lyum', chhar: '📆 Had Chhar',
    telecharger: '⬇️ Télécharger', chargement: '⏳ Chargement...',
    caChart: '📈 CA Factures — 6 derniers mois (MAD)',
    ventesChart: '🛒 Ventes POS — 7 derniers jours (MAD)',
    nouvelClient: 'Nouveau client', nouvelleFacture: 'Nouvelle facture',
    pointVente: 'Point de Vente', documents: 'Documents',
    achats: 'Achats', inventaire: 'Inventaire', parametres: 'Paramètres',
  },
  dar: {
    titre: 'لوح التحكم', bienvenue: 'مرحبا بيك ف FactoPro 👋',
    clients: 'العملاء', factures: 'الفواتير', enAttente: 'في الانتظار', ca: 'رقم الأعمال',
    benefice: '💰 الربح الصافي', beneficeLyum: 'ربح اليوم', beneficeMois: 'ربح الشهر',
    ventesPOS: '📊 مبيعات الكاسا', ventesLyum: 'مبيعات اليوم', caLyum: 'رقم أعمال اليوم',
    ventesShhar: 'مبيعات الشهر', caShhar: 'رقم أعمال الشهر', topProduit: 'أحسن منتج',
    stock: '📦 المخزون', produits: 'المنتجات', unites: 'مجموع الوحدات', categories: 'الفئات',
    alertes: '🚨 تنبيهات المخزون', actionsRapides: '⚡ إجراءات سريعة',
    deconnexion: 'خروج', rapport: '📊 تحميل تقرير Excel',
    periode: 'اختار الفترة', lyum: '📅 اليوم', chhar: '📆 هاد الشهر',
    telecharger: '⬇️ تحميل', chargement: '⏳ تحميل...',
    caChart: '📈 رقم الأعمال — 6 أشهر الأخيرة',
    ventesChart: '🛒 مبيعات الكاسا — 7 أيام الأخيرة',
    nouvelClient: 'عميل جديد', nouvelleFacture: 'فاتورة جديدة',
    pointVente: 'نقطة البيع', documents: 'الوثائق',
    achats: 'المشتريات', inventaire: 'الجرد', parametres: 'الإعدادات',
  },
  ar: {
    titre: 'لوحة التحكم', bienvenue: 'أهلاً بك في FactoPro 👋',
    clients: 'العملاء', factures: 'الفواتير', enAttente: 'قيد الانتظار', ca: 'رقم الأعمال',
    benefice: '💰 صافي الربح', beneficeLyum: 'ربح اليوم', beneficeMois: 'ربح الشهر',
    ventesPOS: '📊 مبيعات نقطة البيع', ventesLyum: 'مبيعات اليوم', caLyum: 'إيرادات اليوم',
    ventesShhar: 'مبيعات الشهر', caShhar: 'إيرادات الشهر', topProduit: 'أفضل منتج',
    stock: '📦 المخزن', produits: 'المنتجات', unites: 'مجموع الوحدات', categories: 'الفئات',
    alertes: '🚨 تنبيهات المخزن', actionsRapides: '⚡ إجراءات سريعة',
    deconnexion: 'تسجيل الخروج', rapport: '📊 تنزيل تقرير Excel',
    periode: 'اختر الفترة', lyum: '📅 اليوم', chhar: '📆 هذا الشهر',
    telecharger: '⬇️ تنزيل', chargement: '⏳ جارٍ التحميل...',
    caChart: '📈 رقم الأعمال — آخر 6 أشهر',
    ventesChart: '🛒 مبيعات نقطة البيع — آخر 7 أيام',
    nouvelClient: 'عميل جديد', nouvelleFacture: 'فاتورة جديدة',
    pointVente: 'نقطة البيع', documents: 'المستندات',
    achats: 'المشتريات', inventaire: 'الجرد', parametres: 'الإعدادات',
  }
}

function exportToExcel(data, periode) {
  const headers = ['Date','N° Facture','Client','Montant HT (MAD)','Remise %','TVA %','Total TTC (MAD)','Avance (MAD)','Reste à Payer (MAD)','Statut']
  const rows = data.map(f => [
    new Date(f.created_at).toLocaleDateString('fr-MA'),
    f.numero || '',
    f.clients?.nom || '',
    (f.montant_ht || 0).toFixed(2),
    (f.remise || 0),
    (f.tva || 0),
    (f.montant_ttc || 0).toFixed(2),
    (f.avance || 0).toFixed(2),
    ((f.montant_ttc || 0) - (f.avance || 0)).toFixed(2),
    f.statut === 'payee' ? 'Payée' : f.statut === 'en_attente' ? 'En attente' : 'Annulée'
  ])
  const totalHT = rows.reduce((s,r) => s + Number(r[3]), 0).toFixed(2)
  const totalTTC = rows.reduce((s,r) => s + Number(r[6]), 0).toFixed(2)
  const totalAvance = rows.reduce((s,r) => s + Number(r[7]), 0).toFixed(2)
  const totalReste = rows.reduce((s,r) => s + Number(r[8]), 0).toFixed(2)
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>body{font-family:Arial;font-size:11pt;}table{border-collapse:collapse;width:100%;}th{background-color:#1D4ED8;color:white;font-weight:bold;padding:8px 10px;border:1px solid #1e40af;text-align:center;}td{padding:6px 10px;border:1px solid #cbd5e1;text-align:left;}tr:nth-child(even) td{background-color:#f8fafc;}.total-row td{background-color:#fef9c3;font-weight:bold;border:2px solid #ca8a04;}.title-row td{background-color:#eff6ff;font-weight:bold;font-size:14pt;color:#1D4ED8;text-align:center;}</style></head><body><table><tr class="title-row"><td colspan="10">FactoPro — Rapport ${periode} — ${new Date().toLocaleDateString('fr-MA')}</td></tr><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}<tr class="total-row"><td colspan="3"><b>TOTAL (${rows.length} factures)</b></td><td>${totalHT} MAD</td><td></td><td></td><td>${totalTTC} MAD</td><td>${totalAvance} MAD</td><td>${totalReste} MAD</td><td></td></tr></table></body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `FactoPro_${periode}_${new Date().toLocaleDateString('fr-MA').replace(/\//g,'-')}.xls`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ clients: 0, factures: 0, total_ttc: 0, en_attente: 0 })
  const [ventes, setVentes] = useState({ aujourd_hui: 0, mois: 0, ca_jour: 0, ca_mois: 0, top_produit: '' })
  const [alertes, setAlertes] = useState([])
  const [produits, setProduits] = useState([])
  const [benefice, setBenefice] = useState({ jour: 0, mois: 0 })
  const [loading, setLoading] = useState(true)
  const [showExport, setShowExport] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [chartMois, setChartMois] = useState([])
  const [chartJours, setChartJours] = useState([])
  const [langue, setLangue] = useState('fr')
  const router = useRouter()

  const t = LANGS[langue]
  const isRTL = langue === 'ar' || langue === 'dar'

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    const now = new Date()
    const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const debut6Mois = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()
    const debut7Jours = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString()

    const [
      { count: clients }, { count: factures }, { data: facturesData },
      { data: ventesJour }, { data: ventesMois }, { data: ventesLignes }, { data: allProduits },
      { data: factures6Mois }, { data: ventes7Jours }
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('factures').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('factures').select('montant_ttc, statut').eq('user_id', user.id),
      supabase.from('ventes').select('*').eq('user_id', user.id).gte('created_at', debutJour),
      supabase.from('ventes').select('*').eq('user_id', user.id).gte('created_at', debutMois),
      supabase.from('vente_lignes').select('nom_produit, quantite').eq('ventes.user_id', user.id),
      supabase.from('produits').select('nom, quantite, alerte_stock, unite, categorie, prix, prix_achat').eq('user_id', user.id),
      supabase.from('factures').select('montant_ttc, created_at').eq('user_id', user.id).gte('created_at', debut6Mois),
      supabase.from('ventes').select('total, created_at').eq('user_id', user.id).gte('created_at', debut7Jours)
    ])

    const { data: lignesMois } = await supabase.from('vente_lignes').select('prix_unitaire, prix_achat, quantite').in('vente_id', (ventesMois||[]).map(v=>v.id).length > 0 ? (ventesMois||[]).map(v=>v.id) : ['00000000-0000-0000-0000-000000000000'])
    const { data: lignesJour } = await supabase.from('vente_lignes').select('prix_unitaire, prix_achat, quantite').in('vente_id', (ventesJour||[]).map(v=>v.id).length > 0 ? (ventesJour||[]).map(v=>v.id) : ['00000000-0000-0000-0000-000000000000'])
    const benMois = (lignesMois || []).reduce((s, l) => l.prix_achat > 0 ? s + ((l.prix_unitaire - l.prix_achat) * l.quantite) : s, 0)
    const benJour = (lignesJour || []).reduce((s, l) => l.prix_achat > 0 ? s + ((l.prix_unitaire - l.prix_achat) * l.quantite) : s, 0)
    setBenefice({ jour: benJour, mois: benMois })

    const total_ttc = facturesData?.reduce((s, f) => s + (f.montant_ttc || 0), 0) || 0
    const en_attente = facturesData?.filter(f => f.statut === 'en_attente').length || 0
    setStats({ clients: clients || 0, factures: factures || 0, total_ttc, en_attente })

    const ca_jour = ventesJour?.reduce((a, v) => a + (v.total || 0), 0) || 0
    const ca_mois = ventesMois?.reduce((a, v) => a + (v.total || 0), 0) || 0
    const produitCount = {}
    ventesLignes?.forEach(l => { produitCount[l.nom_produit] = (produitCount[l.nom_produit] || 0) + l.quantite })
    const top = Object.entries(produitCount).sort((a, b) => b[1] - a[1])[0]
    setVentes({ aujourd_hui: ventesJour?.length || 0, mois: ventesMois?.length || 0, ca_jour: ca_jour.toFixed(2), ca_mois: ca_mois.toFixed(2), top_produit: top ? `${top[0]} (${top[1]}x)` : '—' })
    setAlertes((allProduits || []).filter(p => Number(p.quantite) <= Number(p.alerte_stock)))
    setProduits(allProduits || [])

    const moisMap = {}
    const moisNoms = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      moisMap[key] = { mois: moisNoms[d.getMonth()], ca: 0 }
    }
    factures6Mois?.forEach(f => {
      const d = new Date(f.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (moisMap[key]) moisMap[key].ca += f.montant_ttc || 0
    })
    setChartMois(Object.values(moisMap))

    const joursMap = {}
    const joursNoms = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const key = d.toDateString()
      joursMap[key] = { jour: joursNoms[d.getDay()], ventes: 0 }
    }
    ventes7Jours?.forEach(v => {
      const key = new Date(v.created_at).toDateString()
      if (joursMap[key]) joursMap[key].ventes += v.total || 0
    })
    setChartJours(Object.values(joursMap))
    setLoading(false)
  }

  const handleExport = async (type) => {
    setExportLoading(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const now = new Date()
    let query = supabase.from('factures').select('*, clients(nom)').eq('user_id', u.id)
    if (type === 'jour') {
      query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()).lte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString())
    } else if (type === 'mois') {
      query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()).lte('created_at', new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString())
    } else if (type === 'custom') {
      if (!dateDebut || !dateFin) { alert('Khtar date début w date fin!'); setExportLoading(false); return }
      query = query.gte('created_at', new Date(dateDebut).toISOString()).lte('created_at', new Date(dateFin + 'T23:59:59').toISOString())
    }
    const { data } = await query.order('created_at', { ascending: false })
    const label = type === 'jour' ? 'Lyum' : type === 'mois' ? 'HadChhar' : `${dateDebut}_${dateFin}`
    exportToExcel(data || [], label)
    setExportLoading(false)
    setShowExport(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#eff6ff'}}>
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm">Chargement...</p>
      </div>
    </div>
  )

  const stockTotal = produits.reduce((s, p) => s + (p.quantite || 0), 0)
  const categoriesCount = [...new Set(produits.map(p => p.categorie).filter(Boolean))].length

  return (
    <div className="min-h-screen" style={{background:'#eff6ff', direction: isRTL ? 'rtl' : 'ltr'}}>
      <nav className="px-4 py-3 flex items-center justify-between sticky top-0 z-10" style={{background:'#1d4ed8', borderBottom:'1px solid #1e40af'}}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{background:'white', color:'#1d4ed8'}}>F</div>
          <span className="font-semibold text-white">FactoPro</span>
        </div>
        <div className="flex items-center gap-3">
          {/* LANGUE SWITCHER */}
          <div className="flex gap-1 rounded-xl p-1" style={{background:'rgba(255,255,255,0.15)'}}>
            {[['fr','FR'],['dar','دار'],['ar','عر']].map(([l,flag]) => (
              <button key={l} onClick={() => setLangue(l)}
                className="text-xs px-2 py-1 rounded-lg font-semibold transition"
                style={{
                  background: langue===l ? 'white' : 'transparent',
                  color: langue===l ? '#1d4ed8' : '#bfdbfe',
                  minWidth: 32
                }}>
                {flag}
              </button>
            ))}
          </div>
          <span className="text-xs hidden sm:block" style={{color:'#bfdbfe'}}>{user?.email}</span>
          <button onClick={handleLogout} className="text-xs font-medium" style={{color:'#fca5a5'}}>{t.deconnexion}</button>
        </div>
      </nav>

      <div className="relative h-44 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80" alt="warehouse" className="w-full h-full object-cover" style={{ filter: 'brightness(0.35)' }} />
        <div className="absolute inset-0 flex flex-col justify-center px-6">
          <h1 className="text-2xl font-bold text-white">{t.titre}</h1>
          <p className="text-sm mt-1" style={{color:'#bfdbfe'}}>{t.bienvenue}</p>
        </div>
      </div>

      <div className="px-4 py-5 max-w-5xl mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {[
            {label:t.produits,href:'/produits'},{label:t.factures,href:'/factures'},
            {label:t.pointVente,href:'/pos'},{label:t.clients,href:'/clients'},
            {label:t.documents,href:'/documents'},{label:t.achats,href:'/achats'},
            {label:t.inventaire,href:'/inventaire'},{label:'Assistant IA',href:'/assistant'},{label:'Bilan',href:'/bilan'},
            {label:t.parametres,href:'/settings'},{label:'Profil',href:'/profile'}
          ].map(cat => (
            <button key={cat.label} onClick={() => router.push(cat.href)}
              className="px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition flex-shrink-0"
              onMouseEnter={e => { e.currentTarget.style.background='#1d4ed8'; e.currentTarget.style.color='white'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.color='#1d4ed8'; e.currentTarget.style.transform='translateY(0)' }}
              style={{background:'white', border:'0.5px solid #bfdbfe', color:'#1d4ed8', transition:'all 0.2s ease'}}>
              {cat.label}
            </button>
          ))}
        </div>

        <div className="mb-5">
          <button onClick={() => setShowExport(!showExport)} className="w-full text-white rounded-2xl px-5 py-3 font-semibold text-sm flex items-center justify-center gap-2 transition" style={{background:'#1d4ed8'}}>
            {t.rapport}
          </button>
          {showExport && (
            <div className="rounded-2xl p-4 mt-2" style={{background:'white', border:'0.5px solid #bfdbfe'}}>
              <p className="text-xs font-semibold uppercase mb-3" style={{color:'#1d4ed8'}}>{t.periode}</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => handleExport('jour')} disabled={exportLoading} className="rounded-xl py-3 text-sm font-semibold" style={{background:'#dbeafe', border:'0.5px solid #bfdbfe', color:'#1d4ed8'}}>{t.lyum}</button>
                <button onClick={() => handleExport('mois')} disabled={exportLoading} className="rounded-xl py-3 text-sm font-semibold" style={{background:'#dbeafe', border:'0.5px solid #bfdbfe', color:'#1d4ed8'}}>{t.chhar}</button>
              </div>
              <div className="flex gap-2 mb-2">
                <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'0.5px solid #bfdbfe'}} />
                <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'0.5px solid #bfdbfe'}} />
              </div>
              <button onClick={() => handleExport('custom')} disabled={exportLoading} className="w-full text-white rounded-xl py-2.5 text-sm font-semibold" style={{background:'#1d4ed8'}}>
                {exportLoading ? t.chargement : t.telecharger}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: t.clients, value: stats.clients, color: '#1d4ed8' },
            { label: t.factures, value: stats.factures, color: '#1d4ed8' },
            { label: t.enAttente, value: stats.en_attente, color: '#f59e0b' },
            { label: t.ca, value: stats.total_ttc.toFixed(2), color: '#1d4ed8' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4"
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor='#1d4ed8' }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='#bfdbfe' }}
              style={{background:'white', border:'0.5px solid #bfdbfe', transition:'all 0.2s ease', cursor:'pointer'}}>
              <div className="text-2xl font-bold" style={{color: s.color}}>{s.value}</div>
              <div className="text-xs mt-1" style={{color:'#64748b'}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{background:'white', border:'0.5px solid #bfdbfe'}}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:'#1e3a8a'}}>{t.benefice}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{background:'#dbeafe', border:'0.5px solid #bfdbfe'}}>
              <div className="text-lg font-bold" style={{color:'#10b981'}}>{benefice.jour.toFixed(2)} MAD</div>
              <div className="text-xs mt-1" style={{color:'#1e3a8a'}}>{t.beneficeLyum}</div>
            </div>
            <div className="rounded-xl p-3" style={{background:'#dbeafe', border:'0.5px solid #bfdbfe'}}>
              <div className="text-lg font-bold" style={{color:'#10b981'}}>{benefice.mois.toFixed(2)} MAD</div>
              <div className="text-xs mt-1" style={{color:'#1d4ed8'}}>{t.beneficeMois}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{background:'white', border:'0.5px solid #bfdbfe'}}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:'#1d4ed8'}}>{t.caChart}</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartMois} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [v.toFixed(2) + ' MAD', 'CA']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="ca" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{background:'white', border:'0.5px solid #bfdbfe'}}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:'#1d4ed8'}}>{t.ventesChart}</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartJours} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [v.toFixed(2) + ' MAD', 'Ventes']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="ventes" stroke="#1d4ed8" strokeWidth={2.5} dot={{ fill: '#1d4ed8', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{background:'white', border:'0.5px solid #bfdbfe'}}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:'#1d4ed8'}}>{t.ventesPOS}</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[{label:t.ventesLyum,value:ventes.aujourd_hui},{label:t.caLyum,value:ventes.ca_jour+' MAD'},{label:t.ventesShhar,value:ventes.mois},{label:t.caShhar,value:ventes.ca_mois+' MAD'}].map(v => (
              <div key={v.label} className="rounded-xl p-3"
                onMouseEnter={e => { e.currentTarget.style.background='#1d4ed8'; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background='#dbeafe'; e.currentTarget.style.transform='translateY(0)' }}
                style={{background:'#dbeafe', border:'0.5px solid #bfdbfe', transition:'all 0.2s ease'}}>
                <div className="text-lg font-bold" style={{color:'#1e293b'}}>{v.value}</div>
                <div className="text-xs mt-1" style={{color:'#1d4ed8'}}>{v.label}</div>
              </div>
            ))}
          </div>
          {ventes.top_produit !== '—' && (
            <div className="rounded-xl p-3 flex items-center gap-3" style={{background:'#dbeafe', border:'0.5px solid #bfdbfe'}}>
              <span className="text-2xl">🏆</span>
              <div>
                <div className="text-sm font-semibold" style={{color:'#1d4ed8'}}>{ventes.top_produit}</div>
                <div className="text-xs" style={{color:'#64748b'}}>{t.topProduit}</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{background:'white', border:'0.5px solid #bfdbfe'}}>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:'#1d4ed8'}}>{t.stock}</h2>
          <div className="grid grid-cols-3 gap-3">
            {[{v:produits.length,l:t.produits,c:'#1d4ed8'},{v:stockTotal,l:t.unites,c:'#10b981'},{v:categoriesCount,l:t.categories,c:'#f59e0b'}].map(s => (
              <div key={s.l} className="rounded-xl p-3 text-center" style={{background:'#dbeafe', border:'0.5px solid #bfdbfe'}}>
                <div className="text-xl font-bold" style={{color:s.c}}>{s.v}</div>
                <div className="text-xs mt-1" style={{color:'#1d4ed8'}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {alertes.length > 0 && (
          <div className="rounded-2xl p-4 mb-4" style={{background:'white', border:'0.5px solid #fca5a5', borderLeft:'4px solid #ef4444'}}>
            <h2 className="text-sm font-semibold mb-3" style={{color:'#dc2626'}}>{t.alertes} ({alertes.length})</h2>
            <div className="space-y-2">
              {alertes.map(p => (
                <div key={p.nom} className="rounded-xl px-3 py-2 flex justify-between items-center" style={{background:'#fee2e2', border:'0.5px solid #fca5a5'}}>
                  <span className="text-sm font-bold" style={{color:'#dc2626'}}>🚨 {p.nom}</span>
                  <span className="text-sm font-bold" style={{color:'#dc2626'}}>{p.quantite} {p.unite}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{color:'#1d4ed8'}}>{t.actionsRapides}</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t.nouvelClient, href: '/clients', emoji: '👥' },
              { label: t.nouvelleFacture, href: '/factures', emoji: '🧾' },
              { label: t.pointVente, href: '/pos', emoji: '💳' },
              { label: t.produits, href: '/produits', emoji: '🏪' },
              { label: t.documents, href: '/documents', emoji: '📋' },
              { label: t.achats, href: '/achats', emoji: '🚚' },
              { label: t.inventaire, href: '/inventaire', emoji: '📊' },
              { label: t.parametres, href: '/settings', emoji: '⚙️' },
            ].map(action => (
              <button key={action.label} onClick={() => router.push(action.href)}
                className="rounded-xl p-3 flex flex-col items-center"
                onMouseEnter={e => { e.currentTarget.style.background='#1d4ed8'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.querySelector('span:last-child').style.color='white' }}
                onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.querySelector('span:last-child').style.color='#1d4ed8' }}
                style={{background:'white', border:'0.5px solid #bfdbfe', borderTop:'2px solid #1d4ed8', transition:'all 0.2s ease'}}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{background:'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)'}}>
                  <span className="text-lg">{action.emoji}</span>
                </div>
                <span className="text-xs font-semibold text-center leading-tight" style={{color:'#1d4ed8'}}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}