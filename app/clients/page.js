'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', ville: '' })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  const addClient = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clients').insert({ ...form, user_id: user.id })
    setForm({ nom: '', email: '', telephone: '', ville: '' })
    setShowForm(false)
    fetchClients()
  }

  const deleteClient = async (id) => {
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">FactoPro</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-indigo-600 font-medium">
          ← Dashboard
        </button>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">👥 Clients</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition">
            + Nouveau client
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Ajouter un client</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'nom', placeholder: 'Nom complet *' },
                { key: 'email', placeholder: 'Email' },
                { key: 'telephone', placeholder: 'Téléphone' },
                { key: 'ville', placeholder: 'Ville' },
              ].map((f) => (
                <input key={f.key} placeholder={f.placeholder} value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={addClient}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition">
                Enregistrer
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-gray-200 px-6 py-2 rounded-xl font-medium hover:bg-gray-50 transition">
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Aucun client pour l'instant</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Nom', 'Email', 'Téléphone', 'Ville', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{c.nom}</td>
                    <td className="px-6 py-4 text-gray-500">{c.email || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{c.telephone || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{c.ville || '—'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => deleteClient(c.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}