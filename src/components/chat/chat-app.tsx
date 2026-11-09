"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChatHeader } from "@/components/chat/chat-header";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { MessageComposer } from "@/components/chat/message-composer";
import { MessageList } from "@/components/chat/message-list";
import { PrivacyBanner } from "@/components/chat/privacy-banner";
import { PromptsDialog } from "@/components/chat/prompts-dialog";
import { SettingsFields } from "@/components/chat/settings-fields";
import { useMediaQuery } from "@/hooks/use-media-query";
import { api } from "@/lib/client-api";
import { DEFAULT_CONVERSATION_TITLE, DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_TOP_P } from "@/lib/constants";
import type { AttachmentMeta, ChatSettings, ConversationSummary, MessageDto, PromptDto } from "@/lib/types";

const TYPING_DELAY_MS = 600; // so the "Kirjutab..." indicator is visible, as in a real assistant
const BACKGROUND_REFRESH_MS = 30_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const messageOf = (error: unknown) => (error instanceof Error ? error.message : "Midagi läks valesti. Proovi uuesti.");

function freshSettings(prompts: PromptDto[]): ChatSettings {
  return {
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    topP: DEFAULT_TOP_P,
    systemPromptId: prompts.find((p) => p.isDefault)?.id ?? null,
  };
}

/** Keeps the address bar in sync (?c=<id>) so a reload reopens the same conversation. No messages are stored in the browser. */
function syncUrl(id: string | null) {
  window.history.replaceState(null, "", id ? `?c=${encodeURIComponent(id)}` : window.location.pathname);
}

