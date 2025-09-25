import { useState, useCallback } from 'react';
import type { QuizAttemptInput } from '@/features/quiz/types';
import { createQuizAttempt } from '@/features/quiz/api/attempts';

export function useCreateAttempt() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAttempt = useCallback(async (quizAttempt: QuizAttemptInput) => {
    setSaving(true);
    setError(null);
    try {
      const result = await createQuizAttempt(quizAttempt);
      return result;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setSaving(false);
    }
  }, []);

  return { createAttempt, saving, error };
}
