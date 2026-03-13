"use client";
import { useEffect, useMemo, useState } from "react";
import { Activity, Signal } from "lucide-react";
import { Area } from "@/lib/crisis/types";

const buildRows = (area: Area) => {
  const t = (s = 0) => new Date(Date.now() + s * 1000).toISOString().slice(11, 19) + "Z";
  return [
    { time: t(0), ok: true,  msg: `Origin confirmed -- ${area.label}, ${area.sublabel}` },
    { time: t(1), ok: true,  msg: `${area.eventType} - Severity: ${area.severity.toUpperCase()}` },
    { time: t(2), ok: false, msg: `Weather alert dispatched to ${area.dispatchTo}` },
    { time: t(3), ok: false, msg: `Evacuation alert dispatched to ${area.dispatchTo}` },
    { time: t(4), ok: true,  msg: "Audio pipeline confirmed - 3 locales rendered" },
  ];
};

export function TelemetryFeed({ area, active }: { area: Area; active: boolean }) {
  const rows = useMemo(() => buildRows(area), [area.id]); // eslint-disable-line
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    if (!active) return;
    let i = 0;
    const id = setInterval(() => { i++; setVisible(i); if (i >= rows.length) clearInterval(id); }, 300);
    return () => clearInterval(id);
  }, [active, area.id]); // eslint-disable-line

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-950">
        <Activity className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs font-medium text-slate-400">Routing Log</span>
        <Signal className="w-3 h-3 text-emerald-500 ml-auto animate-pulse" />
      </div>
      <div className="divide-y divide-slate-800/50 font-mono">
        {rows.slice(0, visible).map((row, i) => (
          <div key={i} className="px-4 py-2 flex items-start gap-4 text-[11px] animate-fade-in">
            <span className="text-slate-600 shrink-0 w-20">{row.time}</span>
            <span className={`shrink-0 font-bold ${row.ok ? "text-emerald-500" : "text-amber-400"}`}>
              [{row.ok ? "OK" : "PING"}]
            </span>
            <span className="text-slate-400">{row.msg}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
