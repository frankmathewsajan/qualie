import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Area } from "@/lib/crisis/types";

const LOCALES = [
  { key: "en" as const, lang: "EN", label: "English", flag: "🇬🇧", border: "border-slate-700",   badgeCls: "bg-blue-500/10 text-blue-400 border-blue-500/30",   dot: "bg-blue-400"   },
  { key: "te" as const, lang: "TE", label: "Telugu",  flag: "🇮🇳", border: "border-slate-700",   badgeCls: "bg-amber-500/10 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
  { key: "es" as const, lang: "ES", label: "Español", flag: "🇪🇸", border: "border-slate-700",   badgeCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
];

export function LocaleCards({ area }: { area: Area }) {
  return (
    <section>
      <p className="text-xs font-medium text-slate-400 mb-3">🌐 Localized Transcripts — 3 locales</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {LOCALES.map(l => (
          <Card key={l.key} className={`${l.border} bg-slate-900`}>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] font-bold ${l.badgeCls}`}>{l.lang}</Badge>
                <span className="text-[11px] text-slate-400">{l.flag} {l.label}</span>
              </div>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${l.dot}`} />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-300 leading-relaxed">{area.alerts[l.key]}</p>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-800">
                <Zap className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] text-slate-600">Audio rendered · 0ms latency</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
