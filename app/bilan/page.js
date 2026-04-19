'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const supabase = createClient()

export default function Bilan() {
  const router = useRouter()
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const moisNoms = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

  useEffect(() => { loadBilan() }, [annee])

  const loadBilan = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const debut = new Date(annee, 0, 1).toISOString()
    const fin = new Date(annee, 11, 31, 23, 59, 59).toISOString()

    const [{ data: ventes }, { data: achats }, { data: factures }] = await Promise.all([
      supabase.from('ventes').select('total, created_at').eq('user_id', user.id).gte('created_at', debut).lte('created_at', fin),
      supabase.from('achats').select('montant_total, created_at').eq('user_id', user.id).gte('created_at', debut).lte('created_at', fin),
      supabase.from('factures').select('montant_ttc, created_at, statut').eq('user_id', user.id).gte('created_at', debut).lte('created_at', fin)
    ])

    const bilan = moisNoms.map((mois, i) => {
      const ca_ventes = (ventes||[]).filter(v => new Date(v.created_at).getMonth() === i).reduce((s,v) => s + (v.total||0), 0)
      const ca_factures = (factures||[]).filter(f => new Date(f.created_at).getMonth() === i && f.statut === 'payee').reduce((s,f) => s + (f.montant_ttc||0), 0)
      const total_achats = (achats||[]).filter(a => new Date(a.created_at).getMonth() === i).reduce((s,a) => s + (a.montant_total||0), 0)
      const ca = ca_ventes + ca_factures
      const benefice = ca - total_achats
      return { mois, ca: Math.round(ca), achats: Math.round(total_achats), benefice: Math.round(benefice) }
    })

    setData(bilan)
    setLoading(false)
  }

  const totalCA = data.reduce((s,d) => s + d.ca, 0)
  const totalAchats = data.reduce((s,d) => s + d.achats, 0)
  const totalBenefice = data.reduce((s,d) => s + d.benefice, 0)

  const exportExcel = () => {
    const rows = data.map(d => `<tr><td>${d.mois}</td><td>${d.ca}</td><td>${d.achats}</td><td>${d.benefice}</td></tr>`).join('')
    const html = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}th{background:#1d4ed8;color:white}</style></head><body><table><tr><th>Mois</th><th>CA (MAD)</th><th>Achats (MAD)</th><th>Bénéfice (MAD)</th></tr>${rows}<tr style="font-weight:bold;background:#fef9c3"><td>TOTAL</td><td>${totalCA}</td><td>${totalAchats}</td><td>${totalBenefice}</td></tr></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Bilan_FactoPro_${annee}.xls`
    a.click()
  }

  return (
    <div style={{minHeight:'100vh', background:'#eff6ff', padding:20}}>
      <div style={{maxWidth:700, margin:'0 auto'}}>
        <nav style={{background:'#1d4ed8', borderRadius:16, padding:'12px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:32, height:32, background:'white', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#1d4ed8', fontWeight:700}}>F</div>
            <span style={{color:'white', fontWeight:700}}>Bilan Comptable</span>
          </div>
          <button onClick={() => router.push('/dashboard')} style={{color:'#bfdbfe', background:'none', border:'none', cursor:'pointer', fontSize:13}}>← Dashboard</button>
        </nav>

        <div style={{display:'flex', gap:10, marginBottom:20, alignItems:'center'}}>
          <button onClick={() => setAnnee(a => a-1)} style={{padding:'8px 16px', background:'white', border:'0.5px solid #bfdbfe', borderRadius:8, color:'#1d4ed8', cursor:'pointer', fontWeight:700}}>◀</button>
          <div style={{flex:1, textAlign:'center', fontWeight:700, fontSize:18, color:'#1d4ed8'}}>{annee}</div>
          <button onClick={() => setAnnee(a => a+1)} style={{padding:'8px 16px', background:'white', border:'0.5px solid #bfdbfe', borderRadius:8, color:'#1d4ed8', cursor:'pointer', fontWeight:700}}>▶</button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20}}>
          {[{l:'CA Total', v:totalCA, c:'#1d4ed8'},{l:'Achats Total', v:totalAchats, c:'#dc2626'},{l:'Bénéfice Net', v:totalBenefice, c:'#10b981'}].map(s => (
            <div key={s.l} style={{background:'white', borderRadius:12, padding:16, border:'0.5px solid #bfdbfe', textAlign:'center'}}>
              <div style={{fontSize:20, fontWeight:700, color:s.c}}>{s.v.toFixed(0)} MAD</div>
              <div style={{fontSize:11, color:'#64748b', marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{background:'white', borderRadius:12, padding:16, border:'0.5px solid #bfdbfe', marginBottom:20}}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <XAxis dataKey="mois" tick={{fontSize:10}} />
              <YAxis tick={{fontSize:10}} />
              <Tooltip />
              <Bar dataKey="ca" fill="#1d4ed8" name="CA" radius={[4,4,0,0]} />
              <Bar dataKey="achats" fill="#dc2626" name="Achats" radius={[4,4,0,0]} />
              <Bar dataKey="benefice" fill="#10b981" name="Bénéfice" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{background:'white', borderRadius:12, border:'0.5px solid #bfdbfe', overflow:'hidden', marginBottom:20}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#1d4ed8'}}>
                {['Mois','CA (MAD)','Achats (MAD)','Bénéfice (MAD)'].map(h => (
                  <th key={h} style={{padding:'10px 12px', color:'white', fontSize:12, textAlign:'right'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d,i) => (
                <tr key={d.mois} style={{background: i%2===0 ? '#f8fafc' : 'white'}}>
                  <td style={{padding:'8px 12px', fontSize:13, fontWeight:600, color:'#1d4ed8'}}>{d.mois}</td>
                  <td style={{padding:'8px 12px', fontSize:13, textAlign:'right', color:'#1e293b'}}>{d.ca}</td>
                  <td style={{padding:'8px 12px', fontSize:13, textAlign:'right', color:'#dc2626'}}>{d.achats}</td>
                  <td style={{padding:'8px 12px', fontSize:13, textAlign:'right', fontWeight:700, color: d.benefice >= 0 ? '#10b981' : '#dc2626'}}>{d.benefice}</td>
                </tr>
              ))}
              <tr style={{background:'#eff6ff', fontWeight:700}}>
                <td style={{padding:'10px 12px', fontSize:13, color:'#1d4ed8'}}>TOTAL</td>
                <td style={{padding:'10px 12px', fontSize:13, textAlign:'right', color:'#1d4ed8'}}>{totalCA}</td>
                <td style={{padding:'10px 12px', fontSize:13, textAlign:'right', color:'#dc2626'}}>{totalAchats}</td>
                <td style={{padding:'10px 12px', fontSize:13, textAlign:'right', color: totalBenefice >= 0 ? '#10b981' : '#dc2626'}}>{totalBenefice}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <button onClick={exportExcel} style={{width:'100%', padding:14, background:'#1d4ed8', color:'white', border:'none', borderRadius:12, fontWeight:700, fontSize:15, cursor:'pointer'}}>
          📥 Télécharger Bilan Excel {annee}
        </button>
      </div>
    </div>
  )
}