export function ChatApp() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [prompts, setPrompts] = useState<PromptDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState(DEFAULT_CONVERSATION_TITLE);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [settings, setSettings] = useState<ChatSettings>(() => freshSettings([]));
  const [conversationLoading, setConversationLoading] = useState(false);
  const [pending, setPending] = useState<MessageDto | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Refs hold the latest values for async code that must not use stale state.
  const activeRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const settingsRef = useRef(settings);
  const promptsRef = useRef<PromptDto[]>([]);
  const messageCountRef = useRef(0);
  useEffect(() => {
    settingsRef.current = settings;
    promptsRef.current = prompts;
    messageCountRef.current = messages.length;
  });

  const refreshList = useCallback(async (): Promise<ConversationSummary[] | null> => {
    try {
      const list = await api.listConversations();
      setConversations(list);
      return list;
    } catch {
      return null; // background refresh: stay quiet, the next one will try again
    }
  }, []);

  const startNew = useCallback(() => {
    activeRef.current = null;
    setActiveId(null);
    setMessages([]);
    setPending(null);
    setTitle(DEFAULT_CONVERSATION_TITLE);
    setSettings(freshSettings(promptsRef.current));
    setConversationLoading(false);
    syncUrl(null);
  }, []);

  const openConversation = useCallback(
    async (id: string) => {
      activeRef.current = id;
      setActiveId(id);
      setPending(null);
      setError(null);
      setConversationLoading(true);
      syncUrl(id);
      try {
        const conversation = await api.getConversation(id);
        if (activeRef.current !== id) return; // the user already opened something else
        setMessages(conversation.messages);
        setTitle(conversation.title);
        setSettings({
          model: conversation.model,
          temperature: conversation.temperature,
          topP: conversation.topP,
          systemPromptId: conversation.systemPromptId,
        });
      } catch (requestError) {
        if (activeRef.current !== id) return;
        setError(messageOf(requestError));
        startNew();
        void refreshList();
      } finally {
        if (activeRef.current === id) setConversationLoading(false);
      }
    },
    [refreshList, startNew],
  );

  // First load: prompts, shared conversation list, and the conversation named in the address (?c=...).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [promptList, list] = await Promise.all([api.listPrompts(), api.listConversations()]);
        if (cancelled) return;
        setPrompts(promptList);
        promptsRef.current = promptList;
        setConversations(list);
        setSettings(freshSettings(promptList));
        const wanted = new URLSearchParams(window.location.search).get("c");
        if (wanted) await openConversation(wanted);
      } catch (requestError) {
        if (!cancelled) setError(messageOf(requestError));
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openConversation]);

  // Other visitors and devices share this workspace, so refresh when the tab regains focus and every 30 seconds.
  useEffect(() => {
    async function refreshEverything() {
      if (document.visibilityState !== "visible") return;
      void refreshList();
      const id = activeRef.current;
      if (!id || sendingRef.current) return;
      try {
        const conversation = await api.getConversation(id);
        if (activeRef.current !== id || sendingRef.current) return;
        if (conversation.messages.length !== messageCountRef.current) setMessages(conversation.messages);
        setTitle(conversation.title);
      } catch {
        // The conversation may have been deleted elsewhere; the list refresh will show that.
      }
    }
    const interval = setInterval(refreshEverything, BACKGROUND_REFRESH_MS);
    window.addEventListener("focus", refreshEverything);
    document.addEventListener("visibilitychange", refreshEverything);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshEverything);
      document.removeEventListener("visibilitychange", refreshEverything);
    };
  }, [refreshList]);

  const handleSend = useCallback(
    async (text: string, attachment?: AttachmentMeta): Promise<boolean> => {
      if (sendingRef.current) return false;
      sendingRef.current = true;
      setSending(true);
      setError(null);
      setPending({
        id: "pending",
        sessionId: activeRef.current ?? "",
        role: "USER",
        content: text,
        attachmentName: attachment?.name ?? null,
        attachmentType: attachment?.type ?? null,
        attachmentSize: attachment?.size ?? null,
        createdAt: new Date().toISOString(),
      });

      try {
        let id = activeRef.current;
        if (!id) {
          // The conversation is only created in the database when the first message is sent.
          const draft = settingsRef.current;
          const promptStillExists = promptsRef.current.some((p) => p.id === draft.systemPromptId);
          const created = await api.createConversation({ ...draft, systemPromptId: promptStillExists ? draft.systemPromptId : null });
          id = created.id;
          activeRef.current = id;
          setActiveId(id);
          setTitle(created.title);
          setSettings((current) => ({ ...current, systemPromptId: created.systemPromptId }));
          syncUrl(id);
        }

        const [result] = await Promise.all([api.sendMessage(id, text, attachment), wait(TYPING_DELAY_MS)]);
        if (activeRef.current === id) {
          setMessages((current) => [...current, result.userMessage, result.assistantMessage]);
        }
        setPending(null);
        const list = await refreshList();
        const updated = list?.find((conversation) => conversation.id === id);
        if (updated && activeRef.current === id) setTitle(updated.title);
        return true;
      } catch (requestError) {
        setPending(null);
        setError(messageOf(requestError));
        return false;
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [refreshList],
  );

  // ---- Settings: saved to the conversation right away (or kept as the draft until the first message) ----

  const saveSettings = useCallback(
    async (patch: Partial<ChatSettings>) => {
      const id = activeRef.current;
      if (!id) return;
      try {
        await api.updateConversation(id, patch);
        void refreshList();
      } catch (requestError) {
        setError(messageOf(requestError));
      }
    },
    [refreshList],
  );

  const handleModelChange = (model: string) => {
    setSettings((current) => ({ ...current, model }));
    void saveSettings({ model });
  };
  const handlePromptChange = (systemPromptId: string) => {
    setSettings((current) => ({ ...current, systemPromptId }));
    void saveSettings({ systemPromptId });
  };

  async function handlePromptsChanged() {
    const list = await api.listPrompts();
    setPrompts(list);
    promptsRef.current = list;
    // A deleted prompt moves its conversations to the default one, so reload the open conversation's settings.
    const id = activeRef.current;
    if (id) {
      try {
        const conversation = await api.getConversation(id);
        if (activeRef.current === id) setSettings((current) => ({ ...current, systemPromptId: conversation.systemPromptId }));
      } catch {
        // ignore: the conversation list refresh handles deleted conversations
      }
    } else {
      setSettings((current) => (list.some((p) => p.id === current.systemPromptId) ? current : freshSettings(list)));
    }
  }

  function openPromptManager() {
    if (!isDesktop) setSettingsOpen(false);
    setPromptsOpen(true);
  }

  async function confirmDeleteConversation() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteConversation(deleteTarget.id);
      if (activeRef.current === deleteTarget.id) startNew();
      await refreshList();
    } catch (requestError) {
      setError(messageOf(requestError));
      void refreshList();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const sidebar = (closeAfter: boolean) => (
    <ConversationSidebar
      conversations={conversations}
      activeId={activeId}
      loading={listLoading}
      onNew={() => {
        startNew();
        if (closeAfter) setMenuOpen(false);
      }}
      onSelect={(id) => {
        void openConversation(id);
        if (closeAfter) setMenuOpen(false);
      }}
      onDelete={setDeleteTarget}
    />
  );

  const settingsFields = (showSelectors: boolean) => (
    <SettingsFields
      settings={settings}
      prompts={prompts}
      showSelectors={showSelectors}
      onModelChange={handleModelChange}
      onPromptChange={handlePromptChange}
      onTemperatureChange={(temperature) => setSettings((current) => ({ ...current, temperature }))}
      onTemperatureCommit={(temperature) => void saveSettings({ temperature })}
      onTopPChange={(topP) => setSettings((current) => ({ ...current, topP }))}
      onTopPCommit={(topP) => void saveSettings({ topP })}
      onManagePrompts={openPromptManager}
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-background">
      <PrivacyBanner />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 border-r border-sidebar-border lg:block" aria-label="Vestlused">
          {sidebar(false)}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <ChatHeader
            title={title}
            settings={settings}
            prompts={prompts}
            settingsOpen={settingsOpen}
            onOpenMenu={() => setMenuOpen(true)}
            onToggleSettings={() => setSettingsOpen((open) => !open)}
            onModelChange={handleModelChange}
            onPromptChange={handlePromptChange}
            onManagePrompts={openPromptManager}
          />

          <div className="flex min-h-0 flex-1">
            <section className="flex min-w-0 flex-1 flex-col" aria-label="Vestlus">
              <MessageList
                messages={messages}
                pending={pending}
                replying={sending}
                loading={conversationLoading}
                onExample={(question) => void handleSend(question)}
              />

              {error && (
                <div className="border-t border-destructive/20 bg-destructive/10 px-3 py-2 sm:px-4">
                  <div className="mx-auto flex max-w-3xl items-start gap-2 text-sm text-destructive" role="alert">
                    <p className="min-w-0 flex-1">{error}</p>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="rounded-md p-1 hover:bg-destructive/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      aria-label="Sulge veateade"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}

              <MessageComposer onSend={handleSend} sending={sending} />
            </section>

            {/* Desktop: advanced settings as a collapsible side panel. */}
            {settingsOpen && (
              <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card p-5 lg:block" aria-label="Seaded">
                <h2 className="mb-4 text-base font-semibold">Seaded</h2>
                {settingsFields(false)}
              </aside>
            )}
          </div>
        </main>
      </div>

      {/* Mobile: conversation history and settings open as drawers. */}
      <Sheet open={menuOpen && !isDesktop} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[88%] max-w-sm gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Vestlused</SheetTitle>
            <SheetDescription>Jagatud vestluste ajalugu</SheetDescription>
          </SheetHeader>
          {sidebar(true)}
        </SheetContent>
      </Sheet>

      <Sheet open={settingsOpen && !isDesktop} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-[92%] max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg text-forest">Seaded</SheetTitle>
            <SheetDescription>Simuleeritud demoseaded selle vestluse jaoks.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{settingsFields(true)}</div>
        </SheetContent>
      </Sheet>

      <PromptsDialog open={promptsOpen} onOpenChange={setPromptsOpen} prompts={prompts} onChanged={handlePromptsChanged} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kustuta vestlus?</AlertDialogTitle>
            <AlertDialogDescription>
              Vestlus „{deleteTarget?.title}” ja kõik selle sõnumid kustutatakse jäädavalt. Kuna see on jagatud demo, kaob vestlus
              ka teistelt külastajatelt. Seda ei saa tagasi võtta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Tühista</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDeleteConversation()} disabled={deleting}>
              {deleting ? "Kustutan…" : "Kustuta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
