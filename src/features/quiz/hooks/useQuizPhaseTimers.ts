// src/features/quiz/hooks/useQuizPhaseTimers.ts
import { useRafCountdown } from '@/features/quiz/hooks/useRafCountdown';
import { useDiscreteStepValue } from '@/features/quiz/hooks/useDiscreteStepValue';
import {
  getAnswerTime,
  getPreviewTime,
  getMaxPoints,
} from '@/features/quiz/utils/quizHelpers';
import type { Question, Quiz } from '@/features/quiz/types';

export type Phase = 'preview' | 'question' | string;

export interface UseQuizPhaseTimersResult {
  /** 0–100 percent of preview time remaining (for a progress bar). */
  previewProgress: number;
  /** 0–100 percent of question time remaining (for a progress bar). */
  questionProgress: number;
  /** Current points available at this moment (discrete decay). */
  maxPoints: number;
  /** Previous points value, briefly exposed for fade/ghost UI. */
  oldPoints: number | null;
}

/**
 * Orchestrates the timers for quiz phases:
 * - A rAF-driven countdown for the **preview** phase
 * - A rAF-driven countdown for the **question** phase
 * - A **discrete points decay** tied to the question timer's progress
 *
 * Durations come from quiz helpers (in **seconds**) and are converted to ms.
 * `restartKey` uses the question id so changing questions restarts both timers.
 */
export function useQuizPhaseTimers(
  phase: Phase,
  question: Question | null | undefined,
  quiz: Quiz | null | undefined,
  onPreviewEnd?: () => void,
  onQuestionEnd?: () => void,
): UseQuizPhaseTimersResult {
  // --- Preview countdown -----------------------------------------------------
  // Active only during the preview phase, and only when a question exists.
  const preview = useRafCountdown({
    active: phase === 'preview' && !!question,
    // Helpers return seconds → convert to ms; fall back to 0 when no question.
    durationMs: question ? getPreviewTime(question, quiz) * 1000 : 0,
    // Changing question id restarts the preview timer.
    restartKey: question?.id,
    onEnd: onPreviewEnd,
  });

  // --- Question countdown ----------------------------------------------------
  // Active only during the question phase, and only when a question exists.
  const questionTimer = useRafCountdown({
    active: phase === 'question' && !!question,
    durationMs: question ? getAnswerTime(question, quiz) * 1000 : 0,
    // Changing question id restarts the question timer.
    restartKey: question?.id,
    onEnd: onQuestionEnd,
  });

  // --- Points decay (discrete steps tied to question progress) ---------------
  // Base (max) points for this question; 0 when no question.
  const maxForQ = question ? getMaxPoints(question, quiz) : 0;

  // As the question timer progresses 0 → 1, drop points in 5 discrete steps.
  // `previous` lets the UI show a brief "ghost" of the last points value.
  const points = useDiscreteStepValue({
    base: maxForQ,
    steps: 5,
    progressElapsed: questionTimer.progressElapsed,
    // Optional: fadeMs defaults to 500ms in the hook; override here if needed.
    // fadeMs: 400,
  });

  return {
    // Convert normalized remaining (1→0) to percentage for progress bars.
    previewProgress: preview.progressRemaining * 100,
    questionProgress: questionTimer.progressRemaining * 100,
    maxPoints: points.value,
    oldPoints: points.previous,
  };
}
