import client from '@/lib/amplifyClient';

export function watchQuizzes() {
  return client.models.Quiz.observeQuery();
}

export async function deleteQuiz(id: string) {
  return client.models.Quiz.delete({ id });
}
