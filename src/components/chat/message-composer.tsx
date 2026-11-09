"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { FileText, Paperclip, SendHorizonal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ATTACHMENT_DEMO_NOTICE, FILE_TYPE_LABELS, checkFile, formatFileSize,
} from "@/lib/attachment";
import { ATTACHMENT_RULES, LIMITS } from "@/lib/constants";
import type { AttachmentMeta } from "@/lib/types";

interface MessageComposerProps {
  /** Resolves to true when the message was sent, so the input can be cleared only on success. */
  onSend: (text: string, attachment?: AttachmentMeta) => Promise<boolean>;
  sending: boolean;
}

interface SelectedFile {
  meta: AttachmentMeta;
  previewUrl: string | null; // local browser preview for images only; never uploaded
}

export function MessageComposer({ onSend, sending }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Release the temporary preview address when the file is replaced, removed or the component goes away.
  const previewUrl = file?.previewUrl ?? null;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Grow the text box with its content (up to about 5 lines).
  useEffect(() => {
    const box = textareaRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, 140)}px`;
  }, [text]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = ""; // allows choosing the same file again later
    if (!picked) return;

    const result = checkFile(picked);
    if (!result.ok) {
      setFileError(result.error);
      return;
    }
    setFileError(null);
    setFile({
      meta: result.meta,
      previewUrl: result.meta.type.startsWith("image/") ? URL.createObjectURL(picked) : null,
    });
  }

  function removeFile() {
    setFile(null);
    setFileError(null);
  }

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const sent = await onSend(trimmed, file?.meta);
    if (sent) {
      setText("");
      setFile(null);
      setFileError(null);
    }
    textareaRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  const canSend = text.trim().length > 0 && !sending;

  return (
    <div className="border-t border-border bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto w-full max-w-3xl space-y-2">
        {file && (
          <div className="rounded-xl border border-border bg-card p-2.5">
            <div className="flex items-center gap-3">
              {file.previewUrl ? (
                // A plain <img> is intentional: this is a temporary local browser preview, not a hosted image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.previewUrl} alt="Valitud pildi eelvaade" className="size-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-forest">
                  <FileText className="size-6" aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.meta.name}</p>
                <p className="text-xs text-muted-foreground">
                  {FILE_TYPE_LABELS[file.meta.type] ?? "Fail"} · {formatFileSize(file.meta.size)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-lg" onClick={removeFile} aria-label="Eemalda valitud fail">
                <X aria-hidden />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{ATTACHMENT_DEMO_NOTICE}</p>
          </div>
        )}

        {fileError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {fileError}
          </p>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ATTACHMENT_RULES.acceptAttribute}
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-11 shrink-0 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Vali fail (demo: sisu ei laeta üles)"
            title="Vali fail (JPG, PNG, WebP, PDF või TXT, kuni 5 MB)"
          >
            <Paperclip aria-hidden />
          </Button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={LIMITS.messageLength}
            placeholder="Kirjuta oma sisustusküsimus…"
            aria-label="Sõnum"
            className="max-h-36 min-h-11 flex-1 resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-[0.95rem] leading-snug outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />

          <Button
            type="button"
            size="icon-lg"
            className="size-11 shrink-0 rounded-xl"
            onClick={() => void submit()}
            disabled={!canSend}
            aria-label="Saada sõnum"
          >
            <SendHorizonal aria-hidden />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Demo: vastused põhinevad valmis sisustusnõuannetel, mitte päris tehisintellektil.
        </p>
      </div>
    </div>
  );
}
