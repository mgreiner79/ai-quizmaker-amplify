import type { Schema } from '@/../amplify/data/resource';

export type Quiz = Schema['Quiz']['type'];
export type Question = Schema['Question']['type'];
export type Answer = Schema['Answer']['type'];
export type CreationProgress = Schema['CreationProgress']['type'];
export type QuizAttempt = Schema['QuizAttempt']['type'];

export const notNull = <T>(x: T | null | undefined): x is T => x != null;

export type QuestionDraft = Omit<Question, 'answers'> & {
  answers: Answer[];
};

export type QuizDraft = Omit<Quiz, 'questions'> & {
  questions: QuestionDraft[];
};

export function toQuizDraft(quiz: Quiz): QuizDraft {
  // 1) Clone as the raw generated type
  const base: Quiz =
    typeof globalThis.structuredClone === 'function'
      ? globalThis.structuredClone(quiz)
      : (JSON.parse(JSON.stringify(quiz)) as Quiz);

  // 2) Normalize nullables away
  const questions: QuestionDraft[] = (base.questions ?? [])
    .filter(notNull) // Question
    .map(
      (q): QuestionDraft => ({
        ...q,
        answers: (q.answers ?? []).filter(notNull), // Answer[]
      }),
    );

  // 3) Return the stricter draft type
  const { questions: _discard, ...rest } = base;
  return { ...(rest as Omit<Quiz, 'questions'>), questions };
}

type ServerFields = 'id' | 'createdAt' | 'updatedAt';

export type QuizAttemptInput = Omit<QuizAttempt, ServerFields>;
