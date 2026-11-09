// Client-side checks for the demo attachment. The file itself is never uploaded or stored:
// only its name, type and size are used. The server repeats the same checks.
import { ATTACHMENT_RULES } from "@/lib/constants";
import type { AttachmentMeta } from "@/lib/types";

// Some systems report an empty type for known files, so fall back to the extension.
const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
};

export const FILE_TYPE_LABELS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "application/pdf": "PDF",
  "text/plain": "TXT",
};

export const ATTACHMENT_DEMO_NOTICE = "Fail on valitud, kuid demoversioon ei analüüsi piltide ega dokumentide sisu.";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export type FileCheck = { ok: true; meta: AttachmentMeta } | { ok: false; error: string };

export function checkFile(file: { name: string; type: string; size: number }): FileCheck {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = (file.type || TYPE_BY_EXTENSION[extension] || "").toLowerCase();

  if (!(ATTACHMENT_RULES.allowedTypes as readonly string[]).includes(type)) {
    return { ok: false, error: "Selle failitüübi valimine ei ole lubatud. Vali JPG, PNG, WebP, PDF või TXT fail." };
  }
  if (file.size <= 0) {
    return { ok: false, error: "Fail on tühi. Vali mõni teine fail." };
  }
  if (file.size > ATTACHMENT_RULES.maxBytes) {
    return { ok: false, error: "Fail on liiga suur. Maksimaalne lubatud suurus on 5 MB." };
  }
  return { ok: true, meta: { name: file.name, type, size: file.size } };
}
