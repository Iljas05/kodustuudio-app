"use client";

import { useState } from "react";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Slim, always-visible notice that expands into the full privacy explanation. */
export function PrivacyBanner() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border bg-secondary text-secondary-foreground">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-2 px-3 py-1.5 text-xs sm:px-4 sm:text-sm">
        <ShieldAlert className="size-4 shrink-0 text-forest" aria-hidden />
        <p className="min-w-0 flex-1">
          <strong>Jagatud õppedemo</strong> – ära sisesta isiklikku ega konfidentsiaalset infot.
        </p>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 font-medium text-forest underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {open ? "Peida" : "Loe lähemalt"}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </div>
      {open && (
        <div className="mx-auto max-w-screen-2xl space-y-1.5 px-3 pb-3 text-xs leading-relaxed sm:px-4 sm:text-sm">
          <p>
            KoduStuudio on <strong>jagatud hariduslik demo</strong>. Kõik vestlused, sõnumid ja kohandatud
            süsteemiviibad on nähtavad teistele külastajatele ning teised võivad neid avada, muuta või kustutada. Sisselogimist ei ole.
          </p>
          <p>
            Ära sisesta nimesid, aadresse, telefoninumbreid ega muud isiklikku või konfidentsiaalset infot. Valitud faili sisu ei
            laeta üles ega salvestata – andmebaasi jõuab ainult faili nimi, tüüp ja suurus. Vastused tulevad valmis
            sisustusnõuannetest, mitte päris tehisintellektist.
          </p>
        </div>
      )}
    </div>
  );
}
