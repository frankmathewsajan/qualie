import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppState, Area } from "@/lib/crisis/types";

const STATUS = {
  idle:       { dot: "bg-neutral-600",           text: "text-neutral-500", label: "Standby"        },
  processing: { dot: "bg-amber-400 animate-pulse", text: "text-amber-400",  label: "Processing"     },
  broadcast:  { dot: "bg-red-500 animate-pulse",   text: "text-red-400",    label: "Live Broadcast" },
};

export function StatusHeader({ state, area }: { state: AppState; area: Area }) {
  const cfg = STATUS[state];
  return (
    <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-red-500 w-6 h-6" />
        <div>
          <p className="text-[10px] tracking-[0.3em] text-neutral-500 uppercase">Omni-Lingual</p>
          <p className="text-sm font-bold tracking-widest uppercase">Crisis Communicator</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-[11px] text-neutral-500">{area.sublabel}</span>
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
          <span className={cn("text-[11px] tracking-widest uppercase font-bold", cfg.text)}>{cfg.label}</span>
        </div>
      </div>
    </header>
  );
}
