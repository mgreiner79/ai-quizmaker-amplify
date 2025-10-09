// src/features/quiz/config.ts

export type QuizDefaults = {
  maxPoints: number; // per question if not specified
  answerTimeSec: number;
  previewTimeSec: number;
  decaySteps: number;
  pointsFadeMs: number;
};

export const QUIZ_DEFAULTS: Readonly<QuizDefaults> = Object.freeze({
  maxPoints: 3000,
  answerTimeSec: 20,
  previewTimeSec: 5,
  decaySteps: 5,
  pointsFadeMs: 500,
});
