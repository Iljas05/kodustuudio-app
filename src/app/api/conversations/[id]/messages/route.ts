import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { enforceRateLimit, guarded, json, readJson, requireValidId } from "@/lib/api";
import { DEFAULT_CONVERSATION_TITLE, LIMITS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { generateReply, type ReplyStyle } from "@/lib/mock-ai";
import { loadTips } from "@/lib/tips";
import { titleFromMessage, validateMessageInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// POST /api/conversations/:id/messages - save the question, generate the mock AI reply, save the reply too.
// Only attachment METADATA (name, type, size) is accepted and stored; file contents never reach the server.
export const POST = guarded(async (request: NextRequest, { params }: Context) => {
  enforceRateLimit(request, "message");
  const { id } = await params;
  requireValidId(id, "Vestlust ei leitud.");
  const { content, attachment } = validateMessageInput(await readJson(request));
  const db = getDb();

  const conversation = await db.chatSession.findUnique({
    where: { id },
    include: { systemPrompt: true, _count: { select: { messages: true } } },
  });
  if (!conversation) throw new ApiError(404, "Vestlust ei leitud.");
  if (conversation._count.messages >= LIMITS.maxMessagesPerConversation) {
    throw new ApiError(409, `Selles vestluses on sõnumite piirmäär (${LIMITS.maxMessagesPerConversation}) täis. Alusta uut vestlust.`);
  }

  // If the conversation's prompt was deleted, fall back to the default prompt.
  const prompt = conversation.systemPrompt ?? (await db.systemPrompt.findFirst({ where: { isDefault: true } }));
  const style: ReplyStyle = prompt?.style ?? "BEGINNER";
  const reply = generateReply(content, loadTips(), { style, hasAttachment: Boolean(attachment) });

  // Explicit, ordered timestamps so the reply always sorts after the question.
  const askedAt = new Date();
  const answeredAt = new Date(askedAt.getTime() + 1);
  const isFirstMessage = conversation._count.messages === 0;

  const [userMessage, assistantMessage] = await db.$transaction([
    db.message.create({
      data: {
        sessionId: id,
        role: "USER",
        content,
        createdAt: askedAt,
        attachmentName: attachment?.name ?? null,
        attachmentType: attachment?.type ?? null,
        attachmentSize: attachment?.size ?? null,
      },
    }),
    db.message.create({ data: { sessionId: id, role: "ASSISTANT", content: reply.text, createdAt: answeredAt } }),
    db.chatSession.update({
      where: { id },
      data: isFirstMessage && conversation.title === DEFAULT_CONVERSATION_TITLE ? { title: titleFromMessage(content) } : {},
    }),
  ]);

  return json({ userMessage, assistantMessage, replyKind: reply.kind }, 201);
});
