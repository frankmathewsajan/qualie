export type AppState = "idle" | "processing" | "broadcast";
export type Severity = "critical" | "high" | "medium";

export interface Area {
  id: string;
  label: string;
  sublabel: string;
  lat: number;
  lng: number;
  severity: Severity;
  eventType: string;
  dispatchTo: string;
  alerts: { en: string; te: string; es: string };
}

export interface DisasterEvent {
  id: string;
  title: string;
  date: string;
  status: string;
}
