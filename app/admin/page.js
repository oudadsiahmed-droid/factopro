'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()
const ADMIN_EMAIL = 'oudadsi.ahmed@gmail.com'

export default function AdminPanel() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { checkAdmin() }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) { router.push('/'); return }
    loadUsers()
  }

  const loadUsers = async () => {
    const { data } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const addMonth = async (userId) => {
    const user = users.find(u => u.user_id === userId)
    const currentEnd = new Date(user.date_fin) > new Date() ? new Date(user.date_fin) : new Date()
    currentEnd.setMonth(currentEnd.getMonth() + 1)
    await supabase.from('subscriptions').update({ statut: 'active', date_fin: currentEnd.toISOString() }).eq('user_id', userId)
    loadUsers()
  }

  const block = async (userId) => {
    await supabase.from('subscriptions').update({ statut: 'expired', date_fin: new Date().toISOString() }).eq('user_id', userId)
    loadUsers()
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#eff6ff'}}><div style={{color:'#1d4ed8'}}>Chargement...</div></div>

  return (
    <div style={{minHeight:'100vh', background:'#eff6ff', padding:20}}>
      <div style={{maxWidth:600, margin:'0 auto'}}>
        <div style={{background:'#1d4ed8', borderRadius:16, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:36, height:36, background:'white', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#1d4ed8', fontWeight:700}}>F</div>
            <span style={{color:'white', fontWeight:700, fontSize:16}}>Admin Panel</span>
          </div>
          <span style={{color:'#bfdbfe', fontSize:13}}>{users.length} users</span>
        </div>
        {users.map(u => {
          const expired = new Date(u.date_fin) < new Date()
          const daysLeft = Math.ceil((new Date(u.date_fin) - new Date()) / (1000*60*60*24))
          const warning = !expired && daysLeft <= 2
          const date = new Date(u.date_fin).toLocaleDateString('fr-MA')
          return (
            <div key={u.user_id} style={{background:'white', borderRadius:14, padding:16, marginBottom:12, border:`0.5px solid ${expired ? '#fca5a5' : warning ? '#fbbf24' : '#bfdbfe'}`}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                <div>
                  <div style={{fontSize:12, color:'#64748b'}}>{u.user_id?.slice(0,8)}...</div>
                  <div style={{fontSize:11, color:'#94a3b8'}}>Plan: {u.plan}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12, fontWeight:700, color: expired ? '#dc2626' : '#10b981'}}>{expired ? '🔒 Expiré' : '✅ Actif'}</div>
                  <div style={{fontSize:11, fontWeight: warning ? '700' : '400', color: warning ? '#dc2626' : '#94a3b8'}}>{warning ? '⚠️ ' : ''}{date}</div>
                </div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={() => addMonth(u.user_id)} style={{flex:1, padding:'8px 0', background:'#dbeafe', border:'none', borderRadius:8, color:'#1d4ed8', fontWeight:600, fontSize:13, cursor:'pointer'}}>+30 jours</button>
                <button onClick={() => { const msg = `Salam! FactoPro dyalek tjddt hta ${date}. Shukran!`; window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`) }} style={{flex:1, padding:'8px 0', background:'#dcfce7', border:'none', borderRadius:8, color:'#16a34a', fontWeight:600, fontSize:13, cursor:'pointer'}}>📱 WhatsApp</button>
                <button onClick={() => block(u.user_id)} style={{flex:1, padding:'8px 0', background: expired ? '#dcfce7' : '#fee2e2', border:'none', borderRadius:8, color: expired ? '#16a34a' : '#dc2626', fontWeight:600, fontSize:13, cursor:'pointer'}}>{expired ? '✅ Activer' : '🔒 Bloquer'}</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
