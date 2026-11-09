import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { enforceRateLimit, guarded, json, readJson, requireValidId } from "@/lib/api";
import { getDb } from "@/lib/db";
import { validateSettingsPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const NOT_FOUND = "Vestlust ei leitud.";

// GET /api/conversations/:id - one conversation with its messages and prompt.
export const GET = guarded(async (request: NextRequest, { params }: Context) => {
  enforceRateLimit(request, "read");
  const { id } = await params;
  requireValidId(id, NOT_FOUND);

  const conversation = await getDb().chatSession.findUnique({
    where: { id },
    include: { systemPrompt: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) throw new ApiError(404, NOT_FOUND);
  return json({ conversation });
});

// PATCH /api/conversations/:id - change title, simulated model, temperature, top-p or system prompt.
export const PATCH = guarded(async (request: NextRequest, { params }: Context) => {
  enforceRateLimit(request, "write");
  const { id } = await params;
  requireValidId(id, NOT_FOUND);
  const patch = validateSettingsPatch(await readJson(request));
  if (Object.keys(patch).length === 0) throw new ApiError(400, "Muudatusi ei ole.");
  const db = getDb();

  if (patch.systemPromptId && !(await db.systemPrompt.findUnique({ where: { id: patch.systemPromptId } }))) {
    throw new ApiError(400, "Valitud süsteemiviipa ei leitud.");
  }
  if (!(await db.chatSession.findUnique({ where: { id }, select: { id: true } }))) throw new ApiError(404, NOT_FOUND);

  const conversation = await db.chatSession.update({ where: { id }, data: patch });
  return json({ conversation });
});

// DELETE /api/conversations/:id - delete one conversation (its messages are deleted with it).
export const DELETE = guarded(async (request: NextRequest, { params }: Context) => {
  enforceRateLimit(request, "write");
  const { id } = await params;
  requireValidId(id, NOT_FOUND);
  const db = getDb();

  if (!(await db.chatSession.findUnique({ where: { id }, select: { id: true } }))) throw new ApiError(404, NOT_FOUND);
  await db.chatSession.delete({ where: { id } });
  return json({ ok: true });
});
