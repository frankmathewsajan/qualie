"use client";
import { cn } from "@/lib/utils";
import { Area } from "@/lib/crisis/types";

const SEVERITY_STYLE = {
  critical: "text-red-400 border-red-900 bg-red-950/30",
  high:     "text-amber-400 border-amber-900 bg-amber-950/20",
  medium:   "text-green-400 border-green-900 bg-green-950/20",
};

interface Props {
  areas: Area[];
  selected: Area;
  onChange: (a: Area) => void;
  disabled: boolean;
}

export function AreaSelector({ areas, selected, onChange, disabled }: Props) {
  return (
    <section>
      <p className="text-[10px] tracking-[0.25em] text-neutral-500 uppercase mb-3">Select Affected Area</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {areas.map((a) => (
          <button
            key={a.id}
            onClick={() => onChange(a)}
            disabled={disabled}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-all duration-150 focus:outline-none",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              a.id === selected.id
                ? "border-red-600 bg-red-950/30 ring-1 ring-red-600/50"
                : "border-neutral-800 bg-neutral-900 hover:border-neutral-600",
            )}
          >
            <p className="text-xs font-bold text-neutral-100">{a.label}</p>
            <p className="text-[10px] text-neutral-500 mt-0.5">{a.sublabel}</p>
            <span className={cn("inline-block mt-1.5 text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded border", SEVERITY_STYLE[a.severity])}>
              {a.severity.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
