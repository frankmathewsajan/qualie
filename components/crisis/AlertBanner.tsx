import { AlertTriangle } from "lucide-react";
import { Area } from "@/lib/crisis/types";

export function AlertBanner({ area }: { area: Area }) {
  return (
    <div className="border border-red-900/60 bg-red-950/20 rounded-lg px-5 py-4 flex items-start gap-4">
      <AlertTriangle className="text-red-500 w-5 h-5 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] tracking-[0.25em] text-red-500 uppercase mb-1">
          Active Incident · Priority Alpha · {area.eventType}
        </p>
        <p className="text-sm text-neutral-200 leading-relaxed">
          <span className="text-red-400 font-bold">{area.label}</span>
          {", "}
          {area.sublabel}. Emergency broadcast protocol armed. Secondary alerts routing to{" "}
          <span className="text-amber-400">{area.dispatchTo}</span>.
        </p>
      </div>
    </div>
  );
}
