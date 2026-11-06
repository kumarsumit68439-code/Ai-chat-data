import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MODELS = new Set([
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-4-argon"
]);

export async function POST(request: NextRequest) {
  const apiKey = process.env.XGPT10_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server is missing XGPT10_API_KEY. Add it in Vercel Environment Variables." }, { status: 503 });
  }

  let body: { model?: string; messages?: Array<{ role: "system" | "user" | "assistant"; content: string }> };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON request." }, { status: 400 }); }

  if (!body.model || !ALLOWED_MODELS.has(body.model)) {
    return Response.json({ error: "Please select a supported model." }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 60) {
    return Response.json({ error: "Messages must contain between 1 and 60 entries." }, { status: 400 });
  }
  const messages = body.messages.filter(m =>
    m && ["system", "user", "assistant"].includes(m.role) &&
    typeof m.content === "string" && m.content.length <= 30000
  );
  if (!messages.length) return Response.json({ error: "No valid messages were provided." }, { status: 400 });

  const endpoint = process.env.XGPT10_BASE_URL || "https://xgpt10.ai.studio/api/v1/chat/completions";
  const provider = process.env.XGPT10_PROVIDER || "groq";

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      },
      body: JSON.stringify({
        provider,
        model: body.model,
        messages,
        temperature: 0.7,
        stream: true
      }),
      cache: "no-store",
      signal: request.signal
    });

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 1200);
      return Response.json({ error: `AI provider returned ${upstream.status}: ${detail || upstream.statusText}` }, { status: 502 });
    }
    if (!upstream.body) return Response.json({ error: "The AI provider returned an empty response." }, { status: 502 });

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return new Response(null, { status: 499 });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to reach the AI provider." }, { status: 502 });
  }
}