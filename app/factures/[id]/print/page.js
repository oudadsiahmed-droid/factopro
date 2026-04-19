'use client'
import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import QRCode from 'qrcode'

const supabase = createClient()

function nombreEnLettres(montant) {
  const n = Math.round(montant)
  const units = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf']
  const tens = ['','','vingt','trente','quarante','cinquante','soixante','soixante-dix','quatre-vingt','quatre-vingt-dix']
  function conv(n) {
    if(n===0) return ''
    if(n<20) return units[n]
    if(n<100){const t=Math.floor(n/10),u=n%10;if(t===7||t===9)return tens[t]+'-'+units[10+u];return tens[t]+(u===1&&t!==8?'-et-un':u?'-'+units[u]:'')}
    if(n<1000)return(n===100?'cent':units[Math.floor(n/100)]+'-cent')+(n%100?'-'+conv(n%100):'')
    if(n<1000000)return(n<2000?'mille':conv(Math.floor(n/1000))+'-mille')+(n%1000?'-'+conv(n%1000):'')
    return conv(Math.floor(n/1000000))+'-million'+(n%1000000?'-'+conv(n%1000000):'')
  }
  return(conv(n)||'zéro').toUpperCase()+' DIRHAMS'
}

function PrintContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'facture'
  const id = params?.id
  const [facture, setFacture] = useState(null)
  const [lignes, setLignes] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState('')

  useEffect(() => { if(id) loadData() }, [id])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const saved = localStorage.getItem(`factopro_settings_${user.id}`)
    if (saved) setSettings(JSON.parse(saved))
    const { data: f } = await supabase.from('factures').select('*, clients(nom, email, telephone, ville)').eq('id', id).single()
    const { data: l } = await supabase.from('facture_lignes').select('*').eq('facture_id', id)
    setFacture(f)
    setLignes(l || [])
    // Generate QR Code
    const qrData = `${window.location.origin}/factures/${id}/print`
    const qr = await QRCode.toDataURL(qrData, { width: 80, margin: 1 })
    setQrCode(qr)
    setLoading(false)
  }

  const typeTitle = { facture: 'FACTURE DE VENTE', devis: 'DEVIS', livraison: 'BON DE LIVRAISON' }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}><p>Chargement...</p></div>
  if (!facture) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'#888'}}>Document introuvable</div>

  const subtotal = lignes.reduce((s,l) => s+Number(l.total||0), 0)
  const montantRemise = subtotal*((facture.remise||0)/100)
  const apresRemise = subtotal - montantRemise
  const montantTVA = apresRemise*((facture.tva||0)/100)
  const montantTTC = facture.montant_ttc||(apresRemise+montantTVA)
  const avance = Number(facture.avance||0)
  const reste = montantTTC - avance
  const fmt = (n) => Number(n).toFixed(2).replace('.',',') + ' MAD'

  const DARK = '#2F2F2F'
  const GREY = '#DCDCDC'
  const border = '1.5px solid #555'

  return (
    <>
      <style>{`
        @media print {
          .no-print { display:none !important; }
          body { background:#fff !important; margin:0; }
          @page { size:A4 portrait; margin:10mm 12mm; }
        }
        * { box-sizing: border-box; }
        body { font-family:Calibri,Arial,sans-serif; background:#efefef; margin:0; color:#111; font-size:12px; }
        .page { width:210mm; min-height:277mm; margin:0 auto; background:#fff; display:flex; flex-direction:column; }
      `}</style>

      {/* TOOLBAR */}
      <div className="no-print" style={{position:'fixed',top:0,left:0,right:0,background:'white',borderBottom:'1px solid #e2e8f0',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:50}}>
        <div style={{display:'flex',gap:8}}>
          {['facture','devis','livraison'].map(t=>(
            <button key={t} onClick={()=>window.open(`/factures/${id}/print?type=${t}`,'_self')}
              style={{padding:'6px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:type===t?'#1d4ed8':'#f8fafc',color:type===t?'white':'#555',cursor:'pointer',fontSize:13}}>
              {t==='facture'?'Facture':t==='devis'?'Devis':'Bon de livraison'}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>router.back()} style={{padding:'6px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#555',cursor:'pointer',fontSize:13}}>← Retour</button>
          <button onClick={()=>window.print()} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#1d4ed8',color:'white',cursor:'pointer',fontSize:13,fontWeight:700}}>🖨️ Imprimer / PDF</button>
        </div>
      </div>

      <div style={{paddingTop:60}}>
        <div className="page" style={{padding:'10mm 12mm'}}>

          {/* HEADER — Logo + Titre */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {settings?.logo
                ? <img src={settings.logo} style={{width:50,height:50,objectFit:'cover',borderRadius:4}}/>
                : <div style={{width:50,height:50,background:DARK,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:20}}>
                    {settings?.entreprise?.[0]?.toUpperCase()||'F'}
                  </div>
              }
              <div>
                <div style={{fontWeight:700,fontSize:16}}>{settings?.entreprise||'VOTRE ENTREPRISE'}</div>
                {settings?.slogan && <div style={{fontSize:11,color:'#555'}}>{settings.slogan}</div>}
              </div>
            </div>
            <div style={{textAlign:'right',fontSize:12}}>
              <div style={{fontSize:11,color:'#555'}}>Date: {new Date(facture.created_at).toLocaleDateString('fr-MA')}</div>
            </div>
          </div>

          {/* BANDE TITRE */}
          <div style={{background:DARK,color:'white',textAlign:'center',fontWeight:700,fontSize:15,padding:'8px 0',marginBottom:8}}>
            {typeTitle[type]||'FACTURE DE VENTE'}
          </div>

          {/* N° FACTURE + CLIENT */}
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <div style={{flex:1,border:border,padding:'8px 12px'}}>
              <div style={{fontWeight:700,fontSize:13}}>{typeTitle[type]} N° : {facture.numero}</div>
              <div style={{fontSize:11,color:'#555',marginTop:4}}>Date : {new Date(facture.created_at).toLocaleDateString('fr-MA')}</div>
            </div>
            <div style={{flex:1,border:border,padding:'8px 12px',minHeight:60}}>
              <div style={{fontSize:10,color:'#555',marginBottom:2}}>CLIENT :</div>
                <div style={{fontWeight:700}}>{facture.clients?.nom||'—'}</div>
              {facture.clients?.ville && <div style={{fontSize:11}}>{facture.clients.ville}</div>}
              {facture.clients?.telephone && <div style={{fontSize:11}}>{facture.clients.telephone}</div>}
              {facture.clients?.email && <div style={{fontSize:11}}>{facture.clients.email}</div>}
            </div>
          </div>

          {/* TABLE PRODUITS */}
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:8}}>
            <thead>
              <tr style={{background:DARK,color:'white'}}>
                <th style={{padding:'8px',border:border,textAlign:'center',width:'10%',color:'white'}}>QTE</th>
                <th style={{padding:'8px',border:border,textAlign:'center',width:'50%',color:'white'}}>DESIGNATION</th>
                <th style={{padding:'8px',border:border,textAlign:'center',width:'20%',color:'white'}}>PRIX UNIT HT</th>
                <th style={{padding:'8px',border:border,textAlign:'center',width:'20%',color:'white'}}>MONTANT HT</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l,i) => (
                <tr key={i} style={{background: i%2===0 ? GREY : 'white'}}>
                  <td style={{padding:'7px 8px',border:border,textAlign:'center',fontWeight:700}}>{l.quantite}</td>
                  <td style={{padding:'7px 8px',border:border,fontWeight:700}}>{l.designation||l.description||l.nom_produit||'—'}</td>
                  <td style={{padding:'7px 8px',border:border,textAlign:'right',fontWeight:700}}>{fmt(l.prix_unitaire||0)}</td>
                  <td style={{padding:'7px 8px',border:border,textAlign:'right',fontWeight:700}}>{fmt(l.total||(l.quantite*(l.prix_unitaire||0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTAUX */}
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
            <table style={{borderCollapse:'collapse',minWidth:'40%'}}>
              <tbody>
                <tr style={{background:GREY}}>
                  <td style={{padding:'6px 12px',border:border,fontWeight:700}}>TOTAL H.T</td>
                  <td style={{padding:'6px 12px',border:border,textAlign:'right',fontWeight:700,minWidth:120}}>{fmt(subtotal)}</td>
                </tr>
                {facture.remise > 0 && (
                  <tr>
                    <td style={{padding:'6px 12px',border:border}}>REMISE ({facture.remise}%)</td>
                    <td style={{padding:'6px 12px',border:border,textAlign:'right'}}>{fmt(montantRemise)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{padding:'6px 12px',border:border}}>TVA ({facture.tva||0}%)</td>
                  <td style={{padding:'6px 12px',border:border,textAlign:'right'}}>{fmt(montantTVA)}</td>
                </tr>
                <tr style={{background:DARK,color:'white'}}>
                  <td style={{padding:'7px 12px',border:border,fontWeight:700,color:'white'}}>TOTAL T.T.C</td>
                  <td style={{padding:'7px 12px',border:border,textAlign:'right',fontWeight:700,color:'white'}}>{fmt(montantTTC)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AVANCE / RESTE */}
          {avance > 0 && (
            <div style={{display:'flex',gap:16,marginBottom:8,fontSize:12}}>
              <div><span style={{fontWeight:700}}>Avance : </span>{fmt(avance)} MAD</div>
              <div><span style={{fontWeight:700}}>Reste à payer : </span>{fmt(reste)} MAD</div>
            </div>
          )}

          {/* MONTANT EN LETTRES */}
          <div style={{border:border,padding:'8px 12px',marginBottom:8,fontSize:11}}>
            Arrêté la présente facture à la somme de : <strong>{nombreEnLettres(montantTTC)}</strong>
          </div>

          {/* QR CODE */}
          {qrCode && (
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:8, padding:'6px 0'}}>
              <img src={qrCode} style={{width:70, height:70}} alt="QR"/>
              <div style={{fontSize:10, color:'#555'}}>
                <div style={{fontWeight:700, marginBottom:2}}>Scan pour voir la facture en ligne</div>
                <div style={{color:'#888', fontSize:9}}>FactoPro — {facture?.numero}</div>
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div style={{marginTop:'auto',borderTop:'2px solid #999',paddingTop:6,fontSize:10,textAlign:'center',color:'#333'}}>
            {settings?.telephone && <span>Tél : {settings.telephone} &nbsp;|&nbsp; </span>}
            {settings?.adresse && <span>Adresse : {settings.adresse} {settings?.ville||''} &nbsp;|&nbsp; </span>}
            {settings?.ice && <span>ICE : {settings.ice} &nbsp;|&nbsp; </span>}
            {settings?.rc && <span>RC : {settings.rc} &nbsp;|&nbsp; </span>}
            {settings?.if_num && <span>IF : {settings.if_num} &nbsp;|&nbsp; </span>}
            {settings?.rib && <span>RIB : {settings.rib}</span>}
          </div>

        </div>
      </div>
    </>
  )
}

export default function PrintFacture() {
  return (
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}><p>Chargement...</p></div>}>
      <PrintContent/>
    </Suspense>
  )
}