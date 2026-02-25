import { useState, useCallback } from "react";
import { AppState } from "@/lib/crisis/types";

export function useBroadcastFSM() {
  const [state, setState] = useState<AppState>("idle");

  const initiate = useCallback(() => {
    if (state !== "idle") return;
    setState("processing");
    setTimeout(() => setState("broadcast"), 2500);
  }, [state]);

  const reset = useCallback(() => setState("idle"), []);

  return { state, initiate, reset };
}
