import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { enforceRateLimit, guarded, json, readJson, requireValidId } from "@/lib/api";
import { getDb } from "@/lib/db";
import { validatePromptInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const NOT_FOUND = "Süsteemiviipa ei leitud.";
const BUILT_IN = "Sisseehitatud süsteemiviipasid ei saa muuta ega kustutada.";

// PATCH /api/prompts/:id - edit a custom prompt.
export const PATCH = guarded(async (request: NextRequest, { params }: Context) => {
  enforceRateLimit(request, "write");
  const { id } = await params;
  requireValidId(id, NOT_FOUND);
  const { name, content } = validatePromptInput(await readJson(request));
  const db = getDb();

  const existing = await db.systemPrompt.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, NOT_FOUND);
  if (existing.isBuiltIn) throw new ApiError(403, BUILT_IN);

  const duplicate = await db.systemPrompt.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, NOT: { id } },
  });
  if (duplicate) throw new ApiError(409, "Sellise nimega viip on juba olemas.");

  const prompt = await db.systemPrompt.update({ where: { id }, data: { name, content } });
  return json({ prompt });
});

// DELETE /api/prompts/:id - delete a custom prompt. Conversations using it fall back to the default prompt.
export const DELETE = guarded(async (request: NextRequest, { params }: Context) => {
  enforceRateLimit(request, "write");
  const { id } = await params;
  requireValidId(id, NOT_FOUND);
  const db = getDb();

  const existing = await db.systemPrompt.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, NOT_FOUND);
  if (existing.isBuiltIn) throw new ApiError(403, BUILT_IN);

  const fallback = await db.systemPrompt.findFirst({ where: { isDefault: true } });
  // One transaction: move the conversations to the default prompt first, then delete. No messages are touched.
  await db.$transaction([
    db.chatSession.updateMany({ where: { systemPromptId: id }, data: { systemPromptId: fallback?.id ?? null } }),
    db.systemPrompt.delete({ where: { id } }),
  ]);
  return json({ ok: true, fallbackPromptId: fallback?.id ?? null });
});
