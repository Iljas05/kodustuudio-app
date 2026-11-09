import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { enforceRateLimit, guarded, json, readJson } from "@/lib/api";
import { LIMITS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { validatePromptInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/prompts - all system prompts, built-in ones first.
export const GET = guarded(async (request: NextRequest) => {
  enforceRateLimit(request, "read");
  const prompts = await getDb().systemPrompt.findMany({
    orderBy: [{ isBuiltIn: "desc" }, { createdAt: "asc" }],
  });
  return json({ prompts });
});

// POST /api/prompts - create a custom prompt (cosmetic only: it never changes the mock replies).
export const POST = guarded(async (request: NextRequest) => {
  enforceRateLimit(request, "write");
  const { name, content } = validatePromptInput(await readJson(request));
  const db = getDb();

  const customCount = await db.systemPrompt.count({ where: { isBuiltIn: false } });
  if (customCount >= LIMITS.maxCustomPrompts) {
    throw new ApiError(409, `Kohandatud viipade piirmäär (${LIMITS.maxCustomPrompts}) on täis. Kustuta mõni vana viip.`);
  }
  const duplicate = await db.systemPrompt.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (duplicate) throw new ApiError(409, "Sellise nimega viip on juba olemas.");

  const prompt = await db.systemPrompt.create({ data: { name, content, isBuiltIn: false, isDefault: false } });
  return json({ prompt }, 201);
});
