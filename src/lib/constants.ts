// Shared limits and fixed lists. No server-only imports, so the UI can use this file too.

export const SIMULATED_MODELS = ["GPT-4", "Claude", "Local Llama"] as const;
export const DEFAULT_MODEL = "GPT-4";
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TOP_P = 1;
export const TEMPERATURE_RANGE = { min: 0, max: 2, step: 0.1 } as const;
export const TOP_P_RANGE = { min: 0, max: 1, step: 0.05 } as const;

export const DEFAULT_CONVERSATION_TITLE = "Uus vestlus";

export const LIMITS = {
  messageLength: 2000,
  titleLength: 80,
  promptNameLength: 60,
  promptContentLength: 1000,
  // Abuse protection for the shared public demo. New data is refused when a limit is reached;
  // existing conversations, messages and prompts are never deleted automatically.
  maxConversations: 50,
  maxMessagesPerConversation: 200,
  maxCustomPrompts: 20,
  maxRequestBytes: 20_000,
} as const;

export const ATTACHMENT_RULES = {
  maxBytes: 5 * 1024 * 1024, // 5 MB
  maxNameLength: 200,
  allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"],
  // Used by the file picker's "accept" attribute.
  acceptAttribute: ".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain",
} as const;
