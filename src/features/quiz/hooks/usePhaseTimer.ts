// src/features/quiz/hooks/usePhaseTimer.ts
import { useEffect, useMemo, useRef, useState } from 'react';

type UsePhaseTimerProps = {
  /** Whether the phase is active; starting switches the timer to "running". */
  active: boolean;
  /** Total duration in milliseconds. Changing this restarts. */
  durationMs: number;
  /** Change to force a restart (e.g., question id). */
  restartKey?: string | number;
  /** Called exactly once when the timer completes. */
  onEnd?: () => void;
  /**
   * Emit progress ticks every N ms. Set to 0/undefined for a one-shot (no re-renders).
   * Typical: question=50..100ms, preview=0.
   */
  tickMs?: number;
};

export function usePhaseTimer({
  active,
  durationMs,
  restartKey,
  onEnd,
  tickMs,
}: UsePhaseTimerProps) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const startAtRef = useRef<number | null>(null);
  const endedRef = useRef(false);
  const timeoutIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);

  const onEndRef = useRef<(() => void) | undefined>();
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // restart on key/duration changes
  useEffect(() => {
    setRemainingMs(durationMs);
    startAtRef.current = null;
    endedRef.current = false;
  }, [durationMs, restartKey]);

  useEffect(() => {
    // cleanup helper
    const clear = () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    clear();

    if (!active || durationMs <= 0) return;

    const now = performance.now();
    startAtRef.current = now;
    setRemainingMs(durationMs);
    endedRef.current = false;

    timeoutIdRef.current = window.setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        setRemainingMs(0);
        onEndRef.current?.();
      }
    }, durationMs);

    if (tickMs && tickMs > 0) {
      intervalIdRef.current = window.setInterval(() => {
        if (startAtRef.current == null) return;
        const elapsed = performance.now() - startAtRef.current;
        const remaining = Math.max(durationMs - elapsed, 0);
        setRemainingMs(remaining);
        // onEnd will still be fired by the one-shot timeout above; no double fire due to endedRef.
      }, Math.max(16, Math.floor(tickMs))); // clamp to ≥1 frame (~16ms)
    }

    return clear;
  }, [active, durationMs, tickMs, restartKey]);

  const progressElapsed = useMemo(() => {
    if (durationMs <= 0) return 0;
    return 1 - Math.min(1, Math.max(0, remainingMs / durationMs));
  }, [remainingMs, durationMs]);

  return {
    remainingMs,
    progressElapsed, // 0 → 1
    progressRemaining: 1 - progressElapsed,
    durationMs,
    running: active && !endedRef.current,
  };
}
