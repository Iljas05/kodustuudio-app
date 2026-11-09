// Shapes of the JSON returned by the API (dates arrive as ISO strings).

export type PromptStyle = "SHORT" | "DETAILED" | "BEGINNER" | "NONE";

export interface PromptDto {
  id: string;
  key: string | null;
  name: string;
  content: string;
  style: PromptStyle;
  isBuiltIn: boolean;
  isDefault: boolean;
}

export interface MessageDto {
  id: string;
  sessionId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  temperature: number;
  topP: number;
  systemPromptId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export interface ConversationDetail {
  id: string;
  title: string;
  model: string;
  temperature: number;
  topP: number;
  systemPromptId: string | null;
  systemPrompt: PromptDto | null;
  createdAt: string;
  updatedAt: string;
  messages: MessageDto[];
}

/** The simulated settings that belong to one conversation (or to the draft of a new one). */
export interface ChatSettings {
  model: string;
  temperature: number;
  topP: number;
  systemPromptId: string | null;
}

export interface AttachmentMeta {
  name: string;
  type: string;
  size: number;
}
