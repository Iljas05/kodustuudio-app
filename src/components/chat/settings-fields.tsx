"use client";

import { Info, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SIMULATED_MODELS, TEMPERATURE_RANGE, TOP_P_RANGE } from "@/lib/constants";
import type { ChatSettings, PromptDto } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---- Helpers ----

const decimal = (value: number, digits: number) => value.toFixed(digits).replace(".", ",");

/** The prompt that is effectively selected: the saved one, or the default if none/deleted. */
export function effectivePrompt(settings: ChatSettings, prompts: PromptDto[]): PromptDto | undefined {
  return prompts.find((p) => p.id === settings.systemPromptId) ?? prompts.find((p) => p.isDefault);
}

function promptDescription(prompt: PromptDto | undefined): string {
  if (!prompt) return "";
  if (prompt.style === "SHORT") return "Muudab vastused lühikeseks: ainult põhisoovitus.";
  if (prompt.style === "DETAILED") return "Muudab vastused üksikasjalikuks: soovitus, hoiatus ning teema ja ruum.";
  if (prompt.style === "BEGINNER") return "Muudab vastused algajasõbralikuks: lihtne selgitus ja praktiline märkus.";
  return "See viip on demonstratsiooniks. See ei muuda vastuseid ega CSV-põhist otsingut.";
}

// ---- Selectors (used in the desktop header and in the mobile settings drawer) ----

interface ModelSelectProps {
  value: string;
  onChange: (model: string) => void;
  className?: string;
}

export function ModelSelect({ value, onChange, className }: ModelSelectProps) {
  const items = Object.fromEntries(SIMULATED_MODELS.map((model) => [model, `${model} (demo)`]));
  return (
    <Select items={items} value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className={cn("h-10 bg-card", className)} aria-label="Mudel (simuleeritud demo)">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectLabel>Simuleeritud mudelid</SelectLabel>
          {SIMULATED_MODELS.map((model) => (
            <SelectItem key={model} value={model}>
              {model} (demo)
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

interface PromptSelectProps {
  settings: ChatSettings;
  prompts: PromptDto[];
  onChange: (promptId: string) => void;
  className?: string;
}

export function PromptSelect({ settings, prompts, onChange, className }: PromptSelectProps) {
  const selected = effectivePrompt(settings, prompts);
  const styleful = prompts.filter((p) => p.isBuiltIn && p.style !== "NONE");
  const demo = prompts.filter((p) => p.isBuiltIn && p.style === "NONE");
  const custom = prompts.filter((p) => !p.isBuiltIn);

  const items: Record<string, string> = {};
  for (const p of prompts) items[p.id] = p.isBuiltIn && p.style === "NONE" ? `${p.name} (demo)` : p.name;

  return (
    <Select items={items} value={selected?.id ?? null} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className={cn("h-10 bg-card", className)} aria-label="Süsteemiviip">
        <SelectValue placeholder="Vali viip" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {styleful.length > 0 && (
          <SelectGroup>
            <SelectLabel>Sisustusstiilid</SelectLabel>
            {styleful.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {demo.length > 0 && (
          <SelectGroup>
            <SelectLabel>Demoprofiilid (ei muuda vastuseid)</SelectLabel>
            {demo.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} (demo)
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {custom.length > 0 && (
          <SelectGroup>
            <SelectLabel>Jagatud kohandatud viibad</SelectLabel>
            {custom.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

// ---- Full settings block (desktop side panel and mobile drawer) ----

interface SettingsFieldsProps {
  settings: ChatSettings;
  prompts: PromptDto[];
  /** Show the model and prompt selectors too (on mobile they are not in the header). */
  showSelectors: boolean;
  onModelChange: (model: string) => void;
  onPromptChange: (promptId: string) => void;
  onTemperatureChange: (value: number) => void;
  onTemperatureCommit: (value: number) => void;
  onTopPChange: (value: number) => void;
  onTopPCommit: (value: number) => void;
  onManagePrompts: () => void;
}

export function SettingsFields(props: SettingsFieldsProps) {
  const { settings, prompts, showSelectors } = props;
  const prompt = effectivePrompt(settings, prompts);

  return (
    <div className="flex flex-col gap-6">
      <p className="flex gap-2 rounded-xl bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
        <span>
          <strong>Simuleeritud demo.</strong> Mudeli, temperatuuri ja Top-P valik salvestatakse vestlusega, kuid need ei kutsu
          päris tehisintellekti mudelit ega muuda tegelikku järeldamist.
        </span>
      </p>

      {showSelectors && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">Mudel (demo)</p>
            <ModelSelect value={settings.model} onChange={props.onModelChange} className="w-full" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Süsteemiviip</p>
            <PromptSelect settings={settings} prompts={prompts} onChange={props.onPromptChange} className="w-full" />
            <p className="text-xs text-muted-foreground">{promptDescription(prompt)}</p>
            <Button type="button" variant="outline" className="h-10 w-full" onClick={props.onManagePrompts}>
              <Settings2 aria-hidden /> Halda süsteemiviipasid
            </Button>
          </div>
        </>
      )}
      {!showSelectors && <p className="-mt-2 text-xs text-muted-foreground">{promptDescription(prompt)}</p>}

      <SliderField
        id="temperature"
        label="Temperatuur"
        valueLabel={decimal(settings.temperature, 1)}
        value={settings.temperature}
        range={TEMPERATURE_RANGE}
        onChange={props.onTemperatureChange}
        onCommit={props.onTemperatureCommit}
        help="Päris mudelis tähendaks kõrgem väärtus loovamaid vastuseid. Selles demos vastus ei muutu."
      />
      <SliderField
        id="top-p"
        label="Top-P"
        valueLabel={decimal(settings.topP, 2)}
        value={settings.topP}
        range={TOP_P_RANGE}
        onChange={props.onTopPChange}
        onCommit={props.onTopPCommit}
        help="Päris mudelis piiraks see sõnavalikut kõige tõenäolisemate sõnadega. Selles demos vastus ei muutu."
      />
    </div>
  );
}

interface SliderFieldProps {
  id: string;
  label: string;
  valueLabel: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  help: string;
}

function SliderField({ id, label, valueLabel, value, range, onChange, onCommit, help }: SliderFieldProps) {
  const first = (next: number | readonly number[]) => (Array.isArray(next) ? next[0] : (next as number));
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <label id={`${id}-label`} className="text-sm font-medium">
          {label}
        </label>
        <output htmlFor={id} aria-live="polite" className="rounded-md bg-secondary px-2 py-0.5 text-sm font-semibold tabular-nums text-forest">
          {valueLabel}
        </output>
      </div>
      <Slider
        id={id}
        aria-labelledby={`${id}-label`}
        min={range.min}
        max={range.max}
        step={range.step}
        value={[value]}
        onValueChange={(next) => onChange(first(next))}
        onValueCommitted={(next) => onCommit(first(next))}
        className="py-2"
      />
      <p className="text-xs leading-relaxed text-muted-foreground">{help}</p>
    </div>
  );
}
