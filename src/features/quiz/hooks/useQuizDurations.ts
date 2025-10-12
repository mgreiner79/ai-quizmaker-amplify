// src/features/quiz/hooks/useQuizDurations.ts
import { useMemo } from 'react';
import type { Quiz, Question } from '@/features/quiz/types';
import {
  getPreviewTime,
  getAnswerTime,
} from '@/features/quiz/utils/quizHelpers';

export function useQuizDurations(
  q: Question | null | undefined,
  quiz: Quiz | null | undefined,
) {
  return useMemo(() => {
    const previewDurationMs = q ? getPreviewTime(q, quiz) * 1000 : 0;
    const questionDurationMs = q ? getAnswerTime(q, quiz) * 1000 : 0;
    return { previewDurationMs, questionDurationMs };
  }, [q, quiz]);
}
