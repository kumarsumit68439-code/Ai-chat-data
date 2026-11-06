# Nova AI Chat

A Next.js streaming AI chat application powered by the xGPT10 chat-completions endpoint.

## Features

- Three selectable model IDs: `gemini-3.8-flash`, `gemini-3.1-flash-lite`, and `gemini-4-argon`
- Server-side API proxy; the API key is never sent to the browser
- Streaming chat-completions response handling
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
- `XGPT10_BASE_URL` — optional; defaults to `https://xgpt10.ai.studio/api/v1/chat/completions`
- `XGPT10_PROVIDER` — optional; defaults to `groq` because that is the provider in the supplied sample request

Never commit a real API key to GitHub or expose it in client-side code.

## Important provider/model check

The supplied xGPT10 example uses `provider: "groq"`, while the requested model IDs are Gemini-named. This app sends the selected model ID and configured provider as supplied, but the exact provider/model compatibility must be confirmed against xGPT10's current API documentation or account. If xGPT10 expects a different provider for these Gemini IDs, change `XGPT10_PROVIDER` in Vercel.

## Persistence

Conversation history is stored in the current browser using localStorage. Supabase cloud sync is not enabled in this initial version because project URL and anon key have not been provided. Do not place a Supabase service-role key in the browser.

## Deployment

Import this GitHub repository into Vercel, add the environment variables above, then deploy. The API key must remain server-side.
