// src/features/quiz/hooks/useRafCountdown.ts

import { useEffect, useRef, useState } from 'react';

interface UseRafCountdownProps {
  /** Start/stop & reset behavior:
   *  - true  => (re)start countdown from full duration
   *  - false => cancel loop and reset to full duration (not a pause)
   */
  active: boolean;

  /** Total countdown length in milliseconds. Changing this restarts the timer. */
  durationMs: number;

  /** Bump this value to force a fresh restart without toggling `active`
   * (e.g., increment a counter or pass a UUID).
   */
  restartKey?: any;

  /** Called exactly once when the timer reaches 0. */
  onEnd?: () => void;
}

/** Result shape returned by {@link useRafCountdown}. */
export interface UseRafCountdownResult {
  /** Live milliseconds remaining in this run. */
  remainingMs: number;
  /** Normalized remaining progress (1 → 0). */
  progressRemaining: number;
  /** Normalized elapsed progress (0 → 1). */
  progressElapsed: number;
  /** `true` while the countdown is actively ticking. */
  running: boolean;
}

/**
 * A `requestAnimationFrame`-driven countdown timer.
 *
 * @remarks
 * - **Smooth**: updates are synced to screen repaints (no jank).
 * - **Accurate**: computes from real elapsed time (`performance.now()`).
 * - **Control**:
 *   - `active=false` resets to full duration (not paused).
 *   - change `restartKey` to force a restart.
 *
 * @param props - See {@link UseRafCountdownProps}.
 * @returns {@link UseRafCountdownResult}
 *
 * @example
 * const { progressElapsed, running } = useRafCountdown({
 *   active: isPlaying,
 *   durationMs: 15000,
 *   restartKey: roundId,
 *   onEnd: () => console.log('done!')
 * });
 */
export function useRafCountdown({
  active,
  durationMs,
  restartKey,

  /** Called exactly once when the timer reaches 0. */
  onEnd,
}: UseRafCountdownProps) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [running, setRunning] = useState(false);

  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setRunning(false);
      setRemainingMs(durationMs);
      endedRef.current = false;
      return;
    }

    setRunning(true);
    startRef.current = performance.now();
    setRemainingMs(durationMs);
    endedRef.current = false;

    interface TickFunction {
      (now: number): void;
    }

    const tick: TickFunction = (now: number) => {
      const elapsed: number = now - startRef.current;
      const remaining: number = Math.max(durationMs - elapsed, 0);
      setRemainingMs(remaining);

      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!endedRef.current) {
        endedRef.current = true;
        setRunning(false);
        onEnd?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [active, durationMs, restartKey, onEnd]);

  return {
    remainingMs,
    progressRemaining: remainingMs / durationMs, // 1 → 0
    progressElapsed: 1 - remainingMs / durationMs, // 0 → 1
    running,
  };
}
