"use client";

import { Menu, Settings2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelSelect, PromptSelect } from "@/components/chat/settings-fields";
import type { ChatSettings, PromptDto } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  title: string;
  settings: ChatSettings;
  prompts: PromptDto[];
  settingsOpen: boolean;
  onOpenMenu: () => void;
  onToggleSettings: () => void;
  onModelChange: (model: string) => void;
  onPromptChange: (promptId: string) => void;
  onManagePrompts: () => void;
}

export function ChatHeader(props: ChatHeaderProps) {
  const { title, settings, prompts, settingsOpen } = props;
  return (
    <header className="flex min-h-14 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
      <Button type="button" variant="ghost" size="icon-lg" className="size-11 lg:hidden" onClick={props.onOpenMenu} aria-label="Ava vestluste menüü">
        <Menu aria-hidden />
      </Button>

      <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-forest">{title}</h2>

      {/* Desktop: model and prompt selectors live in the header. */}
      <div className="hidden items-center gap-2 lg:flex">
        <ModelSelect value={settings.model} onChange={props.onModelChange} className="w-44" />
        <PromptSelect settings={settings} prompts={prompts} onChange={props.onPromptChange} className="w-48" />
        <Button type="button" variant="outline" className="h-10 px-3" onClick={props.onManagePrompts}>
          <Settings2 aria-hidden /> Halda süsteemiviipasid
        </Button>
      </div>

      <Button
        type="button"
        variant={settingsOpen ? "secondary" : "outline"}
        className={cn("h-10 px-3 max-lg:size-11 max-lg:px-0")}
        onClick={props.onToggleSettings}
        aria-expanded={settingsOpen}
        aria-label="Seaded"
      >
        <SlidersHorizontal aria-hidden />
        <span className="hidden lg:inline">Seaded</span>
      </Button>
    </header>
  );
}
