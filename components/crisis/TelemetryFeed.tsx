"use client";
import { useEffect, useMemo, useState } from "react";
import { Activity, Signal } from "lucide-react";
import { Area } from "@/lib/crisis/types";

function buildRows(area: Area) {
  const t = (s = 0) => {
    const d = new Date(Date.now() + s * 1000);
    return d.toISOString().slice(11, 19) + "Z";
  };
  return [
    { time: t(0), status: "OK",   msg: `Event origin confirmed — ${area.label}, ${area.sublabel}` },
    { time: t(1), status: "OK",   msg: `${area.eventType} matched · Severity: ${area.severity.toUpperCase()}` },
    { time: t(2), status: "PING", msg: `Secondary weather alert dispatched → ${area.dispatchTo}` },
    { time: t(3), status: "PING", msg: `Evacuation corridor alert dispatched → ${area.dispatchTo}` },
    { time: t(4), status: "OK",   msg: "Zero-latency audio pipeline confirmed · 3 locales rendered" },
  ];
}

export function TelemetryFeed({ area, active }: { area: Area; active: boolean }) {
  const rows = useMemo(() => buildRows(area), [area.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!active) { setVisible(0); return; }
    setVisible(0);
    let i = 0;
    const id = setInterval(() => { i++; setVisible(i); if (i >= rows.length) clearInterval(id); }, 300);
    return () => clearInterval(id);
  }, [active, area.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-neutral-500" />
        <p className="text-[11px] tracking-[0.25em] text-neutral-500 uppercase">
          Routing Telemetry · {area.dispatchTo}
        </p>
      </div>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800 bg-neutral-950">
          <Signal className="w-3 h-3 text-green-500" />
          <span className="text-[10px] tracking-widest text-green-500 uppercase">Live Feed</span>
        </div>
        <div className="divide-y divide-neutral-800/50">
          {rows.slice(0, visible).map((row, i) => (
            <div key={i} className="px-4 py-2.5 flex items-start gap-4 text-[11px] animate-fade-in">
              <span className="text-neutral-600 shrink-0 w-20">{row.time}</span>
              <span className={`shrink-0 font-bold tracking-widest ${row.status === "OK" ? "text-green-500" : "text-amber-400"}`}>
                [{row.status}]
              </span>
              <span className="text-neutral-300">{row.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
