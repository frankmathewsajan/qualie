"use client";
import { AlertCircle, Globe, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDisasterFeed } from "@/hooks/useDisasterFeed";

export function DisasterFeed() {
  const { events, loading } = useDisasterFeed();
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="pb-3 flex-row items-center gap-2 space-y-0">
        <Globe className="w-4 h-4 text-slate-400" />
        <CardTitle className="text-sm font-medium text-slate-300">Live India Disaster Feed</CardTitle>
        <Badge variant="outline" className="ml-auto text-[10px]">ReliefWeb API</Badge>
        {loading && <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
      </CardHeader>
      <CardContent className="divide-y divide-slate-800">
        {!loading && events.length === 0 && (
          <p className="py-3 text-xs text-slate-500">No active events retrieved.</p>
        )}
        {events.map(e => (
          <div key={e.id} className="py-2.5 flex items-start gap-3">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-300">{e.title}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{e.date} · {e.status}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
