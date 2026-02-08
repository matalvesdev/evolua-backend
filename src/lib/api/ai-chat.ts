import { api } from "./client"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatSource {
  title: string
  url: string
  snippet: string
}

export interface ChatResponse {
  answer: string
  sources: ChatSource[]
}

export async function sendChatMessage(
  question: string,
  history: ChatMessage[] = [],
): Promise<ChatResponse> {
  return api.post<ChatResponse>("/ai-chat", { question, history })
}
