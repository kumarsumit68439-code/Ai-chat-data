"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Menu, MessageSquarePlus, PanelLeftClose, Plus, Send, Sparkles, SquarePen, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; messages: Message[]; updatedAt: number };
const MODELS = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", detail: "Fast reasoning" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", detail: "Ultra fast" },
  { id: "gemini-4-argon", name: "Gemini 4 Argon", detail: "Complex STEM" }
];
const STORAGE_KEY = "nova-ai-chats-v1";
const makeChat = (): Chat => ({ id: crypto.randomUUID(), title: "New chat", messages: [], updatedAt: Date.now() });

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelOpen, setModelOpen] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeChat = chats.find(c => c.id === activeId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) as Chat[] : [];
      if (parsed.length) { setChats(parsed); setActiveId(parsed[0].id); }
      else { const first = makeChat(); setChats([first]); setActiveId(first.id); }
    } catch { const first = makeChat(); setChats([first]); setActiveId(first.id); }
  }, []);

  useEffect(() => {
    if (chats.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat?.messages]);

  function newChat() {
    abortRef.current?.abort();
    const chat = makeChat();
    setChats(prev => [chat, ...prev]); setActiveId(chat.id); setInput(""); setError(""); setLoading(false);
  }
  function deleteChat(id: string) {
    const remaining = chats.filter(c => c.id !== id);
    if (!remaining.length) { const fresh = makeChat(); setChats([fresh]); setActiveId(fresh.id); }
    else { setChats(remaining); if (activeId === id) setActiveId(remaining[0].id); }
  }
  function updateMessages(id: string, messages: Message[]) {
    setChats(prev => prev.map(c => c.id === id ? {
      ...c, messages, updatedAt: Date.now(),
      title: c.messages.length === 0 && messages[0]?.role === "user" ? messages[0].content.slice(0, 38) || "New chat" : c.title
    } : c));
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading || !activeChat) return;
    const chatId = activeChat.id;
    const nextMessages: Message[] = [...activeChat.messages, { role: "user", content: prompt }, { role: "assistant", content: "" }];
    updateMessages(chatId, nextMessages); setInput(""); setError(""); setLoading(true);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [...activeChat.messages, { role: "user", content: prompt }]
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      if (!response.body) throw new Error("Streaming is not supported by this response.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      const append = (chunk: string) => {
        buffer += chunk;
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const raw of events) {
          const line = raw.split("\n").find(l => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const token = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? parsed.delta?.text ?? parsed.output_text ?? "";
            if (typeof token === "string" && token) {
              answer += token;
              updateMessages(chatId, [...nextMessages.slice(0, -1), { role: "assistant", content: answer }]);
            }
          } catch { /* Ignore non-JSON SSE keepalive events. */ }
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        append(decoder.decode(value, { stream: true }));
      }
      append(decoder.decode());
      if (!answer) throw new Error("The provider completed without a readable text stream. Check its response format and model/provider mapping.");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      updateMessages(chatId, [...nextMessages.slice(0, -1), { role: "assistant", content: "I couldn't complete that response. Please check the API configuration and try again." }]);
    } finally { setLoading(false); abortRef.current = null; }
  }

  const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];
  return (
    <main className="flex h-[100dvh] overflow-hidden bg-[#090b10]">
      {sidebarOpen && <aside className="z-20 flex w-[278px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0d0f16] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:w-[85%]">
        <div className="flex h-[72px] items-center justify-between px-5">
          <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600"><Sparkles size={18}/></div><span className="text-[17px] font-semibold tracking-tight">Nova <span className="text-violet-400">AI</span></span></div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white"><PanelLeftClose size={18}/></button>
        </div>
        <div className="px-3 pb-4"><button onClick={newChat} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-3 text-sm font-medium text-gray-200 transition hover:border-violet-400/40 hover:bg-violet-500/10"><MessageSquarePlus size={17} className="text-violet-300"/> New chat <span className="ml-auto text-xs text-gray-600">⌘ K</span></button></div>
        <div className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-gray-600">Recent chats</div>
        <div className="chat-scroll flex-1 space-y-1 overflow-y-auto px-2">
          {chats.map(chat => <div key={chat.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1 ${activeId === chat.id ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}`}>
            <button onClick={() => { setActiveId(chat.id); setError(""); }} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left text-[13px] text-gray-300"><MessageSquarePlus size={15} className="shrink-0 text-gray-600"/><span className="truncate">{chat.title}</span></button>
            <button onClick={() => deleteChat(chat.id)} aria-label="Delete chat" className="rounded p-1.5 text-gray-600 opacity-0 hover:text-red-300 group-hover:opacity-100"><Trash2 size={14}/></button>
          </div>)}
        </div>
        <div className="border-t border-white/[0.07] p-4"><div className="flex items-center gap-3 rounded-xl bg-white/[0.035] p-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-300">N</div><div><p className="text-xs font-medium text-gray-200">Nova workspace</p><p className="mt-0.5 text-[10px] text-gray-600">Personal AI chat</p></div><span className="ml-auto h-2 w-2 rounded-full bg-emerald-400"/></div></div>
      </aside>}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.07] px-4 sm:px-7">
          <div className="flex items-center gap-3">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-gray-400 hover:bg-white/5"><Menu size={19}/></button>}
            <div className="relative">
              <button onClick={() => setModelOpen(!modelOpen)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm hover:bg-white/[0.07]"><span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Bot size={15}/></span><span className="font-medium">{selectedModel.name}</span><ChevronDown size={14} className="text-gray-500"/></button>
              {modelOpen && <><button aria-label="Close model menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setModelOpen(false)}/><div className="absolute left-0 top-12 z-20 w-64 rounded-xl border border-white/10 bg-[#171923] p-2 shadow-2xl">{MODELS.map(m => <button key={m.id} onClick={() => { setModel(m.id); setModelOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.06] ${model === m.id ? "bg-violet-500/10" : ""}`}><span><span className="block text-sm text-gray-200">{m.name}</span><span className="mt-1 block text-[11px] text-gray-500">{m.detail}</span></span>{model === m.id && <span className="h-2 w-2 rounded-full bg-violet-400"/>}</button>)}</div></>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> Streaming chat</div>
        </header>
        <div className="chat-scroll flex-1 overflow-y-auto">
          {!activeChat?.messages.length ? <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 pb-24 pt-12">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-[0_0_50px_rgba(124,92,255,.12)]"><Sparkles size={25}/></div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Your AI workspace</p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.13] tracking-tight text-white sm:text-5xl">What can I help you <span className="bg-gradient-to-r from-violet-300 to-indigo-400 bg-clip-text text-transparent">create today?</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-gray-500">Ask questions, explore ideas, write code, or solve complex problems. Choose a model and start a conversation.</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {[
                ["Code & development","Help me build a modern responsive website","</>"],
                ["Learn something new","Explain a complex topic in simple terms","✳"],
                ["Creative writing","Give me ideas for a unique short story","✎"],
                ["Problem solving","Help me break down a challenging problem","⌁"]
              ].map(([title, prompt, symbol]) => <button key={title} onClick={() => setInput(prompt)} className="group rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.06]"><span className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-sm text-violet-300">{symbol}</span><span className="block text-sm font-medium text-gray-200">{title}</span><span className="mt-1 block text-xs text-gray-500">{prompt}</span></button>)}
            </div>
          </div> : <div className="mx-auto max-w-3xl space-y-8 px-4 py-9 sm:px-7">
            {activeChat.messages.map((message, index) => <div key={index} className={`flex gap-3 sm:gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600"><Sparkles size={16}/></div>}
              <div className={`max-w-[88%] min-w-0 rounded-2xl px-4 py-3 text-[14px] ${message.role === "user" ? "bg-[#242333] text-gray-100" : "text-gray-300"}`}>
                {message.role === "assistant" ? <div className="prose-chat"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || (loading && index === activeChat.messages.length - 1 ? " " : "")}</ReactMarkdown>{loading && index === activeChat.messages.length - 1 && <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-violet-400"/>}</div> : <p className="whitespace-pre-wrap leading-7">{message.content}</p>}
              </div>
              {message.role === "user" && <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-xs text-gray-300">You</div>}
            </div>)}
            <div ref={bottomRef}/>
          </div>}
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pb-5 pt-3 sm:px-7 sm:pb-7">
          {error && <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-3 text-xs leading-5 text-red-200"><span>{error}</span><button onClick={() => setError("")}><X size={15}/></button></div>}
          <form onSubmit={sendMessage} className="rounded-2xl border border-white/[0.12] bg-[#11131b] p-2 shadow-[0_15px_60px_rgba(0,0,0,.25)] transition focus-within:border-violet-400/40">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Message Nova AI..." rows={2} className="max-h-40 min-h-[56px] w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-gray-100 outline-none placeholder:text-gray-600" />
            <div className="flex items-center justify-between px-1 pb-1"><div className="flex items-center gap-2 pl-2 text-[10px] text-gray-600"><span>{selectedModel.detail}</span><span>·</span><span>Enter to send</span></div><button type={loading ? "button" : "submit"} onClick={loading ? () => abortRef.current?.abort() : undefined} disabled={!loading && !input.trim()} className="flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-3.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-35">{loading ? <><X size={14}/> Stop</> : <><Send size={14}/> Send</>}</button></div>
          </form>
          <p className="mt-3 text-center text-[10px] text-gray-700">AI can make mistakes. Verify important information.</p>
        </div>
      </section>
    </main>
  );
}