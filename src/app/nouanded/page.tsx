import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Home, TriangleAlert } from "lucide-react";
import { TipsBrowser } from "@/components/tips/tips-browser";
import { buttonVariants } from "@/components/ui/button";
import { loadTips, TipsDataError, type Tip } from "@/lib/tips";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sisustusnõuanded – KoduStuudio",
  description: "Sirvi KoduStuudio sisustusnõuandeid ruumi ja teema järgi.",
};

// Read at request time so a missing or broken CSV file shows a clear message instead of breaking the build.
export const dynamic = "force-dynamic";

export default function TipsPage() {
  let tips: Tip[] = [];
  let loadError: string | null = null;
  try {
    tips = loadTips();
  } catch (error) {
    loadError = error instanceof TipsDataError ? error.message : "Sisustusnõuannete laadimine ebaõnnestus.";
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Home className="size-5" aria-hidden />
          </span>
          <p className="flex-1 text-base font-semibold text-forest">KoduStuudio</p>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-10 px-3")}>
            <ArrowLeft aria-hidden /> Tagasi vestlusesse
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sisustusnõuanded</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Siin on kõik nõuanded, mille põhjal vestlusabiline vastab. Sirvi neid ruumi või teema järgi, või otsi märksõnaga.
        </p>

        {loadError ? (
          <div role="alert" className="mt-8 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>{loadError}</p>
          </div>
        ) : (
          <TipsBrowser tips={tips} />
        )}
      </main>
    </div>
  );
}
