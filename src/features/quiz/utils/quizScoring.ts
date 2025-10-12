// src/features/quiz/hooks/useQuizScoring.ts

import { Question, Quiz } from '@/features/quiz/types';
import { getAnswerTime, getMaxPoints } from '@/features/quiz/utils/quizHelpers';
import { awardedPoints, StepConfig } from '@/features/quiz/utils/pointsMath';

export function computeAwardForAnswer(
  answerId: string,
  question: Question,
  quiz: Quiz | null | undefined,
  elapsedSec: number,
  steps = 5,
) {
  const isCorrect = answerId === question.correctAnswerId;
  const totalSec = getAnswerTime(question, quiz);
  const maxForQ = getMaxPoints(question, quiz);
  const cfg: StepConfig = { base: maxForQ, steps };
  const progressElapsed =
    totalSec > 0 ? Math.max(0, Math.min(1, elapsedSec / totalSec)) : 1;
  const pts = awardedPoints(cfg, isCorrect, progressElapsed);
  return pts;
}
