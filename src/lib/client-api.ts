// Browser-side helpers for talking to our own /api routes.
// Every failure becomes an Error with an Estonian message that can be shown to the user directly.
import type {
  AttachmentMeta, ChatSettings, ConversationDetail, ConversationSummary, MessageDto, PromptDto,
} from "@/lib/types";

const NETWORK_ERROR = "Serveriga ei saadud ühendust. Kontrolli internetiühendust ja proovi uuesti.";
const UNKNOWN_ERROR = "Midagi läks valesti. Proovi uuesti.";

async function request<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch {
    throw new Error(NETWORK_ERROR);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response: handled below.
  }
  if (!response.ok) {
    const message = (data as { error?: unknown } | null)?.error;
    throw new Error(typeof message === "string" ? message : UNKNOWN_ERROR);
  }
  return data as T;
}

export const api = {
  listConversations: () => request<{ conversations: ConversationSummary[] }>("/api/conversations").then((r) => r.conversations),
  getConversation: (id: string) => request<{ conversation: ConversationDetail }>(`/api/conversations/${id}`).then((r) => r.conversation),
  createConversation: (settings: ChatSettings) =>
    request<{ conversation: ConversationDetail }>("/api/conversations", {
      method: "POST",
      body: {
        model: settings.model,
        temperature: settings.temperature,
        topP: settings.topP,
        ...(settings.systemPromptId ? { systemPromptId: settings.systemPromptId } : {}),
      },
    }).then((r) => r.conversation),
  updateConversation: (id: string, patch: Partial<ChatSettings> & { title?: string }) =>
    request<{ conversation: ConversationDetail }>(`/api/conversations/${id}`, { method: "PATCH", body: patch }).then((r) => r.conversation),
  deleteConversation: (id: string) => request<{ ok: true }>(`/api/conversations/${id}`, { method: "DELETE" }),
  sendMessage: (id: string, content: string, attachment?: AttachmentMeta) =>
    request<{ userMessage: MessageDto; assistantMessage: MessageDto }>(`/api/conversations/${id}/messages`, {
      method: "POST",
      body: { content, ...(attachment ? { attachment } : {}) },
    }),

  listPrompts: () => request<{ prompts: PromptDto[] }>("/api/prompts").then((r) => r.prompts),
  createPrompt: (input: { name: string; content: string }) =>
    request<{ prompt: PromptDto }>("/api/prompts", { method: "POST", body: input }).then((r) => r.prompt),
  updatePrompt: (id: string, input: { name: string; content: string }) =>
    request<{ prompt: PromptDto }>(`/api/prompts/${id}`, { method: "PATCH", body: input }).then((r) => r.prompt),
  deletePrompt: (id: string) => request<{ ok: true }>(`/api/prompts/${id}`, { method: "DELETE" }),
};
