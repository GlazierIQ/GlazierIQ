// ---------------------------------------------------------------------------
// GlazierIQ — central AI client
// ---------------------------------------------------------------------------
// Every Claude call in the app goes through callClaude() so that when the
// server-side proxy is added later, only ENDPOINT (and the headers) changes
// here — no page needs to be touched.
//
// Today: calls api.anthropic.com directly from the browser.
// Later:  set VITE_AI_PROXY_URL to your serverless function (e.g.
//         /api/ai) and the whole app routes through it automatically.
// ---------------------------------------------------------------------------

const DIRECT_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const PROXY_ENDPOINT  = import.meta.env.VITE_AI_PROXY_URL || null
const ENDPOINT        = PROXY_ENDPOINT || DIRECT_ENDPOINT

export const AI_MODEL = 'claude-sonnet-4-20250514'

/**
 * Low-level call. Returns the raw text of the model's reply.
 *
 * @param {Object}  opts
 * @param {string}  [opts.system]      System prompt
 * @param {Array}   opts.messages      Anthropic-format messages
 * @param {number}  [opts.max_tokens]  Default 1000
 * @param {Array}   [opts.tools]       Optional tool definitions (e.g. web_search)
 */
export async function callClaude({ system, messages, max_tokens = 1000, tools }) {
  const body = { model: AI_MODEL, max_tokens, messages }
  if (system) body.system = system
  if (tools)  body.tools  = tools

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`AI request failed (${res.status})`)
  const data = await res.json()
  return (data.content || []).map(b => b.text || '').join('').trim()
}

/**
 * Convenience helper that expects a JSON object back. Strips markdown fences
 * and parses. Throws if parsing fails so callers can show a fallback.
 */
export async function callClaudeJSON(opts) {
  const text = await callClaude(opts)
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

/**
 * Build the message content array for an attached document or image, so any
 * page can hand the agent a PDF (RFI, change order, blueprint) or a photo.
 */
export function fileContent({ base64, mediaType, text }) {
  const content = []
  if (base64) {
    const isPdf = mediaType === 'application/pdf'
    content.push(
      isPdf
        ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } }
        : { type: 'image',    source: { type: 'base64', media_type: mediaType, data: base64 } }
    )
  }
  if (text) content.push({ type: 'text', text })
  return content
}
