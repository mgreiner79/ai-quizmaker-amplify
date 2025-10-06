// src/test/factories/quiz.ts
import type { Quiz, Question } from '@/features/quiz/types';

let qSeq = 0;
let quizSeq = 0;

/** Minimal, valid Question for tests, with sensible defaults. */
export function makeQuestion(overrides: Partial<Question> = {}): Question {
  const id = overrides.id ?? `Q-${++qSeq}`;
  const answerId = overrides.correctAnswerId ?? `${id}-A1`;

  return {
    id,
    text: 'Dummy question',
    previewTime: 5,
    answerTime: 20,
    maxPoints: 3000,
    correctAnswerId: answerId,
    explanation: 'Because tests.',
    answers: [{ id: answerId, text: 'Answer 1', message: '' }],
    ...overrides,
  };
}

/** Minimal, valid Quiz for tests, with all required fields. */
export function makeQuiz(
  overrides: Partial<Quiz> & { questions?: Question[] } = {},
): Quiz {
  const id = overrides.id ?? `QUIZ-${++quizSeq}`;
  const now = new Date().toISOString();

  return {
    id,
    title: 'Dummy quiz',
    description: 'A quiz used for tests',
    previewTime: 5,
    answerTime: 20,
    maxPoints: 3000,
    // Ensure at least one valid Question by default
    questions: overrides.questions ?? [makeQuestion()],
    // Optional fields can be empty/undefined; required ones must be present
    prompt: overrides.prompt ?? '',
    knowledgeFileKey: overrides.knowledgeFileKey, // optional
    owner: overrides.owner ?? 'test-user',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    // Allow any provided overrides to win
    ...overrides,
  };
}
