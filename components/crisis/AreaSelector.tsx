"use client";
import { useState, useMemo } from "react";
import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Area } from "@/lib/crisis/types";

const SEV: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high:     "bg-amber-500/10 text-amber-400 border-amber-500/30",
  medium:   "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

interface Props { areas: Area[]; selected: Area; onChange: (a: Area) => void; disabled: boolean }

export function AreaSelector({ areas, selected, onChange, disabled }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() =>
    q.trim() ? areas.filter(a =>
      [a.label, a.sublabel, a.eventType].some(s => s.toLowerCase().includes(q.toLowerCase()))
    ) : areas,
    [areas, q]
  );

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">Affected Area</span>
        </div>
        <span className="text-xs text-slate-500">{filtered.length} / {areas.length} areas</span>
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <Input
          placeholder="Search by name, district, event type…"
          value={q}
          onChange={e => setQ(e.target.value)}
          disabled={disabled}
          className="pl-8 h-8 text-xs bg-slate-800 border-slate-700 focus-visible:ring-blue-500/50"
        />
      </div>
      <div className="max-h-52 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map(a => (
          <button
            key={a.id}
            onClick={() => onChange(a)}
            disabled={disabled}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-all duration-150 group",
              "disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500",
              a.id === selected.id
                ? "border-blue-600 bg-blue-950/40 ring-1 ring-blue-600/50"
                : "border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/60",
            )}
          >
            <p className="text-xs font-semibold text-slate-100 truncate">{a.label}</p>
            <p className="text-[11px] text-slate-500 truncate">{a.sublabel}</p>
            <Badge variant="outline" className={cn("mt-1.5 text-[9px] font-bold px-1.5 py-0", SEV[a.severity])}>
              {a.severity}
            </Badge>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-3 text-xs text-slate-500 py-4 text-center">No areas match your search.</p>
        )}
      </div>
    </section>
  );
}
