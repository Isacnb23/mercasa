"use client";

import { useCallback, useRef, useState } from "react";
import { locate, type LocateResult } from "../geolocation";

export type UserPositionState = { status: "idle" | "asking" } | LocateResult;

// Ubicación del cliente SOLO cuando se pide (`request`, al abrir el retiro). Una sola consulta por montaje; el resultado vive en el estado del
// componente: no se envía al servidor ni se guarda.
export function useUserPosition(): { state: UserPositionState; request: () => void } {
  const [state, setState] = useState<UserPositionState>({ status: "idle" });
  const asked = useRef(false);

  const request = useCallback(() => {
    if (asked.current) return;
    asked.current = true;
    setState({ status: "asking" });
    void locate(typeof navigator !== "undefined" ? navigator.geolocation : null).then(setState);
  }, []);

  return { state, request };
}
