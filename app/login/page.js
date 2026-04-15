'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
const supabase = createClient()

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect') } else { router.push('/dashboard') }
    setLoading(false)
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='w-full max-w-sm p-8 bg-white border rounded-xl'>
        <h1 className='text-xl font-medium mb-1'>FactoPro</h1>
        <p className='text-sm text-gray-500 mb-6'>Connexion</p>
        {error && <div className='bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4'>{error}</div>}
        <form onSubmit={handleLogin} className='space-y-4'>
          <div>
            <label className='text-sm text-gray-500 block mb-1'>Email</label>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)} className='w-full border rounded-lg px-3 py-2 text-sm' required />
          </div>
          <div>
            <label className='text-sm text-gray-500 block mb-1'>Mot de passe</label>
            <input type='password' value={password} onChange={e => setPassword(e.target.value)} className='w-full border rounded-lg px-3 py-2 text-sm' required />
          </div>
          <button type='submit' disabled={loading} className='w-full bg-black text-white py-2 rounded-lg text-sm font-medium'>
            {loading ? '...' : 'Connexion'}
          </button>
        </form>
      </div>
    </div>
  )
}
