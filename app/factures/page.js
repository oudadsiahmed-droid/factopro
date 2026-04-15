'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Factures() {
  const [factures, setFactures] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', date_echeance: '', notes: '', tva: 20 })
  const [lignes, setLignes] = useState([{ description: '', quantite: 1, prix_unitaire: 0 }])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const [{ data: f }, { data: c }] = await Promise.all([
      supabase.from('factures').select('*, clients(nom, email, telephone, ville)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, nom')
    ])
    setFactures(f || [])
    setClients(c || [])
    setLoading(false)
  }

  const getMontantHT = () => lignes.reduce((sum, l) => sum + (l.quantite * l.prix_unitaire), 0)
  const getMontantTTC = () => getMontantHT() * (1 + form.tva / 100)

  const addFacture = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { count } = await supabase.from('factures').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    const numero = `FAC-${String((count || 0) + 1).padStart(4, '0')}`
    const montant_ht = getMontantHT()
    const montant_ttc = getMontantTTC()
    const { data: facture } = await supabase.from('factures').insert({
      user_id: user.id, client_id: form.client_id || null,
      numero, tva: form.tva, date_echeance: form.date_echeance || null,
      notes: form.notes, montant_ht, montant_ttc, statut: 'en_attente'
    }).select().single()
    if (facture) {
      await supabase.from('facture_lignes').insert(
        lignes.map(l => ({
          facture_id: facture.id, description: l.description,
          quantite: l.quantite, prix_unitaire: l.prix_unitaire,
          total: l.quantite * l.prix_unitaire
        }))
      )
    }
    setForm({ client_id: '', date_echeance: '', notes: '', tva: 20 })
    setLignes([{ description: '', quantite: 1, prix_unitaire: 0 }])
    setShowForm(false)
    fetchData()
  }

  const printFacture = async (facture) => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const { data: { user } } = await supabase.auth.getUser()
    const savedSettings = localStorage.getItem(`factopro_settings_${user.id}`)
    const settings = savedSettings ? JSON.parse(savedSettings) : {}
    const nomEntreprise = settings.entreprise || 'FactoPro'
    const slogan = settings.slogan || ''
    const couleur = settings.couleur || '#4f46e5'
    const r = parseInt(couleur.slice(1,3), 16)
    const g = parseInt(couleur.slice(3,5), 16)
    const b = parseInt(couleur.slice(5,7), 16)
    const { data: lignesData } = await supabase.from('facture_lignes').select('*').eq('facture_id', facture.id)
    const doc = new jsPDF()

    // ===== BANDE COULEUR GAUCHE =====
    doc.setFillColor(r, g, b)
    doc.rect(0, 0, 6, 297, 'F')

    // ===== LOGO + NOM ENTREPRISE (haut gauche) =====
    if (settings.logo) {
      try { doc.addImage(settings.logo, 'JPEG', 14, 12, 20, 20) } catch(e) {}
    }
    doc.setTextColor(20, 20, 20)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(nomEntreprise.toUpperCase(), 14, settings.logo ? 40 : 22)
    if (slogan) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      doc.text(slogan.toUpperCase(), 14, settings.logo ? 46 : 28)
    }

    // ===== FACTURE (haut droite grand titre) =====
    doc.setTextColor(20, 20, 20)
    doc.setFontSize(36)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURE', 196, 28, { align: 'right' })

    // ===== DATE + ECHEANCE + NUMERO =====
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.3)
    doc.line(14, 55, 196, 55)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text(`DATE : ${facture.created_at ? facture.created_at.split('T')[0] : ''}`, 14, 63)
    if (facture.date_echeance) {
      doc.text(`ÉCHEANCE : ${facture.date_echeance}`, 14, 70)
    }
    doc.text(`FACTURE N° : ${facture.numero}`, 196, 63, { align: 'right' })

    doc.line(14, 75, 196, 75)

    // ===== EMETTEUR + DESTINATAIRE =====
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('ÉMETTEUR :', 14, 84)
    doc.text('DESTINATAIRE :', 196, 84, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    let ey = 92
    if (settings.telephone) { doc.text(settings.telephone, 14, ey); ey += 6 }
    if (settings.email) { doc.text(settings.email, 14, ey); ey += 6 }
    if (settings.adresse) { doc.text(settings.adresse, 14, ey); ey += 6 }
    if (settings.ville) { doc.text(settings.ville, 14, ey) }

    let cy = 92
    if (facture.clients) {
      doc.text(facture.clients.nom || '', 196, cy, { align: 'right' }); cy += 6
      if (facture.clients.email) { doc.text(facture.clients.email, 196, cy, { align: 'right' }); cy += 6 }
      if (facture.clients.ville) { doc.text(facture.clients.ville, 196, cy, { align: 'right' }); cy += 6 }
      if (facture.clients.telephone) { doc.text(facture.clients.telephone, 196, cy, { align: 'right' }) }
    }

    // ===== TABLE =====
    autoTable(doc, {
      startY: 120,
      head: [['Description :', 'Prix Unitaire :', 'Quantité :', 'Total :']],
      body: (lignesData || []).map(l => [
        l.description,
        `${parseFloat(l.prix_unitaire).toFixed(2)} MAD`,
        l.quantite,
        `${parseFloat(l.total).toFixed(2)} MAD`
      ]),
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [20, 20, 20],
        fontStyle: 'bold',
        fontSize: 9,
        lineColor: [20, 20, 20],
        lineWidth: { bottom: 0.5 }
      },
      bodyStyles: {
        textColor: [60, 60, 60],
        fontSize: 9,
        lineColor: [200, 200, 200],
        lineWidth: { bottom: 0.3 }
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 38, halign: 'left' },
        2: { cellWidth: 28, halign: 'left' },
        3: { cellWidth: 38, halign: 'left' },
      },
      margin: { left: 14, right: 14 },
      tableLineWidth: 0,
    })

    const finalY = doc.lastAutoTable.finalY + 10

    // ===== REGLEMENT (bas gauche) =====
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text('RÈGLEMENT :', 14, finalY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text('Par virement bancaire', 14, finalY + 7)
    if (settings.ice) { doc.text(`ICE : ${settings.ice}`, 14, finalY + 13) }
    if (settings.rc) { doc.text(`RC : ${settings.rc}`, 14, finalY + 19) }
    if (settings.if_num) { doc.text(`IF : ${settings.if_num}`, 14, finalY + 25) }

    // ===== TOTAUX (bas droite) =====
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL HT :', 140, finalY)
    doc.text(`${parseFloat(facture.montant_ht).toFixed(2)} MAD`, 196, finalY, { align: 'right' })
    doc.text(`TVA ${facture.tva}% :`, 140, finalY + 8)
    doc.text(`${(facture.montant_ht * facture.tva / 100).toFixed(2)} MAD`, 196, finalY + 8, { align: 'right' })
    doc.text('REMISE :', 140, finalY + 16)
    doc.text('-', 196, finalY + 16, { align: 'right' })

    // Total TTC bold
    doc.setDrawColor(20, 20, 20)
    doc.setLineWidth(0.5)
    doc.line(140, finalY + 19, 196, finalY + 19)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(20, 20, 20)
    doc.text('TOTAL TTC :', 140, finalY + 26)
    doc.text(`${parseFloat(facture.montant_ttc).toFixed(2)} MAD`, 196, finalY + 26, { align: 'right' })

    // ===== TERMES =====
    if (finalY + 50 < 260) {
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.3)
      doc.line(14, finalY + 38, 196, finalY + 38)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40, 40, 40)
      doc.text('TERMES & CONDITIONS', 14, finalY + 45)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('En cas de retard de paiement, une indemnite calculee a trois fois le taux d\'interet legal est exigible.', 14, finalY + 52, { maxWidth: 120 })
    }

    // ===== CERCLES DECORATIFS (bas droite) =====
    doc.setFillColor(r, g, b)
    doc.circle(190, 280, 6, 'F')
    doc.setFillColor(200, 200, 200)
    doc.circle(178, 285, 4, 'F')
    doc.setFillColor(r, Math.min(g+80, 255), Math.min(b+80, 255))
    doc.circle(183, 274, 3, 'F')

    doc.save(`${facture.numero}.pdf`)
  }

  const updateStatut = async (id, statut) => {
    await supabase.from('factures').update({ statut }).eq('id', id)
    fetchData()
  }

  const deleteFacture = async (id) => {
    await supabase.from('factures').delete().eq('id', id)
    fetchData()
  }

  const statutColors = {
    brouillon: 'bg-gray-100 text-gray-600',
    en_attente: 'bg-yellow-100 text-yellow-600',
    payee: 'bg-green-100 text-green-600',
    annulee: 'bg-red-100 text-red-600'
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
        <button onClick={() => router.push('/dashboard')} className="text-sm text-indigo-600 font-medium">← Dashboard</button>
      </nav>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🧾 Factures</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition">
            + Nouvelle facture
          </button>
        </div>
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Nouvelle facture</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">-- Sélectionner client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <input type="date" value={form.date_echeance}
                onChange={(e) => setForm({ ...form, date_echeance: e.target.value })}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Lignes de facture</h3>
                <button onClick={() => setLignes([...lignes, { description: '', quantite: 1, prix_unitaire: 0 }])}
                  className="text-indigo-600 text-sm font-medium hover:underline">+ Ajouter ligne</button>
              </div>
              <div className="space-y-2">
                {lignes.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <input placeholder="Description" value={l.description}
                      onChange={(e) => { const nl = [...lignes]; nl[i].description = e.target.value; setLignes(nl) }}
                      className="col-span-6 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm" />
                    <input type="number" placeholder="Qté" value={l.quantite}
                      onChange={(e) => { const nl = [...lignes]; nl[i].quantite = parseFloat(e.target.value) || 0; setLignes(nl) }}
                      className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm" />
                    <input type="number" placeholder="Prix" value={l.prix_unitaire}
                      onChange={(e) => { const nl = [...lignes]; nl[i].prix_unitaire = parseFloat(e.target.value) || 0; setLignes(nl) }}
                      className="col-span-3 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none text-sm" />
                    <button onClick={() => setLignes(lignes.filter((_, j) => j !== i))}
                      className="col-span-1 text-red-400 hover:text-red-600 text-lg">×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Montant HT</span><span>{getMontantHT().toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>TVA ({form.tva}%)</span><span>{(getMontantHT() * form.tva / 100).toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t pt-2 mt-2">
                <span>Total TTC</span><span>{getMontantTTC().toFixed(2)} MAD</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={addFacture}
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
          ) : factures.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Aucune facture pour l'instant</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Numéro', 'Client', 'Montant TTC', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {factures.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">{f.numero}</td>
                    <td className="px-6 py-4 text-gray-600">{f.clients?.nom || '—'}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{f.montant_ttc?.toFixed(2)} MAD</td>
                    <td className="px-6 py-4">
                      <select value={f.statut} onChange={(e) => updateStatut(f.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-sm font-medium border-0 ${statutColors[f.statut]}`}>
                        <option value="brouillon">Brouillon</option>
                        <option value="en_attente">En attente</option>
                        <option value="payee">Payée</option>
                        <option value="annulee">Annulée</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 flex gap-3">
                      <button onClick={() => printFacture(f)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                        🖨️ Imprimer
                      </button>
                      <button onClick={() => deleteFacture(f.id)}
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