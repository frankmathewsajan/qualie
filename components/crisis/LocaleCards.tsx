import { Zap } from "lucide-react";
import { Area } from "@/lib/crisis/types";

const LOCALES = [
  { key: "en" as const, lang: "EN", label: "English", flag: "🇬🇧", border: "border-red-500",   badge: "bg-red-500/20 text-red-400 border-red-500/30",   dot: "bg-red-500"   },
  { key: "te" as const, lang: "TE", label: "Telugu",  flag: "🇮🇳", border: "border-amber-500", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", dot: "bg-amber-500" },
  { key: "es" as const, lang: "ES", label: "Español", flag: "🇪🇸", border: "border-green-500", badge: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-500" },
];

export function LocaleCards({ area }: { area: Area }) {
  return (
    <section>
      <p className="text-[11px] tracking-[0.25em] text-neutral-500 uppercase mb-4">
        🌐 Localized Audio Transcripts · 3 Locales
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {LOCALES.map((l) => (
          <div key={l.key} className={`rounded-lg border ${l.border} bg-neutral-900 p-4 flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border ${l.badge}`}>{l.lang}</span>
                <span className="text-[11px] text-neutral-400">{l.flag} {l.label}</span>
              </div>
              <span className={`w-2 h-2 rounded-full animate-pulse ${l.dot}`} />
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">{area.alerts[l.key]}</p>
            <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-neutral-800">
              <Zap className="w-3 h-3 text-neutral-600" />
              <span className="text-[10px] text-neutral-600">Audio rendered · 0ms latency</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
