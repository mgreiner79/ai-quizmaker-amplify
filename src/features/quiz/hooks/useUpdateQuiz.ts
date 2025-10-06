import { useCallback, useState } from 'react';
import { updateQuiz } from '@/features/quiz/api/quizzes';
import type { Quiz } from '@/features/quiz/types';

export function useUpdateQuiz() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const save = useCallback(async (q: Quiz) => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateQuiz(q);
      if ((res as any)?.errors) throw (res as any).errors;
      return res;
    } catch (error) {
      setError(error as Error);
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, error, save };
}
