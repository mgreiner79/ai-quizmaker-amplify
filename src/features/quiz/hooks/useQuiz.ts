import { useCallback, useEffect, useState } from 'react';
import { getQuiz } from '@/features/quiz/api/quizzes';
import type { Quiz } from '@/features/quiz/types';

export function useQuiz(id?: string) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getQuiz(id);
      setQuiz(data as Quiz);
    } catch (error) {
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { quiz, loading, error, refetch };
}
