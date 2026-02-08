"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Portal } from "@/components/ui/portal"
import { sendChatMessage } from "@/lib/api/ai-chat"
import type { ChatMessage, ChatSource } from "@/lib/api/ai-chat"

interface DisplayMessage {
  role: "user" | "assistant"
  content: string
  sources?: ChatSource[]
  loading?: boolean
}

const SUGGESTIONS = [
  "Quais técnicas para disfagia orofaríngea?",
  "Como avaliar atraso de linguagem em crianças?",
  "Exercícios para disfonia funcional",
  "Protocolos de avaliação audiológica",
]

export function AiChatFab() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return

    const userMsg: DisplayMessage = { role: "user", content: text.trim() }
    const loadingMsg: DisplayMessage = { role: "assistant", content: "", loading: true }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInput("")
    setSending(true)

    try {
      const history: ChatMessage[] = messages
        .filter((m) => !m.loading)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await sendChatMessage(text.trim(), history)

      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { role: "assistant", content: res.answer, sources: res.sources }
            : m,
        ),
      )
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { role: "assistant", content: "Desculpe, não consegui processar sua pergunta. Tente novamente." }
            : m,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestion = (text: string) => {
    sendMessage(text)
  }

  const handleClear = () => {
    setMessages([])
  }

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-20 md:bottom-6 right-6 z-90 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 ${
          open
            ? "bg-gray-700 hover:bg-gray-800 rotate-0"
            : "bg-linear-to-br from-[#8A05BE] to-[#6B04A0] hover:from-[#7A04AA] hover:to-[#5B0390] shadow-purple-300/40"
        }`}
      >
        <span className="material-symbols-outlined text-white text-2xl transition-transform duration-300">
          {open ? "close" : "auto_awesome"}
        </span>
        {!open && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <Portal>
          <div className="fixed bottom-36 md:bottom-24 right-6 z-90 w-[calc(100vw-3rem)] max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: "min(70vh, 560px)" }}>
              {/* Header */}
              <div className="px-5 py-4 bg-linear-to-r from-[#8A05BE] to-[#6B04A0] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Evolua IA</h3>
                    <p className="text-[10px] text-purple-200">Assistente de fonoaudiologia</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      onClick={handleClear}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                      title="Limpar conversa"
                    >
                      <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-[#8A05BE] text-2xl">psychology</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 mb-1">Como posso ajudar?</p>
                    <p className="text-xs text-gray-500 mb-4">
                      Tire dúvidas clínicas, busque protocolos e evidências científicas
                    </p>
                    <div className="space-y-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSuggestion(s)}
                          className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#8A05BE]/30 hover:bg-purple-50 text-xs text-gray-700 transition-all"
                        >
                          <span className="material-symbols-outlined text-[#8A05BE] text-sm align-middle mr-1.5">lightbulb</span>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          msg.role === "user"
                            ? "bg-[#8A05BE] text-white rounded-br-md"
                            : "bg-white border border-gray-100 text-gray-800 rounded-bl-md"
                        }`}
                      >
                        {msg.loading ? (
                          <div className="flex items-center gap-2 py-1">
                            <span className="material-symbols-outlined text-[#8A05BE] text-sm animate-spin">progress_activity</span>
                            <span className="text-xs text-gray-500">Pesquisando...</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[10px]">link</span>
                                  Fontes
                                </p>
                                {msg.sources.map((src, j) => (
                                  <a
                                    key={j}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-[10px] text-[#8A05BE] hover:underline truncate mb-0.5"
                                  >
                                    [{j + 1}] {src.title}
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100/50 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(138,5,190,0.25)] focus:border-[#8A05BE]/30 transition-all"
                    placeholder="Pergunte algo..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="p-2.5 rounded-xl bg-[#8A05BE] text-white disabled:opacity-40 hover:bg-[#7A04AA] transition-all shrink-0"
                  >
                    <span className="material-symbols-outlined text-lg">send</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}
