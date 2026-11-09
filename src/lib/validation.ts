// Input validation for all API requests. Pure functions (no database, no Next.js) so they are easy to test.
// Every error message is Estonian and safe to show to the user.
import { ApiError } from "@/lib/api-error";
import { ATTACHMENT_RULES, LIMITS, SIMULATED_MODELS, TEMPERATURE_RANGE, TOP_P_RANGE } from "@/lib/constants";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
// Control characters except tab and newline.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

type Body = Record<string, unknown>;

function asObject(value: unknown): Body {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError(400, "Päringu sisu on vigane.");
  }
  return value as Body;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(CONTROL_CHARS, "").trim() : "";
}

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id);
}

// ---- System prompts ----

export function validatePromptInput(raw: unknown): { name: string; content: string } {
  const body = asObject(raw);
  const name = cleanText(body.name);
  const content = cleanText(body.content);

  if (!name) throw new ApiError(400, "Sisesta viiba nimi.");
  if (name.length > LIMITS.promptNameLength) {
    throw new ApiError(400, `Viiba nimi on liiga pikk (maksimaalselt ${LIMITS.promptNameLength} märki).`);
  }
  if (!content) throw new ApiError(400, "Sisesta viiba tekst.");
  if (content.length > LIMITS.promptContentLength) {
    throw new ApiError(400, `Viiba tekst on liiga pikk (maksimaalselt ${LIMITS.promptContentLength} märki).`);
  }
  return { name, content };
}

// ---- Conversation settings ----

export interface SettingsPatch {
  title?: string;
  model?: string;
  temperature?: number;
  topP?: number;
  systemPromptId?: string;
}

function validateNumber(value: unknown, range: { min: number; max: number }, message: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < range.min || value > range.max) {
    throw new ApiError(400, message);
  }
  return Math.round(value * 100) / 100;
}

/** Validates the optional fields of a conversation create/update request. Unknown fields are ignored. */
export function validateSettingsPatch(raw: unknown): SettingsPatch {
  const body = asObject(raw);
  const patch: SettingsPatch = {};

  if (body.title !== undefined) {
    const title = cleanText(body.title);
    if (!title) throw new ApiError(400, "Vestluse pealkiri ei tohi olla tühi.");
    if (title.length > LIMITS.titleLength) {
      throw new ApiError(400, `Vestluse pealkiri on liiga pikk (maksimaalselt ${LIMITS.titleLength} märki).`);
    }
    patch.title = title;
  }
  if (body.model !== undefined) {
    if (typeof body.model !== "string" || !(SIMULATED_MODELS as readonly string[]).includes(body.model)) {
      throw new ApiError(400, "Tundmatu mudel. Vali loendist üks demonstratsioonimudelitest.");
    }
    patch.model = body.model;
  }
  if (body.temperature !== undefined) {
    patch.temperature = validateNumber(
      body.temperature,
      TEMPERATURE_RANGE,
      `Temperatuur peab olema vahemikus ${TEMPERATURE_RANGE.min} kuni ${TEMPERATURE_RANGE.max}.`,
    );
  }
  if (body.topP !== undefined) {
    patch.topP = validateNumber(body.topP, TOP_P_RANGE, `Top-P peab olema vahemikus ${TOP_P_RANGE.min} kuni ${TOP_P_RANGE.max}.`);
  }
  if (body.systemPromptId !== undefined) {
    if (typeof body.systemPromptId !== "string" || !isValidId(body.systemPromptId)) {
      throw new ApiError(400, "Valitud süsteemiviipa ei leitud.");
    }
    patch.systemPromptId = body.systemPromptId;
  }
  return patch;
}

// ---- Messages and attachment metadata ----

export interface AttachmentMeta {
  name: string;
  type: string;
  size: number;
}

export function validateAttachment(raw: unknown): AttachmentMeta {
  const body = asObject(raw);
  // Keep only the file name: drop any folder path and control characters.
  const name = cleanText(body.name).split(/[\\/]/).pop() ?? "";
  const type = typeof body.type === "string" ? body.type.toLowerCase() : "";
  const size = body.size;

  if (!name || name.length > ATTACHMENT_RULES.maxNameLength) {
    throw new ApiError(400, "Faili nimi on vigane või liiga pikk.");
  }
  if (!(ATTACHMENT_RULES.allowedTypes as readonly string[]).includes(type)) {
    throw new ApiError(400, "Selle failitüübi valimine ei ole lubatud. Vali JPG, PNG, WebP, PDF või TXT fail.");
  }
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
    throw new ApiError(400, "Faili suurus on vigane.");
  }
  if (size > ATTACHMENT_RULES.maxBytes) {
    throw new ApiError(400, "Fail on liiga suur. Maksimaalne lubatud suurus on 5 MB.");
  }
  return { name, type, size };
}

export function validateMessageInput(raw: unknown): { content: string; attachment?: AttachmentMeta } {
  const body = asObject(raw);
  const content = cleanText(body.content);

  if (!content) throw new ApiError(400, "Kirjuta küsimus enne saatmist.");
  if (content.length > LIMITS.messageLength) {
    throw new ApiError(400, `Sõnum on liiga pikk (maksimaalselt ${LIMITS.messageLength} märki).`);
  }
  const attachment = body.attachment === undefined || body.attachment === null ? undefined : validateAttachment(body.attachment);
  return { content, attachment };
}

/** Builds a conversation title from the first user message. */
export function titleFromMessage(content: string): string {
  const singleLine = content.replace(/\s+/g, " ").trim();
  const max = 40;
  return singleLine.length > max ? `${singleLine.slice(0, max).trimEnd()}…` : singleLine;
}
