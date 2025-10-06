// src/features/quiz/utils/quizHelpers.ts

import { Question, Quiz } from '@/features/quiz/types';
import { QUIZ_DEFAULTS } from '@/features/quiz/config';

export const getPreviewTime = (
  q: Question | null,
  quiz: Quiz | null | undefined,
): number =>
  q?.previewTime ?? quiz?.previewTime ?? QUIZ_DEFAULTS.previewTimeSec;

export const getAnswerTime = (
  q: Question | null,
  quiz: Quiz | null | undefined,
): number => q?.answerTime ?? quiz?.answerTime ?? QUIZ_DEFAULTS.answerTimeSec;

export const getMaxPoints = (
  q: Question | null,
  quiz: Quiz | null | undefined,
): number => q?.maxPoints ?? quiz?.maxPoints ?? QUIZ_DEFAULTS.maxPoints;
