import Groq from 'groq-sdk'
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
export async function POST(req) {
  const { message, context } = await req.json()
  
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Nta assistant dyal FactoPro. LAZEM DIMA tjawb b DARIJA MAGHRIBIYA (3arabiya marocaine). HRAM 3lik tjawb b français wla anglais.
          - JAWB 3LA SO2AL SAFI — machi kol data kamla
- Max 2-3 jmlat qsirat
          - Sta3mel emojis w bullet points (*)
          - Arqam b precision
          - Direct w mfid bla kalam zayed
          
          Ma3lumat dyal business:
          ${context}
          
          Tqder t3awen f: ventes, stock, clients, factures, conseils.`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 150,
      temperature: 0.5
    })
    
    return Response.json({ 
      ok: true, 
      reply: completion.choices[0]?.message?.content || 'Mkayn jawab' 
    })
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 })
  }
}