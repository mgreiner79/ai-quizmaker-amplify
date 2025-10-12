// src/features/quiz/hooks/useQuestionTimer.ts
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  active: boolean;
  durationMs: number;
  restartKey?: string | number;
  onEnd?: () => void;
  tickMs?: number;
};

export function useQuestionTimer({
  active,
  durationMs,
  restartKey,
  onEnd,
  tickMs = 50,
}: Props) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const startAtRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  // restart on key/duration changes
  useEffect(() => {
    setRemainingMs(durationMs);
    startAtRef.current = null;
    endedRef.current = false;
  }, [durationMs, restartKey]);

  useEffect(() => {
    if (!active || durationMs <= 0) return;

    const now = performance.now();
    startAtRef.current = now;
    setRemainingMs(durationMs);
    endedRef.current = false;

    const id = window.setInterval(() => {
      if (startAtRef.current == null) return;
      const elapsed = performance.now() - startAtRef.current;
      const remaining = Math.max(durationMs - elapsed, 0);
      setRemainingMs(remaining);

      if (remaining === 0 && !endedRef.current) {
        endedRef.current = true;
        onEnd?.();
      }
    }, tickMs);

    return () => window.clearInterval(id);
  }, [active, durationMs, onEnd]);

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
