import { useCallback, useEffect, useRef, useState } from "react";
import type { ServerEvent, ClientEvent } from "../types";

export function useIPC(onEvent: (event: ServerEvent) => void) {
  const [connected, setConnected] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep onEventRef in sync
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    // Subscribe to server events
    const unsubscribe = window.electron.onServerEvent((event: ServerEvent) => {
      onEventRef.current(event);
    });

    unsubscribeRef.current = unsubscribe;

    // Set connected state in the next tick to avoid setState during effect
    const timeoutId = setTimeout(() => {
      setConnected(true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setConnected(false);
    };
  }, []);

  const sendEvent = useCallback((event: ClientEvent) => {
    window.electron.sendClientEvent(event);
  }, []);

  return { connected, sendEvent };
}
