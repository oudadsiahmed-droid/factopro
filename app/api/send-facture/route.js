import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req) {
  const { to, numero, clientNom, montantTTC, pdfUrl, settings } = await req.json()
  
  try {
    await resend.emails.send({
      from: `${settings?.entreprise || 'FactoPro'} <noreply@factopro.online>`,
      to: [to],
      subject: `Facture ${numero} — ${settings?.entreprise || 'FactoPro'}`,
      html: `
        <div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:#1d4ed8;padding:20px;border-radius:12px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;margin:0;font-size:22px">${settings?.entreprise || 'FactoPro'}</h1>
          </div>
          <p style="font-size:16px;color:#333">Bonjour <b>${clientNom}</b>,</p>
          <p style="color:#555">Veuillez trouver ci-joint votre facture <b>${numero}</b> d'un montant de <b>${montantTTC} MAD</b>.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#888;font-size:13px">📄 Numéro: <b style="color:#333">${numero}</b></p>
            <p style="margin:8px 0 0;color:#888;font-size:13px">💰 Montant TTC: <b style="color:#1d4ed8">${montantTTC} MAD</b></p>
          </div>
          ${pdfUrl ? `<a href="${pdfUrl}" style="display:inline-block;background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">📄 Voir la facture</a>` : ''}
          <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
          <p style="color:#999;font-size:12px;text-align:center">
            ${settings?.adresse || ''} ${settings?.ville || ''}<br/>
            ${settings?.telephone ? `Tél: ${settings.telephone}` : ''} ${settings?.email ? `| ${settings.email}` : ''}
          </p>
        </div>
      `
    })
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 })
  }
}