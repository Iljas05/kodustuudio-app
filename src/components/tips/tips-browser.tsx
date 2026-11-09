"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tip } from "@/lib/tips";

const ALL = "all";
const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase("et") + text.slice(1);
const lower = (text: string) => text.toLocaleLowerCase("et");

interface FilterSelectProps {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, allLabel, value, options, onChange }: FilterSelectProps) {
  const items: Record<string, string> = { [ALL]: allLabel };
  for (const option of options) items[option] = capitalize(option);
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <Select items={items} value={value} onValueChange={(next) => onChange(next ?? ALL)}>
        <SelectTrigger className="h-11 w-full bg-card" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {capitalize(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Read-only list of all tips with a text search and room/category filters. */
export function TipsBrowser({ tips }: { tips: Tip[] }) {
  const [query, setQuery] = useState("");
  const [room, setRoom] = useState(ALL);
  const [category, setCategory] = useState(ALL);

  const rooms = useMemo(() => [...new Set(tips.map((tip) => tip.room))].sort((a, b) => a.localeCompare(b, "et")), [tips]);
  const categories = useMemo(() => [...new Set(tips.map((tip) => tip.category))].sort((a, b) => a.localeCompare(b, "et")), [tips]);

  const visible = useMemo(() => {
    const needle = lower(query.trim());
    return tips.filter((tip) => {
      if (room !== ALL && tip.room !== room) return false;
      if (category !== ALL && tip.category !== category) return false;
      if (!needle) return true;
      return lower([tip.tip, tip.caveat, tip.room, tip.category, ...tip.keywords].join(" ")).includes(needle);
    });
  }, [tips, query, room, category]);

  const filtersActive = query !== "" || room !== ALL || category !== ALL;
  function clearFilters() {
    setQuery("");
    setRoom(ALL);
    setCategory(ALL);
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="tip-search" className="text-sm font-medium">
            Otsi nõuannet
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="tip-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Näiteks: vaip, valgus, kitsas"
              className="h-11 pl-9"
            />
          </div>
        </div>
        <FilterSelect label="Ruum" allLabel="Kõik ruumid" value={room} options={rooms} onChange={setRoom} />
        <FilterSelect label="Teema" allLabel="Kõik teemad" value={category} options={categories} onChange={setCategory} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" role="status">
          Kuvatud {visible.length} / {tips.length} nõuannet
        </p>
        {filtersActive && (
          <Button type="button" variant="ghost" className="h-9" onClick={clearFilters}>
            Tühista filtrid
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Otsingule ei leitud ühtegi nõuannet. Proovi teist märksõna või tühista filtrid.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((tip) => (
            <li key={tip.id}>
              <article className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge>{capitalize(tip.category)}</Badge>
                  <Badge variant="secondary">{capitalize(tip.room)}</Badge>
                </div>
                <p className="leading-relaxed">{tip.tip}</p>
                <p className="mt-auto rounded-xl bg-secondary p-3 text-sm leading-relaxed text-secondary-foreground">
                  <strong>Pane tähele:</strong> {tip.caveat}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
