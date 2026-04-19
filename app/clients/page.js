'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', ville: '' })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  const addClient = async () => {
    if (!form.nom) { alert('Kteb smiya dyal client!'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clients').insert({ ...form, user_id: user.id })
    setForm({ nom: '', email: '', telephone: '', ville: '' })
    setShowForm(false)
    fetchClients()
  }

  const deleteClient = async (id) => {
    if (!confirm('Wach bghiti tmsah had client?')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const filtered = clients.filter(c =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.telephone?.includes(search) ||
    c.ville?.toLowerCase().includes(search.toLowerCase())
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

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">👥 Clients</h1>
            <p className="text-xs text-slate-400 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
            + Nouveau client
          </button>
        </div>

        {/* FORM */}
        {showForm && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-4">
            <h2 className="font-semibold text-slate-800 mb-3 text-sm">Nouveau client</h2>
            <div className="space-y-2">
              {[
                { key: 'nom', placeholder: 'Nom complet *', type: 'text' },
                { key: 'telephone', placeholder: 'Téléphone', type: 'tel' },
                { key: 'email', placeholder: 'Email', type: 'email' },
                { key: 'ville', placeholder: 'Ville', type: 'text' },
              ].map(f => (
                <input key={f.key} type={f.type} placeholder={f.placeholder} value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addClient} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                ✅ Enregistrer
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* SEARCH */}
        <div className="mb-4">
          <input type="text" placeholder="🔍 Chercher client..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* LISTE */}
        {loading ? (
          <div className="text-center py-10 text-slate-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            {search ? 'Mkayn clients bhal haka' : 'Mazal mkayn clients'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 font-bold text-sm">{c.nom?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{c.nom}</div>
                    {c.telephone && (
                      <div className="text-xs text-slate-500 mt-0.5">📞 {c.telephone}</div>
                    )}
                    {c.email && (
                      <div className="text-xs text-slate-500 mt-0.5 truncate">✉️ {c.email}</div>
                    )}
                    {c.ville && (
                      <div className="text-xs text-slate-400 mt-0.5">📍 {c.ville}</div>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteClient(c.id)}
                  className="text-red-400 hover:text-red-600 text-lg flex-shrink-0 p-1">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}