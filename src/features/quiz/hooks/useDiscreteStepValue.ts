// src/features/quiz/hooks/useDiscreteStepValue.ts
import { useEffect, useRef, useState } from 'react';

export interface UseDiscreteStepValueProps {
  /** Starting value before any steps are taken (e.g., 10). */
  base: number;
  /** How many discrete steps to move from base → 0 (must be > 0). */
  steps: number;
  /** Normalized progress from 0 → 1 (e.g., from useRafCountdown.progressElapsed). */
  progressElapsed: number;
  /** How long to keep exposing the previous step value (ms) for fade/ghost UI. */
  fadeMs?: number;
}

export interface UseDiscreteStepValueResult {
  /** Current stepwise value (decreases from base to 0 in `steps` chunks). */
  value: number;
  /** The previous step value, kept briefly for a fade/ghost effect; null when expired. */
  previous: number | null;
}

/**
 * Reduces a `base` value in `steps` discrete chunks as `progressElapsed` goes 0 → 1.
 * Also exposes a short-lived `previous` value so UIs can animate a fade/ghost of the last step.
 *
 * Example: base=10, steps=5  -> values: 10, 8, 6, 4, 2, 0 as progress crosses each 1/5th.
 */
export function useDiscreteStepValue({
  base,
  steps,
  progressElapsed,
  fadeMs = 500,
}: UseDiscreteStepValueProps): UseDiscreteStepValueResult {
  const [value, setValue] = useState<number>(base);
  const [previous, setPrevious] = useState<number | null>(null);

  // Timeout id for clearing `previous` after `fadeMs`.
  const clearRef = useRef<number | null>(null);

  useEffect(() => {
    // Defensive guards
    const safeSteps = Math.max(1, Math.floor(steps)); // avoid /0 and non-integers
    const clampedProgress = Math.min(1, Math.max(0, progressElapsed));

    // Compute discrete step size and current stepped value
    const stepSize = base / safeSteps;
    const stepsPassed = Math.floor(clampedProgress * safeSteps);
    const newValue = Math.max(base - stepsPassed * stepSize, 0);

    setValue((prev) => {
      if (prev !== newValue) {
        // Record the previous value for a brief fade/ghost in the UI
        setPrevious(prev);

        // Clear any existing timeout, then schedule clearing `previous`
        if (clearRef.current) window.clearTimeout(clearRef.current);
        if (fadeMs > 0) {
          clearRef.current = window.setTimeout(() => setPrevious(null), fadeMs);
        } else {
          // If fadeMs is 0, clear immediately
          setPrevious(null);
          clearRef.current = null;
        }
      }
      return newValue;
    });

    // Cleanup on deps change/unmount: clear the pending timeout
    return () => {
      if (clearRef.current) {
        window.clearTimeout(clearRef.current);
        clearRef.current = null;
      }
    };
  }, [base, steps, progressElapsed, fadeMs]);

  return { value, previous };
}
