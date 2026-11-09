"use client";

import { useState, type FormEvent } from "react";
import { Lock, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-error";
import { api } from "@/lib/client-api";
import { LIMITS } from "@/lib/constants";
import type { PromptDto } from "@/lib/types";
import { validatePromptInput } from "@/lib/validation";

interface PromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompts: PromptDto[];
  /** Called after any change so the parent can reload prompts and the open conversation. */
  onChanged: () => Promise<void>;
}

type FormState = { mode: "new" } | { mode: "edit"; id: string } | null;

export function PromptsDialog({ open, onOpenChange, prompts, onChanged }: PromptsDialogProps) {
  const [form, setForm] = useState<FormState>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromptDto | null>(null);

  const builtIn = prompts.filter((p) => p.isBuiltIn);
  const custom = prompts.filter((p) => !p.isBuiltIn);

  function openForm(next: FormState, prompt?: PromptDto) {
    setForm(next);
    setName(prompt?.name ?? "");
    setContent(prompt?.content ?? "");
    setError(null);
  }

  function closeForm() {
    setForm(null);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) closeForm();
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form || busy) return;

    // Check on the device first so the user gets instant feedback; the server checks again.
    let values: { name: string; content: string };
    try {
      values = validatePromptInput({ name, content });
    } catch (validationError) {
      setError(validationError instanceof ApiError ? validationError.message : "Sisend on vigane.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (form.mode === "new") await api.createPrompt(values);
      else await api.updatePrompt(form.id, values);
      await onChanged();
      closeForm();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Midagi läks valesti. Proovi uuesti.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await api.deletePrompt(deleteTarget.id);
      await onChanged();
      setDeleteTarget(null);
    } catch (requestError) {
      setDeleteTarget(null);
      setError(requestError instanceof Error ? requestError.message : "Midagi läks valesti. Proovi uuesti.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg text-forest">Halda süsteemiviipasid</DialogTitle>
            <DialogDescription>
              Süsteemiviip kirjeldab, kuidas assistent peaks vastama. Valitud viip salvestatakse koos vestlusega.
            </DialogDescription>
          </DialogHeader>

          <p className="flex gap-2 rounded-xl bg-secondary p-3 text-xs leading-relaxed">
            <Users className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
            <span>
              <strong>Jagatud demo:</strong> kohandatud viibad on nähtavad teistele külastajatele ning nemad võivad neid muuta või
              kustutada. Kohandatud viibad ning demoprofiilid Coder, Writer ja Math ei kutsu päris tehisintellekti, ei käivita
              koodi ega muuda CSV-põhist otsingut. Vastuse stiili muudavad ainult viibad Lühike, Üksikasjalik ja Algajasõbralik.
            </span>
          </p>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {form ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="prompt-name" className="text-sm font-medium">
                    Viiba nimi
                  </label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {name.length}/{LIMITS.promptNameLength}
                  </span>
                </div>
                <Input
                  id="prompt-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={LIMITS.promptNameLength}
                  placeholder="Näiteks: Minimalistlik nõuandja"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="prompt-content" className="text-sm font-medium">
                    Viiba tekst
                  </label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {content.length}/{LIMITS.promptContentLength}
                  </span>
                </div>
                <Textarea
                  id="prompt-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={LIMITS.promptContentLength}
                  rows={5}
                  placeholder="Kirjelda, kuidas assistent peaks vastama…"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="h-10" onClick={closeForm} disabled={busy}>
                  Tühista
                </Button>
                <Button type="submit" className="h-10" disabled={busy}>
                  {busy ? "Salvestan…" : form.mode === "new" ? "Lisa viip" : "Salvesta muudatused"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <section aria-labelledby="custom-prompts">
                <div className="mb-2 flex items-center justify-between">
                  <h3 id="custom-prompts" className="text-sm font-semibold">
                    Kohandatud viibad ({custom.length}/{LIMITS.maxCustomPrompts})
                  </h3>
                  <Button type="button" size="sm" className="h-9 px-3" onClick={() => openForm({ mode: "new" })}>
                    <Plus aria-hidden /> Uus viip
                  </Button>
                </div>
                {custom.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    Kohandatud viipasid veel ei ole.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {custom.map((prompt) => (
                      <li key={prompt.id} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{prompt.name}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{prompt.content}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          onClick={() => openForm({ mode: "edit", id: prompt.id }, prompt)}
                          aria-label={`Muuda viipa: ${prompt.name}`}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(prompt)}
                          aria-label={`Kustuta viip: ${prompt.name}`}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="builtin-prompts">
                <h3 id="builtin-prompts" className="mb-2 text-sm font-semibold">
                  Sisseehitatud viibad
                </h3>
                <ul className="flex flex-col gap-2">
                  {builtIn.map((prompt) => (
                    <li key={prompt.id} className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {prompt.name}
                          {prompt.style === "NONE" && <Badge variant="secondary">demo</Badge>}
                          {prompt.isDefault && <Badge>vaikimisi</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{prompt.content}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Sisseehitatud viipasid ei saa muuta ega kustutada.</p>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kustuta viip „{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Viip kustutatakse kõigi külastajate jaoks. Vestlused, mis seda viipa kasutasid, lähevad üle viibale Algajasõbralik.
              Sõnumeid ei kustutata. Seda ei saa tagasi võtta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Tühista</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()} disabled={busy}>
              {busy ? "Kustutan…" : "Kustuta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
