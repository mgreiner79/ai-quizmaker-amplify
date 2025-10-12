// src/features/quiz/hooks/usePointsDisplay.ts
import { useEffect, useRef, useState } from 'react';
import { StepConfig, valueAtProgress } from '@/features/quiz/utils/pointsMath';

export interface UsePointsDisplayProps extends StepConfig {
  /** Progress elapsed from 0 to 1 (clamped); determines current step value. */
  progressElapsed: number;
  /** Duration in ms to keep the previous value for a fade/ghost effect; 0 to disable. Default 500ms. */
  fadeMs?: number;
}

export interface UsePointsDisplayResult {
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
export function usePointsDisplay({
  base,
  steps,
  progressElapsed,
  fadeMs = 500,
}: UsePointsDisplayProps): UsePointsDisplayResult {
  const [value, setValue] = useState<number>(base);
  const [previous, setPrevious] = useState<number | null>(null);

  // Timeout id for clearing `previous` after `fadeMs`.
  const clearRef = useRef<number | null>(null);

  useEffect(() => {
    const newValue = valueAtProgress({ base, steps }, progressElapsed);

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
