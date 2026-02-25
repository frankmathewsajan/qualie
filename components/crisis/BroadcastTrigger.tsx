"use client";
import React from "react";
import { Radio, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppState } from "@/lib/crisis/types";

const CFG = {
  idle:       { icon: Radio,        cls: "text-blue-400",    ring: "border-blue-600 bg-blue-950/30 hover:bg-blue-900/40 hover:border-blue-400 hover:shadow-[0_0_40px_rgba(59,130,246,0.25)] cursor-pointer", label: "Initiate Global\nBroadcast", lCls: "text-blue-300",    spin: false },
  processing: { icon: Loader2,      cls: "text-amber-400",   ring: "border-amber-500 bg-amber-950/20",                                                                                                         label: "Routing\u2026",              lCls: "text-amber-400",   spin: true  },
  broadcast:  { icon: CheckCircle2, cls: "text-emerald-400", ring: "border-slate-700 bg-slate-900",                                                                                                            label: "Broadcast\nActive",         lCls: "text-emerald-400", spin: false },
} as const;

interface Props { state: AppState; onInitiate: () => void; onReset: () => void }

export function BroadcastTrigger({ state, onInitiate, onReset }: Props) {
  const { icon: Icon, cls, ring, label, lCls, spin } = CFG[state];
  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <button
        onClick={onInitiate}
        disabled={state !== "idle"}
        className={cn(
          "relative w-44 h-44 rounded-full border-2 transition-all duration-300",
          "flex flex-col items-center justify-center gap-2.5",
          "disabled:cursor-not-allowed focus:outline-none",
          ring,
        )}
      >
        {state === "processing" && <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-30" />}
        <Icon className={cn("w-9 h-9", cls, spin && "animate-spin")} />
        <span className={cn("text-xs font-semibold tracking-widest uppercase text-center whitespace-pre-line leading-snug", lCls)}>
          {label}
        </span>
      </button>
      {state === "broadcast" && (
        <Button variant="outline" size="sm" onClick={onReset} className="text-[11px] tracking-widest uppercase border-slate-700 text-slate-400 hover:text-slate-200">
          Reset System
        </Button>
      )}
    </div>
  );
}
