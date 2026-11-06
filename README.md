# Nova AI Chat

A Next.js streaming AI chat application using the xGPT10 API Hub with the Gemini provider.

## Features

- Gemini provider selection with the requested model IDs: `gemini-3.8-flash`, `gemini-3.1-flash-lite`, and `gemini-4-argon`
- Server-side API proxy; the API key is never sent to the browser
- Streaming chat-completions response passthrough
- Multiple conversations, delete/new chat, Markdown and GFM rendering
- Responsive dark interface
- Local browser chat history

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and set `XGPT10_API_KEY`.
4. Run `npm run dev` and open http://localhost:3000.

## Vercel environment variables

Set these in Project Settings → Environment Variables:

- `XGPT10_API_KEY` — your private xGPT10 API Hub key
- `XGPT10_BASE_URL` — defaults to `https://xgpt10.ai.studio/api/v1/chat/completions`
- `XGPT10_PROVIDER` — defaults to `gemini`

Never commit a real API key to GitHub or expose it in client-side code.

## Provider compatibility note

The server now hard-codes `provider: "gemini"` so an old `XGPT10_PROVIDER=groq` Vercel variable cannot silently route Gemini model IDs through Groq. It also adds a conversational system instruction to discourage gateway-style execution summaries. The app still depends on xGPT10 actually mapping the selected model IDs to live Gemini models; if the gateway itself returns canned text, that must be corrected by the gateway/provider configuration. The application does not manufacture an AI answer.

## Persistence

Conversation history is stored in the current browser using localStorage. Supabase cloud sync is not configured in this version.

## Deployment

Import this GitHub repository into Vercel, add the environment variables above, then deploy. The API key must remain server-side.
