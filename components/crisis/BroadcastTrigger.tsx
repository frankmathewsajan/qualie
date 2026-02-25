"use client";
import { Radio, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppState } from "@/lib/crisis/types";

const CONFIG = {
  idle: {
    icon: <Radio className="w-10 h-10 text-red-500" />,
    label: "Initiate Global\nBroadcast",
    ring: "border-red-600 bg-red-950/40 hover:bg-red-900/50 hover:border-red-400 hover:shadow-[0_0_48px_rgba(239,68,68,0.35)] cursor-pointer",
    text: "text-red-400",
  },
  processing: {
    icon: <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />,
    label: "Routing…",
    ring: "border-amber-500 bg-amber-950/30",
    text: "text-amber-400",
  },
  broadcast: {
    icon: <CheckCircle2 className="w-10 h-10 text-green-500" />,
    label: "Broadcast\nActive",
    ring: "border-neutral-700 bg-neutral-900",
    text: "text-green-400",
  },
};

interface Props { state: AppState; onInitiate: () => void; onReset: () => void }

export function BroadcastTrigger({ state, onInitiate, onReset }: Props) {
  const cfg = CONFIG[state];
  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <button
        onClick={onInitiate}
        disabled={state !== "idle"}
        className={cn(
          "relative w-48 h-48 rounded-full border-2 transition-all duration-300",
          "flex flex-col items-center justify-center gap-3",
          "disabled:cursor-not-allowed focus:outline-none",
          cfg.ring,
        )}
      >
        {state === "processing" && (
          <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-40" />
        )}
        {cfg.icon}
        <span className={cn("text-sm font-bold tracking-widest uppercase text-center whitespace-pre-line leading-snug", cfg.text)}>
          {cfg.label}
        </span>
      </button>
      {state === "broadcast" && (
        <button
          onClick={onReset}
          className="text-[11px] tracking-widest text-neutral-600 uppercase border border-neutral-800 px-4 py-2 rounded hover:border-neutral-600 hover:text-neutral-400 transition-colors"
        >
          Reset System
        </button>
      )}
    </div>
  );
}
