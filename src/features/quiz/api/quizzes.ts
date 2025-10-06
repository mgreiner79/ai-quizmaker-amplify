// src/features/quiz/api/quizzes.ts
import client from '@/lib/amplifyClient';
import type { Quiz } from '@/features/quiz/types';
import { unwrap } from '@/features/quiz/api/_utils';

export function watchQuizzes() {
  const response = client.models.Quiz.observeQuery();
  return response;
}

export async function deleteQuiz(id: string) {
  const response = await client.models.Quiz.delete({ id });
  return unwrap(response, 'deleteQuiz');
}

export async function getQuiz(id: string) {
  const response = await client.models.Quiz.get({ id });
  return unwrap(response, 'getQuiz');
}

export async function updateQuiz(quiz: Quiz) {
  const response = await client.models.Quiz.update(quiz);
  return unwrap(response, 'updateQuiz');
}

type QuizGenArgs = {
  quizId: string;
  prompt: string;
  numQuestions: number;
  knowledge?: string;
};

export async function generateQuiz(args: QuizGenArgs) {
  const response = await client.mutations.quizGenerator({
    quizId: args.quizId,
    prompt: args.prompt,
    numQuestions: args.numQuestions,
    knowledge: args.knowledge ?? '',
  });
  return unwrap(response, 'generateQuiz');
}

export function onQuizCreated(quizId: string) {
  const response = client.models.Quiz.onCreate({
    filter: { id: { eq: quizId } },
  });
  return response;
}
