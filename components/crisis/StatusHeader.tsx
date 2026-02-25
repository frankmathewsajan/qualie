import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AppState, Area } from "@/lib/crisis/types";

const STATUS: Record<AppState, { variant: "default" | "secondary" | "destructive"; dot: string; label: string }> = {
  idle:       { variant: "secondary",    dot: "bg-slate-500",              label: "Standby"       },
  processing: { variant: "default",      dot: "bg-amber-400 animate-pulse", label: "Processing"    },
  broadcast:  { variant: "destructive",  dot: "bg-red-400 animate-pulse",   label: "Live Broadcast"},
};

export function StatusHeader({ state, area }: { state: AppState; area: Area }) {
  const cfg = STATUS[state];
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="text-blue-400 w-5 h-5" />
        <span className="text-sm font-semibold tracking-wide text-slate-100">CrisisComm</span>
        <span className="hidden sm:block text-xs text-slate-500">/ {area.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
        <Badge variant={cfg.variant} className="text-[10px] tracking-wider uppercase">{cfg.label}</Badge>
      </div>
    </header>
  );
}
