// src/features/quiz/hooks/useStepPoints.ts
/**
 * useStepPoints
 * -------------
 * Purpose:
 *   Compute a *stepwise* points value that decreases from `base` to 0
 *   as `progressElapsed` goes 0 → 1, in `steps` discrete chunks.
 *
 * Bonus:
 *   Optionally exposes a short-lived `previous` value (ghost) for UI fades.
 *   Set `fadeMs=0` (default) to disable ghosting entirely.
 *
 * What it does NOT do:
 *   - No timekeeping. Feed it `progressElapsed` from your timer.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  StepConfig,
  stepsPassedAtProgress,
  valueAtProgress,
} from '@/features/quiz/utils/pointsMath';

export interface UseStepPointsProps extends StepConfig {
  /** Normalized progress [0..1]. 0 = full points, 1 = zero points. */
  progressElapsed: number;
  /** Keep the previous step’s value visible for ghost/fade (ms). 0 = off. Default: 0. */
  fadeMs?: number;
}

export interface UseStepPointsResult {
  value: number; // current stepwise value
  previous: number | null; // ghost of the prior step (or null if disabled/expired)
  stepIndex: number; // 0..steps
}

export function useStepPoints({
  base,
  steps,
  progressElapsed,
  fadeMs = 0, // default: no ghost
}: UseStepPointsProps): UseStepPointsResult {
  const stepIndex = useMemo(
    () => stepsPassedAtProgress({ base, steps }, progressElapsed),
    [base, steps, progressElapsed],
  );

  const targetValue = useMemo(
    () => valueAtProgress({ base, steps }, progressElapsed),
    [base, steps, progressElapsed],
  );

  const [value, setValue] = useState<number>(targetValue);
  const [previous, setPrevious] = useState<number | null>(null);

  const clearRef = useRef<number | null>(null);
  const lastStepRef = useRef<number>(stepIndex);

  useEffect(() => {
    const movedToNewStep = stepIndex !== lastStepRef.current;
    lastStepRef.current = stepIndex;

    if (movedToNewStep) {
      // Step boundary crossed: optionally show a ghost, then clear after fadeMs
      if (fadeMs > 0) setPrevious(value);
      setValue(targetValue);

      if (clearRef.current) window.clearTimeout(clearRef.current);
      if (fadeMs > 0) {
        clearRef.current = window.setTimeout(() => {
          setPrevious(null);
          clearRef.current = null;
        }, fadeMs);
      } else {
        setPrevious(null); // keep null when ghosting is disabled
        clearRef.current = null;
      }
    } else if (value !== targetValue) {
      // Inputs changed but same step (e.g., base changed): update silently.
      setValue(targetValue);
    }

    return () => {
      if (clearRef.current) {
        window.clearTimeout(clearRef.current);
        clearRef.current = null;
      }
    };
  }, [stepIndex, targetValue, fadeMs]); // intentionally exclude `value`

  return { value, previous, stepIndex };
}
