'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ produits: 0, alertes: 0 })

  useEffect(() => {
    async function loadStats() {
      const { count: produits } = await supabase
        .from('produits')
        .select('*', { count: 'exact', head: true })

      const { data: alertes } = await supabase
        .from('produits')
        .select('quantite, alerte_stock')

      const alertCount = (alertes || []).filter(
        p => Number(p.quantite) <= Number(p.alerte_stock)
      ).length

      setStats({ produits: produits || 0, alertes: alertCount })
    }
    loadStats()
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center px-4 py-8">

      <div className="flex gap-3 mb-6 flex-wrap justify-center">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">📦</span>
          <div>
            <div className="text-lg font-semibold text-blue-800">{stats.produits.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Produits en stock</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="text-lg font-semibold text-amber-600">{stats.alertes}</div>
            <div className="text-xs text-slate-500">Alertes stock</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-blue-800 rounded-xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8V21H3V8"/><path d="M23 3H1v5h22V3z"/><path d="M10 12h4"/>
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900">FactoPro</div>
            <div className="text-xs text-slate-400">Gestion de stock & Caisse</div>
          </div>
        </div>

        <hr className="border-slate-100 mb-5" />

        <div className="text-sm font-medium text-slate-700 mb-4">Connexion</div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-lg mb-4">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-gray-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-gray-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-800 hover:bg-blue-900 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Connexion...
              </>
            ) : (
              'Se connecter →'
            )}
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-400 mt-5">
        FactoPro © {new Date().getFullYear()} — Système POS & Stock Management
      </p>
    </div>
  )
}