// src/features/quiz/api/quizzes.ts
import client from '@/lib/amplifyClient';
import type { Quiz } from '@/features/quiz/types';

export function watchQuizzes() {
  return client.models.Quiz.observeQuery();
}

export async function deleteQuiz(id: string) {
  return client.models.Quiz.delete({ id });
}

export async function getQuiz(id: string) {
  return (await client.models.Quiz.get({ id })).data;
}

export async function updateQuiz(quiz: Quiz) {
  return client.models.Quiz.update(quiz);
}

type QuizGenArgs = {
  quizId: string;
  prompt: string;
  numQuestions: number;
  knowledge?: string;
};

export async function generateQuiz(args: QuizGenArgs) {
  return client.mutations.quizGenerator({
    quizId: args.quizId,
    prompt: args.prompt,
    numQuestions: args.numQuestions,
    knowledge: args.knowledge ?? '',
  });
}

export function onQuizCreated(quizId: string) {
  return client.models.Quiz.onCreate({
    filter: { id: { eq: quizId } },
  });
}
