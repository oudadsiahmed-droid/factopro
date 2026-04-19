'use client'
import { useRouter } from 'next/navigation'

export default function Expired() {
  const router = useRouter()
  return (
    <div style={{minHeight:'100vh', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
      <div style={{background:'white', borderRadius:20, padding:40, maxWidth:420, width:'100%', textAlign:'center', border:'0.5px solid #bfdbfe'}}>
        
        <div style={{width:80, height:80, background:'#eff6ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:40}}>🔒</div>
        
        <h1 style={{color:'#1d4ed8', fontSize:22, fontWeight:700, marginBottom:8}}>
          Abonnement expiré
        </h1>
        <p style={{color:'#64748b', fontSize:14, lineHeight:1.6, marginBottom:28}}>
          Votre accès à <strong>FactoPro</strong> est suspendu.<br/>
          Contactez-nous pour activer votre compte.
        </p>

        <div style={{background:'#eff6ff', borderRadius:14, padding:'16px 20px', marginBottom:24, border:'0.5px solid #bfdbfe', textAlign:'left'}}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
            <span>✅</span><span style={{fontSize:13, color:'#1e293b'}}>Gestion produits & stock</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
            <span>✅</span><span style={{fontSize:13, color:'#1e293b'}}>Factures & devis professionnels</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
            <span>✅</span><span style={{fontSize:13, color:'#1e293b'}}>Point de vente + caisse</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
            <span>✅</span><span style={{fontSize:13, color:'#1e293b'}}>Dashboard & rapports Excel</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <span>✅</span><span style={{fontSize:13, color:'#1e293b'}}>Assistant IA + QR Code</span>
          </div>
        </div>

        <a href="https://wa.me/212651645502?text=Salam%2C%20bghit%20nreno%20FactoPro"
          style={{display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:'#25d366', color:'white', padding:'14px 24px', borderRadius:12, fontWeight:700, textDecoration:'none', marginBottom:12, fontSize:15}}>
          <span style={{fontSize:20}}>📱</span> Contacter sur WhatsApp
        </a>

        <button onClick={() => router.push('/')}
          style={{background:'none', color:'#94a3b8', border:'none', cursor:'pointer', fontSize:13}}>
          ← Retour à la connexion
        </button>
      </div>
    </div>
  )
}