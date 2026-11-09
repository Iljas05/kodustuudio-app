"use client";

import Link from "next/link";
import { BookOpen, Home, MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatListDate } from "@/lib/format";
import type { ConversationSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (conversation: ConversationSummary) => void;
}

/** Brand, "Uus vestlus" button and the shared conversation history. Used in the desktop sidebar and the mobile drawer. */
export function ConversationSidebar({ conversations, activeId, loading, onNew, onSelect, onDelete }: ConversationSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Home className="size-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-base font-semibold text-forest">KoduStuudio</p>
          <p className="text-xs text-muted-foreground">Virtuaalne sisustusabiline</p>
        </div>
      </div>

      <div className="px-3 pb-3">
        <Button type="button" className="h-11 w-full rounded-xl text-sm" onClick={onNew}>
          <Plus aria-hidden /> Uus vestlus
        </Button>
      </div>

      <p className="px-4 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Jagatud vestlused</p>

      <nav aria-label="Vestluste ajalugu" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {loading && conversations.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Laen vestlusi…</p>}
        {!loading && conversations.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted-foreground">Vestlusi veel ei ole. Alusta esimese küsimusega!</p>
        )}
        <ul className="flex flex-col gap-1">
          {conversations.map((conversation) => {
            const active = conversation.id === activeId;
            return (
              <li key={conversation.id} className="group/item relative">
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-2.5 rounded-xl py-2 pr-11 pl-2.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60",
                  )}
                >
                  <MessageSquare className="size-4 shrink-0 text-sage" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{conversation.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatListDate(conversation.updatedAt)} · {conversation._count.messages} sõnumit
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(conversation)}
                  aria-label={`Kustuta vestlus: ${conversation.title}`}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/nouanded"
          className="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium text-forest transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <BookOpen className="size-4" aria-hidden /> Sisustusnõuanded
        </Link>
      </div>
    </div>
  );
}
