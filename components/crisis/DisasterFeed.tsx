"use client";
import { AlertCircle, Globe, Loader2 } from "lucide-react";
import { useDisasterFeed } from "@/hooks/useDisasterFeed";

export function DisasterFeed() {
  const { events, loading } = useDisasterFeed();
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
      <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-950 flex items-center gap-2">
        <Globe className="w-3 h-3 text-neutral-500" />
        <span className="text-[10px] tracking-widest text-neutral-500 uppercase">
          Live India Disaster Feed · ReliefWeb API
        </span>
        {loading && <Loader2 className="w-3 h-3 text-neutral-600 animate-spin ml-auto" />}
      </div>
      <div className="divide-y divide-neutral-800/50">
        {!loading && events.length === 0 && (
          <p className="px-4 py-3 text-[11px] text-neutral-600">No active events retrieved.</p>
        )}
        {events.map((e) => (
          <div key={e.id} className="px-4 py-2.5 flex items-start gap-3 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-neutral-300">{e.title}</p>
              <p className="text-neutral-600 mt-0.5">{e.date} · {e.status}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
