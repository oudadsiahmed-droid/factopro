'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function Settings() {
  const [form, setForm] = useState({
    entreprise: '', slogan: '', adresse: '', ville: '',
    telephone: '', email: '', ice: '', rc: '', if_num: '',
    rib: '', couleur: '#4f46e5', logo: ''
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef()
  const router = useRouter()

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const saved = localStorage.getItem(`factopro_settings_${user.id}`)
    if (saved) setForm(JSON.parse(saved))
    setLoading(false)
  }

  const handleLogo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const { data: { user } } = await supabase.auth.getUser()
    const filePath = `${user.id}/logo_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('documents').upload(filePath, file, { upsert: true })
    if (error) { alert('Erreur upload logo: ' + error.message); return }
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath)
    setForm(f => ({ ...f, logo: data.publicUrl }))
  }

  const saveSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const formToSave = { ...form }
    if (formToSave.logo && formToSave.logo.startsWith('data:')) {
      formToSave.logo = ''
    }
    localStorage.setItem(`factopro_settings_${user.id}`, JSON.stringify(formToSave))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {form.logo ? (
            <img src={form.logo} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: form.couleur }}>
              <span className="text-white font-bold text-sm">{form.entreprise ? form.entreprise[0].toUpperCase() : 'F'}</span>
            </div>
          )}
          <span className="font-bold text-gray-900 text-lg">{form.entreprise || 'FactoPro'}</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-indigo-600 font-medium">← Dashboard</button>
      </nav>

      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Paramètres</h1>
          <p className="text-gray-500 mt-1">Ces informations apparaîtront sur vos factures</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">

          {/* Logo */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">🖼️ Logo</h3>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                {form.logo ? (
                  <img src={form.logo} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-sm text-center px-2">Pas de logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => fileRef.current.click()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                  📁 Choisir logo
                </button>
                {form.logo && (
                  <button onClick={() => setForm(f => ({ ...f, logo: '' }))}
                    className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition">
                    🗑️ Supprimer
                  </button>
                )}
                <p className="text-xs text-gray-400">PNG, JPG — max 2MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            </div>
          </div>

          {/* Infos générales */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">🏢 Informations générales</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'entreprise', label: 'Nom entreprise *', placeholder: 'Ex: Ma Société SARL' },
                { key: 'slogan', label: 'Slogan', placeholder: 'Ex: Votre partenaire de confiance' },
                { key: 'adresse', label: 'Adresse', placeholder: 'Ex: 123 Rue Mohammed V' },
                { key: 'ville', label: 'Ville', placeholder: 'Ex: Casablanca' },
                { key: 'telephone', label: 'Téléphone', placeholder: 'Ex: 0522-123456' },
                { key: 'email', label: 'Email', placeholder: 'Ex: contact@masociete.ma' },
                { key: 'rib', label: 'RIB', placeholder: 'Ex: 123456789' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Infos légales */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">📋 Informations légales (Maroc)</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'ice', label: 'ICE', placeholder: '000000000000000' },
                { key: 'rc', label: 'RC', placeholder: 'Ex: 12345' },
                { key: 'if_num', label: 'IF', placeholder: 'Ex: 12345678' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Couleur */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">🎨 Couleur de marque</h3>
            <div className="flex items-center gap-4">
              {['#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#1e293b'].map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, couleur: c }))}
                  className={`w-10 h-10 rounded-full transition-transform ${form.couleur === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={form.couleur} onChange={e => setForm(f => ({ ...f, couleur: e.target.value }))}
                className="w-10 h-10 rounded-full cursor-pointer border-0" />
            </div>
          </div>

          <button onClick={saveSettings}
            className="w-full py-3 rounded-xl font-semibold text-white transition"
            style={{ backgroundColor: form.couleur }}>
            {saved ? '✅ Paramètres sauvegardés!' : 'Sauvegarder les paramètres'}
          </button>
        </div>
      </div>
    </div>
  )
}