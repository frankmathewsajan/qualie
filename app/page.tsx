"use client";

import { useState, useEffect } from "react";
import {
  Radio,
  AlertTriangle,
  Globe,
  Zap,
  Activity,
  Signal,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";

type AppState = "idle" | "processing" | "broadcast";

const CARDS = [
  {
    lang: "EN",
    label: "English",
    flag: "🇬🇧",
    text: "Alert: Complete power failure detected at the hostel. Backup generators offline. Maintain calm and proceed to the designated assembly zones.",
    color: "border-red-500",
    badge: "bg-red-500/20 text-red-400 border-red-500/30",
    indicator: "bg-red-500",
  },
  {
    lang: "TE",
    label: "Telugu",
    flag: "🇮🇳",
    text: "హెచ్చరిక: హాస్టల్‌లో పూర్తి విద్యుత్ వైఫల్యం గుర్తించబడింది. బ్యాకప్ జనరేటర్లు ఆఫ్‌లైన్‌లో ఉన్నాయి. శాంతంగా ఉండి, నిర్దేశించిన సమావేశ స్థలాలకు వెళ్ళండి.",
    color: "border-amber-500",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    indicator: "bg-amber-500",
  },
  {
    lang: "ES",
    label: "Español",
    flag: "🇪🇸",
    text: "¡Atención! Falla eléctrica completa detectada en el albergue. Generadores de respaldo fuera de línea. Mantenga la calma y diríjase a las zonas de reunión designadas.",
    color: "border-green-500",
    badge: "bg-green-500/20 text-green-400 border-green-500/30",
    indicator: "bg-green-500",
  },
];

const TELEMETRY = [
  {
    time: "03:47:12Z",
    status: "OK",
    msg: "Event origin confirmed — VITAP Hostel / SRM AP, Andhra Pradesh",
  },
  {
    time: "03:47:13Z",
    status: "OK",
    msg: "Grid-failure signature matched · Severity: CRITICAL",
  },
  {
    time: "03:47:14Z",
    status: "PING",
    msg: "Secondary weather alert dispatched → Guntur District HQ",
  },
  {
    time: "03:47:14Z",
    status: "PING",
    msg: "Evacuation corridor alert dispatched → Guntur Civil Supply Office",
  },
  {
    time: "03:47:15Z",
    status: "OK",
    msg: "Zero-latency audio pipeline confirmed · 3 locales rendered",
  },
];

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [telemetryVisible, setTelemetryVisible] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (state !== "broadcast") return;
    setTelemetryVisible(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTelemetryVisible(i);
      if (i >= TELEMETRY.length) clearInterval(id);
    }, 260);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(id);
  }, []);

  const trigger = () => {
    if (state !== "idle") return;
    setState("processing");
    setTimeout(() => setState("broadcast"), 2500);
  };

  const reset = () => {
    setState("idle");
    setTelemetryVisible(0);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-mono selection:bg-red-500/30">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-500 w-6 h-6" />
          <div>
            <p className="text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
              Omni-Lingual
            </p>
            <p className="text-sm font-bold tracking-widest text-neutral-100 uppercase">
              Crisis Communicator
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-neutral-500">
            <MapPin className="w-3 h-3" />
            <span>Andhra Pradesh · India</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full transition-opacity duration-700 ${
                state === "idle"
                  ? "bg-neutral-600"
                  : state === "processing"
                  ? "bg-amber-400"
                  : pulse
                  ? "bg-red-500"
                  : "bg-red-400"
              }`}
            />
            <span
              className={`text-[11px] tracking-widest uppercase font-bold ${
                state === "idle"
                  ? "text-neutral-600"
                  : state === "processing"
                  ? "text-amber-400"
                  : "text-red-400"
              }`}
            >
              {state === "idle"
                ? "Standby"
                : state === "processing"
                ? "Processing"
                : "Live Broadcast"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center gap-12">
        {/* Event Banner */}
        <div className="w-full border border-red-900/60 bg-red-950/20 rounded-lg px-5 py-4 flex items-start gap-4">
          <AlertTriangle className="text-red-500 w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] tracking-[0.25em] text-red-500 uppercase mb-1">
              Active Incident · Priority Alpha
            </p>
            <p className="text-sm text-neutral-200 leading-relaxed">
              Catastrophic power grid failure detected at{" "}
              <span className="text-red-400 font-bold">
                VITAP Hostel / SRM AP
              </span>
              , Andhra Pradesh. Backup generators offline. Emergency broadcast
              protocol armed.
            </p>
          </div>
        </div>

        {/* Trigger */}
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={trigger}
            disabled={state !== "idle"}
            className={`relative group w-52 h-52 rounded-full border-2 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/50 disabled:cursor-not-allowed ${
              state === "idle"
                ? "border-red-600 bg-red-950/40 hover:bg-red-900/50 hover:border-red-400 hover:shadow-[0_0_48px_rgba(239,68,68,0.35)] cursor-pointer"
                : state === "processing"
                ? "border-amber-500 bg-amber-950/30"
                : "border-neutral-700 bg-neutral-900"
            }`}
          >
            {state === "processing" && (
              <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-40" />
            )}
            <span className="flex flex-col items-center justify-center gap-3">
              {state === "idle" && (
                <>
                  <Radio className="w-10 h-10 text-red-500" />
                  <span className="text-sm font-bold tracking-widest text-red-400 uppercase">
                    Initiate Global
                    <br />
                    Broadcast
                  </span>
                </>
              )}
              {state === "processing" && (
                <>
                  <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                  <span className="text-sm font-bold tracking-widest text-amber-400 uppercase">
                    Routing…
                  </span>
                </>
              )}
              {state === "broadcast" && (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                  <span className="text-sm font-bold tracking-widest text-green-400 uppercase">
                    Broadcast
                    <br />
                    Active
                  </span>
                </>
              )}
            </span>
          </button>

          {state === "broadcast" && (
            <button
              onClick={reset}
              className="text-[11px] tracking-widest text-neutral-600 uppercase border border-neutral-800 px-4 py-2 rounded hover:border-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Reset System
            </button>
          )}
        </div>

        {/* Broadcast section */}
        {state === "broadcast" && (
          <div className="w-full flex flex-col gap-8 animate-fade-in">
            {/* Locale Cards */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-neutral-500" />
                <p className="text-[11px] tracking-[0.25em] text-neutral-500 uppercase">
                  Localized Audio Transcripts · 3 Locales
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {CARDS.map((card) => (
                  <div
                    key={card.lang}
                    className={`rounded-lg border ${card.color} bg-neutral-900 p-4 flex flex-col gap-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border ${card.badge}`}
                        >
                          {card.lang}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {card.flag} {card.label}
                        </span>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full ${card.indicator} ${
                          pulse ? "opacity-100" : "opacity-60"
                        } transition-opacity duration-700`}
                      />
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {card.text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-neutral-800">
                      <Zap className="w-3 h-3 text-neutral-600" />
                      <span className="text-[10px] text-neutral-600">
                        Audio rendered · 0ms latency
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Telemetry Feed */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-neutral-500" />
                <p className="text-[11px] tracking-[0.25em] text-neutral-500 uppercase">
                  Routing Telemetry · Guntur Dispatch
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800 bg-neutral-950">
                  <Signal className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] tracking-widest text-green-500 uppercase">
                    Live Feed
                  </span>
                </div>
                <div className="divide-y divide-neutral-800/50">
                  {TELEMETRY.slice(0, telemetryVisible).map((row, i) => (
                    <div
                      key={i}
                      className="px-4 py-2.5 flex items-start gap-4 text-[11px]"
                    >
                      <span className="text-neutral-600 shrink-0 w-20">
                        {row.time}
                      </span>
                      <span
                        className={`shrink-0 font-bold tracking-widest ${
                          row.status === "OK"
                            ? "text-green-500"
                            : "text-amber-400"
                        }`}
                      >
                        [{row.status}]
                      </span>
                      <span className="text-neutral-300">{row.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-4 mt-8">
        <p className="text-center text-[10px] tracking-widest text-neutral-700 uppercase">
          Omni-Lingual Crisis Communicator · Zero-Latency Audio Pipeline · AP
          Emergency Services
        </p>
      </footer>
    </div>
  );
}
