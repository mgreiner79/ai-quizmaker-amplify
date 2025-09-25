// src/features/quiz/api/attempts.ts
import client from '@/lib/amplifyClient';
import type { QuizAttempt, QuizAttemptInput } from '@/features/quiz/types';
import { unwrap } from '@/features/quiz/api/_utils';

export async function createQuizAttempt(
  quizAttempt: QuizAttemptInput,
): Promise<QuizAttempt> {
  const response = await client.models.QuizAttempt.create(quizAttempt, {
    authMode: 'apiKey',
  });
  return unwrap(response, 'createQuizAttempt');
}
