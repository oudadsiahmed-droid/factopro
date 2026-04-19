'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [smiya, setSmiya] = useState('')
  const [telephone, setTelephone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleEmail = async () => {
    setLoading(true)
    setError('')
    try {
      if (isRegister) {
        const { data: signupData, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (signupData?.user) {
          await supabase.from('subscriptions').insert({
            user_id: signupData.user.id,
            statut: 'active',
            date_debut: new Date().toISOString(),
            date_fin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            plan: 'trial'
          })
        }
        setError('✅ Tbqat l-email dyalek bach tconfirmiwi')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Zid subscription 14 jours ila mkaynach
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('subscriptions').upsert({
            user_id: user.id,
            statut: 'active',
            date_debut: new Date().toISOString(),
            date_fin: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            plan: 'trial'
          }, { onConflict: 'user_id', ignoreDuplicates: true })
        }
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleCode = async () => {
    if (!code.trim()) { setError('Kteb code!'); return }
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('users_app')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('actif', true)
        .single()

      if (error || !data) { setError('❌ Code machi sahih!'); setLoading(false); return }
      if (new Date(data.date_fin) < new Date()) { setError('❌ Code expired — contactez admin!'); setLoading(false); return }

      // Login b email fictif
      const fakeEmail = `user${data.telephone.replace(/^0/, '')}@factopro.app`
      const fakePass = `FP_${data.code}_2024`

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: fakePass
      })

      if (loginError) {
        // Créer compte si mkaynach
        const { error: signupError } = await supabase.auth.signUp({
          email: fakeEmail,
          password: fakePass,
          options: { data: { smiya: data.smiya, telephone: data.telephone } }
        })
        if (signupError) throw signupError
        
        // Zid subscription
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('subscriptions').upsert({
            user_id: user.id,
            statut: 'active',
            date_debut: new Date().toISOString(),
            date_fin: data.date_fin,
            plan: 'code'
          })
        }
      }

      router.push('/dashboard')
    } catch (err) {
      setError('❌ ' + err.message)
    }
    setLoading(false)
  }

  const handleRegisterCode = async () => {
    if (!smiya.trim() || !telephone.trim()) { setError('Kteb smiya w téléphone!'); return }
    setLoading(true)
    setError('')
    try {
      // Dir compte b fake email
      const fakeCode = 'TEMP' + Date.now().toString().slice(-6)
      const telClean = telephone.replace(/\s/g,'').replace(/^0/, '')
      const fakeEmail = `user${telClean}@factopro.app`
      const fakePass = `FP_${fakeCode}_2024`

      const { error: signupError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: fakePass,
        options: { data: { smiya, telephone } }
      })
      if (signupError) throw signupError

      // Zid f users_app
      await supabase.from('users_app').insert({
        smiya, telephone: telephone.replace(/\s/g,''),
        code: fakeCode, actif: true
      })

      setError(`✅ Compte créé! Code dyalek: ${fakeCode} — Admin ghadi irslo lik code définitif`)
    } catch (err) {
      setError('❌ ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
      <div style={{background:'white', borderRadius:20, padding:32, width:'100%', maxWidth:400, border:'0.5px solid #bfdbfe'}}>
        
        <div style={{textAlign:'center', marginBottom:24}}>
          <div style={{width:56, height:56, background:'#1d4ed8', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', color:'white', fontWeight:700, fontSize:22}}>F</div>
          <h1 style={{color:'#1e293b', fontSize:22, fontWeight:700, margin:0}}>FactoPro</h1>
          <p style={{color:'#64748b', fontSize:13, marginTop:4}}>Gestion commerciale intelligente</p>
        </div>

        {/* MODE SWITCHER */}
        <div style={{display:'flex', background:'#eff6ff', borderRadius:12, padding:4, marginBottom:20, border:'0.5px solid #bfdbfe'}}>
          <button onClick={() => { setMode('email'); setError('') }}
            style={{flex:1, padding:'8px 0', borderRadius:9, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, transition:'all 0.2s',
              background: mode==='email' ? '#1d4ed8' : 'transparent',
              color: mode==='email' ? 'white' : '#64748b'}}>
            📧 Email
          </button>
          <button onClick={() => { setMode('code'); setError('') }}
            style={{flex:1, padding:'8px 0', borderRadius:9, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, transition:'all 0.2s',
              background: mode==='code' ? '#1d4ed8' : 'transparent',
              color: mode==='code' ? 'white' : '#64748b'}}>
            🔑 Code
          </button>
          <button onClick={() => { setMode('register'); setError('') }}
            style={{flex:1, padding:'8px 0', borderRadius:9, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, transition:'all 0.2s',
              background: mode==='register' ? '#1d4ed8' : 'transparent',
              color: mode==='register' ? 'white' : '#64748b'}}>
            ➕ Nouveau
          </button>
        </div>

        {/* EMAIL MODE */}
        {mode === 'email' && (
          <div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12, color:'#64748b', display:'block', marginBottom:4}}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                style={{width:'100%', padding:'10px 14px', borderRadius:10, border:'0.5px solid #bfdbfe', fontSize:14, outline:'none', boxSizing:'border-box'}} />
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12, color:'#64748b', display:'block', marginBottom:4}}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{width:'100%', padding:'10px 14px', borderRadius:10, border:'0.5px solid #bfdbfe', fontSize:14, outline:'none', boxSizing:'border-box'}} />
            </div>
            {error && <div style={{background: error.includes('✅') ? '#f0fdf4' : '#fef2f2', border:`0.5px solid ${error.includes('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius:8, padding:'10px 14px', fontSize:13, color: error.includes('✅') ? '#15803d' : '#dc2626', marginBottom:12}}>{error}</div>}
            <button onClick={handleEmail} disabled={loading}
              style={{width:'100%', padding:'12px', background:'#1d4ed8', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer'}}>
              {loading ? '⏳...' : isRegister ? 'Créer compte' : 'Se connecter'}
            </button>
            <p style={{textAlign:'center', fontSize:12, color:'#64748b', marginTop:12}}>
              {isRegister ? 'Déjà un compte?' : 'Pas de compte?'}{' '}
              <button onClick={() => setIsRegister(!isRegister)} style={{color:'#1d4ed8', background:'none', border:'none', cursor:'pointer', fontWeight:600}}>
                {isRegister ? 'Se connecter' : "S'inscrire"}
              </button>
            </p>
          </div>
        )}

        {/* CODE MODE */}
        {mode === 'code' && (
          <div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12, color:'#64748b', display:'block', marginBottom:4}}>Code secret</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ex: HANOUT2024"
                style={{width:'100%', padding:'12px 14px', borderRadius:10, border:'0.5px solid #bfdbfe', fontSize:16, outline:'none', boxSizing:'border-box', textAlign:'center', fontWeight:700, letterSpacing:2, color:'#1d4ed8'}} />
            </div>
            {error && <div style={{background: error.includes('✅') ? '#f0fdf4' : '#fef2f2', border:`0.5px solid ${error.includes('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius:8, padding:'10px 14px', fontSize:13, color: error.includes('✅') ? '#15803d' : '#dc2626', marginBottom:12}}>{error}</div>}
            <button onClick={handleCode} disabled={loading}
              style={{width:'100%', padding:'12px', background:'#1d4ed8', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer'}}>
              {loading ? '⏳...' : '🔑 Entrer avec le code'}
            </button>
          </div>
        )}

        {/* REGISTER MODE */}
        {mode === 'register' && (
          <div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12, color:'#64748b', display:'block', marginBottom:4}}>Smiya (Nom)</label>
              <input value={smiya} onChange={e => setSmiya(e.target.value)}
                placeholder="ex: Ahmed Hanout"
                style={{width:'100%', padding:'10px 14px', borderRadius:10, border:'0.5px solid #bfdbfe', fontSize:14, outline:'none', boxSizing:'border-box'}} />
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12, color:'#64748b', display:'block', marginBottom:4}}>Numéro téléphone</label>
              <input value={telephone} onChange={e => setTelephone(e.target.value)}
                placeholder="ex: 0651645502"
                style={{width:'100%', padding:'10px 14px', borderRadius:10, border:'0.5px solid #bfdbfe', fontSize:14, outline:'none', boxSizing:'border-box'}} />
            </div>
            {error && <div style={{background: error.includes('✅') ? '#f0fdf4' : '#fef2f2', border:`0.5px solid ${error.includes('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius:8, padding:'10px 14px', fontSize:13, color: error.includes('✅') ? '#15803d' : '#dc2626', marginBottom:12}}>{error}</div>}
            <button onClick={handleRegisterCode} disabled={loading}
              style={{width:'100%', padding:'12px', background:'#1d4ed8', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer'}}>
              {loading ? '⏳...' : '➕ Créer mon compte'}
            </button>
            <p style={{textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:12}}>
              Admin ghadi irslo lik code f WhatsApp
            </p>
          </div>
        )}

      </div>
    </div>
  )
}