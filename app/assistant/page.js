'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function Assistant() {
  const router = useRouter()
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Salam! 👋 Ana Assistant dyalek f FactoPro. Suwelni 3la ventes, stock, clients, wla ay haja okhra!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => { loadContext() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadContext = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const now = new Date()
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const [
      { count: nbClients }, { count: nbFactures },
      { data: factures }, { data: produits }, { data: ventes }
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('factures').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('factures').select('montant_ttc, statut, created_at').eq('user_id', user.id),
      supabase.from('produits').select('nom, quantite, prix, alerte_stock').eq('user_id', user.id),
      supabase.from('ventes').select('total, created_at').eq('user_id', user.id).gte('created_at', debutMois)
    ])
    const caTotal = factures?.reduce((s, f) => s + (f.montant_ttc || 0), 0) || 0
    const caMois = ventes?.reduce((s, v) => s + (v.total || 0), 0) || 0
    const enAttente = factures?.filter(f => f.statut === 'en_attente').length || 0
    const alertes = produits?.filter(p => Number(p.quantite) <= Number(p.alerte_stock)) || []
    const topProduits = produits?.sort((a, b) => b.quantite - a.quantite).slice(0, 5) || []
    setContext(`
      - Nombre clients: ${nbClients}
      - Nombre factures total: ${nbFactures}
      - CA total factures: ${caTotal.toFixed(2)} MAD
      - CA ventes POS ce mois: ${caMois.toFixed(2)} MAD
      - Factures en attente: ${enAttente}
      - Produits en alerte stock: ${alertes.map(p => p.nom + ' (' + p.quantite + ' unités)').join(', ') || 'Aucun'}
      - Top produits par stock: ${topProduits.map(p => p.nom + ' (' + p.quantite + ')').join(', ')}
      - Nombre total produits: ${produits?.length || 0}
    `)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context })
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.ok ? data.reply : '❌ Erreur: ' + data.error
      }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: '❌ Erreur connexion' }])
    }
    setLoading(false)
  }

  const suggestions = [
    '📊 Kif kayn business dyali?',
    '⚠️ Ach produits f alerte?',
    '💰 Chhal CA had chhar?',
    '🧾 Chhal factures en attente?',
  ]

  return (
    <div style={{minHeight:'100vh', background:'#eff6ff', display:'flex', flexDirection:'column'}}>
      
      {/* NAVBAR */}
      <nav style={{background:'#1d4ed8', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{width:32, height:32, background:'white', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#1d4ed8', fontWeight:700, fontSize:14}}>F</div>
          <span style={{color:'white', fontWeight:600, fontSize:15}}>FactoPro</span>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{color:'#bfdbfe', fontSize:13, background:'none', border:'none', cursor:'pointer'}}>← Dashboard</button>
      </nav>

      {/* CHAT HEADER */}
      <div style={{background:'#1d4ed8', padding:'12px 16px 20px', display:'flex', alignItems:'center', gap:12}}>
        <div style={{width:44, height:44, background:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22}}>🤖</div>
        <div>
          <div style={{color:'white', fontWeight:700, fontSize:15}}>Assistant IA</div>
          <div style={{color:'#93c5fd', fontSize:12}}>Powered by Groq • Llama 3</div>
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10, paddingBottom:80}}>
        
        {messages.map((m, i) => (
          <div key={i} style={{display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems:'flex-end', gap:8}}>
            
            {m.role === 'assistant' && (
              <div style={{width:32, height:32, background:'#1d4ed8', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0}}>🤖</div>
            )}
            
            <div style={{
              maxWidth:'75%',
              padding:'10px 14px',
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? '#1d4ed8' : 'white',
              color: m.role === 'user' ? 'white' : '#1e293b',
              fontSize:14,
              lineHeight:1.5,
              border: m.role === 'assistant' ? '0.5px solid #bfdbfe' : 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
            }}>
              {m.text}
            </div>

            {m.role === 'user' && (
              <div style={{width:32, height:32, background:'#dbeafe', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0}}>👤</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{display:'flex', justifyContent:'flex-start', alignItems:'flex-end', gap:8}}>
            <div style={{width:32, height:32, background:'#1d4ed8', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16}}>🤖</div>
            <div style={{background:'white', border:'0.5px solid #bfdbfe', borderRadius:'18px 18px 18px 4px', padding:'12px 16px', display:'flex', gap:4}}>
              {[0,150,300].map(d => (
                <div key={d} style={{width:8, height:8, background:'#1d4ed8', borderRadius:'50%', animation:'bounce 1s infinite', animationDelay:`${d}ms`}}/>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef}/>
      </div>

      {/* SUGGESTIONS */}
      {messages.length === 1 && (
        <div style={{padding:'0 16px 12px', display:'flex', gap:8, overflowX:'auto', flexWrap:'wrap'}}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setInput(s)}
              style={{padding:'8px 14px', background:'white', border:'0.5px solid #bfdbfe', borderRadius:20, fontSize:12, color:'#1d4ed8', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.2s'}}
              onMouseEnter={e => { e.currentTarget.style.background='#1d4ed8'; e.currentTarget.style.color='white' }}
              onMouseLeave={e => { e.currentTarget.style.background='white'; e.currentTarget.style.color='#1d4ed8' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div style={{position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'0.5px solid #bfdbfe', padding:'12px 16px', display:'flex', gap:10, alignItems:'center'}}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Suwel chi haja..."
          style={{flex:1, border:'0.5px solid #bfdbfe', borderRadius:24, padding:'10px 16px', fontSize:14, outline:'none', background:'#eff6ff', color:'#1e293b'}}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}
          style={{width:44, height:44, background: input.trim() ? '#1d4ed8' : '#bfdbfe', border:'none', borderRadius:'50%', color:'white', fontSize:18, cursor: input.trim() ? 'pointer' : 'default', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center'}}>
          ➤
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}