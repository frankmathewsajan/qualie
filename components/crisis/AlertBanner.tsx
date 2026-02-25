import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Area } from "@/lib/crisis/types";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "border-red-800/60 bg-red-950/30",
  high:     "border-amber-800/60 bg-amber-950/20",
  medium:   "border-blue-800/60 bg-blue-950/20",
};
const ICON_COLOR: Record<string, string> = {
  critical: "text-red-400", high: "text-amber-400", medium: "text-blue-400",
};

export function AlertBanner({ area }: { area: Area }) {
  return (
    <div className={`rounded-xl border px-5 py-4 flex items-start gap-3 ${SEVERITY_COLOR[area.severity]}`}>
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${ICON_COLOR[area.severity]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-slate-200">{area.eventType}</span>
          <Badge variant="outline" className="text-[10px]">{area.severity.toUpperCase()}</Badge>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          <span className="font-medium text-slate-100">{area.label}</span>
          {`, ${area.sublabel}. `}
          Secondary alerts routing to{" "}
          <span className="text-amber-300 font-medium">{area.dispatchTo}</span>.
        </p>
      </div>
    </div>
  );
}
