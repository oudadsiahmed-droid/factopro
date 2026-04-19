'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

export default function Documents() {
  const router = useRouter()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [user, setUser] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => { loadDocuments() }, [])

  const loadDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    const { data } = await supabase.storage.from('documents').list(`${user.id}/`, {
      sortBy: { column: 'created_at', order: 'desc' }
    })
    setDocuments(data || [])
    setLoading(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      setScanning(true)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 100)
    } catch (e) {
      alert('Accès caméra refusé')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopCamera()
    setUploading(true)
    canvas.toBlob(async (blob) => {
      const fileName = `doc_${Date.now()}.jpg`
      const filePath = `${user.id}/${fileName}`
      const { error } = await supabase.storage.from('documents').upload(filePath, blob, {
        contentType: 'image/jpeg'
      })
      if (!error) {
        await loadDocuments()
      } else {
        alert('Erreur upload: ' + error.message)
      }
      setUploading(false)
    }, 'image/jpeg', 0.9)
  }

  const uploadFromGallery = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fileName = `doc_${Date.now()}_${file.name}`
    const filePath = `${user.id}/${fileName}`
    const { error } = await supabase.storage.from('documents').upload(filePath, file)
    if (!error) {
      await loadDocuments()
    } else {
      alert('Erreur: ' + error.message)
    }
    setUploading(false)
  }

  const deleteDocument = async (name) => {
    if (!confirm('Supprimer ce document?')) return
    await supabase.storage.from('documents').remove([`${user.id}/${name}`])
    loadDocuments()
  }

  const getUrl = (name) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(`${user.id}/${name}`)
    return data.publicUrl
  }

  const formatDate = (str) => {
    if (!str) return ''
    return new Date(str).toLocaleDateString('fr-MA', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  }

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">📁 Documents</h1>
            <p className="text-xs text-slate-400 mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* BOUTONS */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button onClick={scanning ? stopCamera : startCamera}
            className={`py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${scanning ? 'bg-red-500 text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'}`}>
            {scanning ? '⏹ Arrêter' : '📷 Scanner war9a'}
          </button>
          <label className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition">
            🖼️ Min galerie
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={uploadFromGallery} />
          </label>
        </div>

        {/* CAMERA */}
        {scanning && (
          <div className="mb-4 rounded-2xl overflow-hidden relative bg-black" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-end justify-center pb-4">
              <button onClick={capturePhoto}
                className="w-16 h-16 bg-white rounded-full border-4 border-blue-600 flex items-center justify-center text-2xl shadow-lg">
                📸
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {uploading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-center text-sm text-blue-700 font-medium">
            ⏳ Sauvegarde en cours...
          </div>
        )}

        {/* LISTE */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm">Mazal mkayn documents</p>
            <p className="text-xs mt-1">Scan wla upload war9a!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.name} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
                <img src={getUrl(doc.name)} alt={doc.name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                  onClick={() => window.open(getUrl(doc.name), '_blank')}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-700 truncate">{doc.name.replace(/^doc_\d+_?/, '')}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{formatDate(doc.created_at)}</div>
                  <div className="text-xs text-slate-400">{doc.metadata?.size ? (doc.metadata.size / 1024).toFixed(0) + ' KB' : ''}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => window.open(getUrl(doc.name), '_blank')}
                    className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-medium">👁️</button>
                  <button onClick={() => deleteDocument(doc.name)}
                    className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-medium">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}