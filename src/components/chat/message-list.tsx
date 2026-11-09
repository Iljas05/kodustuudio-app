"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BookOpen, Paperclip, Sofa } from "lucide-react";
import { FILE_TYPE_LABELS, formatFileSize } from "@/lib/attachment";
import { formatMessageTime } from "@/lib/format";
import { EXAMPLE_QUESTIONS } from "@/lib/mock-ai";
import type { MessageDto } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: MessageDto[];
  /** The user's message that is being sent right now (shown before the server confirms it). */
  pending: MessageDto | null;
  replying: boolean;
  loading: boolean;
  onExample: (question: string) => void;
}

export function MessageList({ messages, pending, replying, loading, onExample }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0 && !pending;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending, replying]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground" role="status">
        Laen vestlust…
      </div>
    );
  }

  if (isEmpty) return <EmptyState onExample={onExample} />;

  const shown = pending ? [...messages, pending] : messages;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label="Vestluse sõnumid">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        {shown.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        {replying && <TypingIndicator />}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function Bubble({ message }: { message: MessageDto }) {
  const isUser = message.role === "USER";
  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words shadow-sm sm:max-w-[80%]",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-bubble-assistant-border bg-bubble-assistant text-foreground",
        )}
      >
        {message.attachmentName && message.attachmentType && message.attachmentSize !== null && (
          <div
            className={cn(
              "mb-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs",
              isUser ? "bg-white/15" : "bg-white/60",
            )}
          >
            <Paperclip className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate font-medium">{message.attachmentName}</span>
            <span className="shrink-0 opacity-80">
              {FILE_TYPE_LABELS[message.attachmentType] ?? "Fail"} · {formatFileSize(message.attachmentSize)}
            </span>
          </div>
        )}
        {message.content}
      </div>
      <time className="px-1 text-xs text-muted-foreground" dateTime={message.createdAt}>
        {isUser ? "Sina" : "KoduStuudio"} · {formatMessageTime(message.createdAt)}
      </time>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start gap-1" role="status">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-bubble-assistant-border bg-bubble-assistant px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span>Kirjutab</span>
        <span className="flex gap-1" aria-hidden>
          <span className="kodu-dot size-1.5 rounded-full bg-sage" />
          <span className="kodu-dot size-1.5 rounded-full bg-sage" />
          <span className="kodu-dot size-1.5 rounded-full bg-sage" />
        </span>
      </div>
    </div>
  );
}

function EmptyState({ onExample }: { onExample: (question: string) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-10 text-center sm:py-16">
        <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-forest">
          <Sofa className="size-7" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tere tulemast KoduStuudiosse</h1>
          <p className="text-muted-foreground">
            Olen sinu virtuaalne sisustusabiline. Küsi nõu mööbli paigutuse, valguse, värvide ja kodukaunistuste kohta.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          {EXAMPLE_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onExample(question)}
              className="min-h-14 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:border-sage hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {question}
            </button>
          ))}
        </div>
        <Link
          href="/nouanded"
          className="inline-flex items-center gap-2 text-sm font-medium text-forest underline-offset-4 hover:underline"
        >
          <BookOpen className="size-4" aria-hidden />
          Sirvi kõiki sisustusnõuandeid
        </Link>
      </div>
    </div>
  );
}
