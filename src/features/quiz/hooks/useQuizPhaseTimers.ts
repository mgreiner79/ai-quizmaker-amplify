// src/features/quiz/hooks/useQuizPhaseTimers.ts
import { useRafCountdown } from '@/features/quiz/hooks/useRafCountdown';
import {
  getAnswerTime,
  getPreviewTime,
} from '@/features/quiz/utils/quizHelpers';
import type { Question, Quiz } from '@/features/quiz/types';

export type Phase = 'preview' | 'question' | string;

export interface UseQuizPhaseTimersResult {
  /** 0–100 percent of preview time remaining (for a progress bar). */
  previewProgressPct: number;
  /** Milliseconds remaining in the preview phase (for time displays). */
  previewRemainingMs: number;
  /** 0..1 progress of preview time elapsed (for points decay calculations). */
  previewElapsed01: number;
  /** Total preview duration in milliseconds. */
  previewDurationMs: number;
  /** 0–100 percent of question time remaining (for a progress bar). */
  questionProgressPct: number;
  /** Milliseconds remaining in the question phase (for time displays). */
  questionRemainingMs: number;
  /** 0..1 progress of question time elapsed (for points decay calculations). */
  questionElapsed01: number;
  /** Total question duration in milliseconds. */
  questionDurationMs: number;
}

/**
 * Orchestrates the timers for quiz phases:
 * - A rAF-driven countdown for the **preview** phase
 * - A rAF-driven countdown for the **question** phase

 */
export function useQuizPhaseTimers(
  phase: Phase,
  currentQuestion: Question | null | undefined,
  quiz: Quiz | null | undefined,
  onPreviewEnd?: () => void,
  onQuestionEnd?: () => void,
): UseQuizPhaseTimersResult {
  const previewDurationMs = currentQuestion
    ? getPreviewTime(currentQuestion, quiz) * 1000
    : 0;
  const questionDurationMs = currentQuestion
    ? getAnswerTime(currentQuestion, quiz) * 1000
    : 0;

  // --- Preview countdown -----------------------------------------------------
  // Active only during the preview phase, and only when a question exists.
  const previewTimer = useRafCountdown({
    active: phase === 'preview' && !!currentQuestion,
    // Helpers return seconds → convert to ms; fall back to 0 when no question.
    durationMs: previewDurationMs,
    // Changing question id restarts the preview timer.
    restartKey: currentQuestion?.id,
    onEnd: onPreviewEnd,
  });

  // --- Question countdown ----------------------------------------------------
  // Active only during the question phase, and only when a question exists.
  const questionTimer = useRafCountdown({
    active: phase === 'question' && !!currentQuestion,
    durationMs: questionDurationMs,
    // Changing question id restarts the question timer.
    restartKey: currentQuestion?.id,
    onEnd: onQuestionEnd,
  });

  return {
    // Preview progress: 0–100% (for a progress bar)
    previewProgressPct: previewTimer.progressRemaining * 100,
    previewRemainingMs: previewTimer.remainingMs,
    previewElapsed01: previewTimer.progressElapsed,
    previewDurationMs: previewDurationMs,
    // Question progress: 0–100% (for a progress bar)
    questionProgressPct: questionTimer.progressRemaining * 100,
    questionRemainingMs: questionTimer.remainingMs,
    questionElapsed01: questionTimer.progressElapsed,
    questionDurationMs: questionDurationMs,
  };
}
