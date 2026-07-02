// ---------------------------------------------------------------------------
// GlazierIQ — Vercel serverless AI proxy
// ---------------------------------------------------------------------------
// Keeps ANTHROPIC_API_KEY server-side. The front end calls /api/ai and this
// function forwards the request to Anthropic with the key attached.
//
// Required Vercel env var: ANTHROPIC_API_KEY
// ---------------------------------------------------------------------------

const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-20250514',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
])

const MAX_TOKENS_CAP = 4000

export default async function handler(req, res) {
  // --- CORS ---------------------------------------------------------------
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  const { model, max_tokens, messages, system, tools } = req.body || {}

  // --- Guardrails -----------------------------------------------------------
  if (!model || !ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: 'Model not allowed' })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const cappedTokens = Math.min(
    Number.isFinite(max_tokens) ? max_tokens : 1000,
    MAX_TOKENS_CAP
  )

  const body = { model, max_tokens: cappedTokens, messages }
  if (system) body.system = system
  if (tools) body.tools = tools

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'Upstream AI request failed' })
  }
}
