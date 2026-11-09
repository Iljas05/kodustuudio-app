import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { enforceRateLimit, guarded, json, readJson } from "@/lib/api";
import {
  DEFAULT_CONVERSATION_TITLE,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  LIMITS,
} from "@/lib/constants";
import { getDb } from "@/lib/db";
import { validateSettingsPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/conversations - the shared conversation list, newest activity first.
export const GET = guarded(async (request: NextRequest) => {
  enforceRateLimit(request, "read");
  const conversations = await getDb().chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    take: LIMITS.maxConversations + 10,
    select: {
      id: true,
      title: true,
      model: true,
      temperature: true,
      topP: true,
      systemPromptId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  return json({ conversations });
});

// POST /api/conversations - start a new conversation. Settings are optional; defaults are used otherwise.
export const POST = guarded(async (request: NextRequest) => {
  enforceRateLimit(request, "write");
  const patch = validateSettingsPatch(await readJson(request, { allowEmpty: true }));
  const db = getDb();

  const total = await db.chatSession.count();
  if (total >= LIMITS.maxConversations) {
    throw new ApiError(409, `Vestluste piirmäär (${LIMITS.maxConversations}) on täis. Kustuta mõni vana vestlus, et uus alustada.`);
  }

  // New conversations use the chosen prompt, or the default one (Algajasõbralik).
  const prompt = patch.systemPromptId
    ? await db.systemPrompt.findUnique({ where: { id: patch.systemPromptId } })
    : await db.systemPrompt.findFirst({ where: { isDefault: true } });
  if (patch.systemPromptId && !prompt) throw new ApiError(400, "Valitud süsteemiviipa ei leitud.");

  const conversation = await db.chatSession.create({
    data: {
      title: patch.title ?? DEFAULT_CONVERSATION_TITLE,
      model: patch.model ?? DEFAULT_MODEL,
      temperature: patch.temperature ?? DEFAULT_TEMPERATURE,
      topP: patch.topP ?? DEFAULT_TOP_P,
      systemPromptId: prompt?.id ?? null,
    },
  });
  return json({ conversation }, 201);
});
