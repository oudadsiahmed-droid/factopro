'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('profil')
  const [avatar, setAvatar] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [msg, setMsg] = useState({ text: '', ok: true })
  const fileRef = useRef()

  useEffect(() => { loadUser() }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    setEmail(user.email || '')
    setNewEmail(user.email || '')
    setNom(user.user_metadata?.nom || '')
    setAvatar(user.user_metadata?.avatar || '')
    setLoading(false)
  }

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg({ text: '', ok: true }), 4000)
  }

  const handleAvatar = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showMsg('Image kbira — max 2MB', false); return }
    const reader = new FileReader()
    reader.onload = (ev) => setAvatar(ev.target.result)
    reader.readAsDataURL(file)
  }

  const saveProfil = async () => {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: { nom, avatar }
    })
    if (error) showMsg('❌ ' + error.message, false)
    else showMsg('✅ Profil sauvegardé!')
    setSaving(false)
  }

  const saveEmail = async () => {
    if (!newEmail) { showMsg('Kteb email jadid!', false); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) showMsg('❌ ' + error.message, false)
    else showMsg('✅ Email tbddel — check inbox dyalek!')
    setSaving(false)
  }

  const savePassword = async () => {
    if (!newPass) { showMsg('Kteb password jadid!', false); return }
    if (newPass !== confirmPass) { showMsg('❌ Passwords machi mtwafqin!', false); return }
    if (newPass.length < 6) { showMsg('❌ Password khas ykon 6 caractères au minimum!', false); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) showMsg('❌ ' + error.message, false)
    else { showMsg('✅ Password tbddel!'); setCurrentPass(''); setNewPass(''); setConfirmPass('') }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">F</div>
          <span className="font-semibold text-gray-900">FactoPro</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 font-medium">← Dashboard</button>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* AVATAR */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            {avatar
              ? <img src={avatar} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"/>
              : <div className="w-24 h-24 rounded-full bg-blue-700 flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-white text-3xl font-bold">{(nom || email)?.[0]?.toUpperCase() || 'U'}</span>
                </div>
            }
            <button onClick={() => fileRef.current.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm shadow">
              📷
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden"/>
          <div className="text-center">
            <div className="font-bold text-slate-800">{nom || 'Mon profil'}</div>
            <div className="text-xs text-slate-400">{email}</div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-5">
          {[['profil','👤 Profil'],['email','✉️ Email'],['password','🔒 Password']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${tab === key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {msg.text && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.text}
          </div>
        )}

        {/* TAB PROFIL */}
        {tab === 'profil' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Informations personnelles</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nom complet</label>
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Kteb smiytek..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Email (lecture seule)</label>
                <input value={email} disabled
                  className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400"/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Membre depuis</label>
                <input value={new Date(user.created_at).toLocaleDateString('fr-MA')} disabled
                  className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400"/>
              </div>
            </div>
            <button onClick={saveProfil} disabled={saving}
              className="w-full mt-4 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl text-sm font-semibold transition">
              {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
            </button>
          </div>
        )}

        {/* TAB EMAIL */}
        {tab === 'email' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Changer l'email</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Email actuel</label>
                <input value={email} disabled
                  className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400"/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nouvel email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-700">⚠️ Un email de confirmation sera envoyé à la nouvelle adresse.</p>
            </div>
            <button onClick={saveEmail} disabled={saving}
              className="w-full mt-4 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl text-sm font-semibold transition">
              {saving ? '⏳ Envoi...' : '✉️ Changer l\'email'}
            </button>
          </div>
        )}

        {/* TAB PASSWORD */}
        {tab === 'password' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Changer le mot de passe</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nouveau mot de passe</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Confirmer mot de passe</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              {newPass && confirmPass && newPass !== confirmPass && (
                <p className="text-xs text-red-500">❌ Passwords machi mtwafqin</p>
              )}
              {newPass && confirmPass && newPass === confirmPass && (
                <p className="text-xs text-emerald-600">✅ Passwords mtwafqin</p>
              )}
            </div>
            <button onClick={savePassword} disabled={saving}
              className="w-full mt-4 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl text-sm font-semibold transition">
              {saving ? '⏳ Sauvegarde...' : '🔒 Changer le mot de passe'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}