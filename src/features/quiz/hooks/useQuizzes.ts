import { useEffect, useMemo, useState } from 'react';
import { watchQuizzes } from '@/features/quiz/api/quizzes';
import type { Schema } from '@/../amplify/data/resource';

export type Quiz = Schema['Quiz']['type'];

type State = {
  quizzes: Quiz[];
  loading: boolean;
  error: Error | null;
};

export function useQuizzes(): State {
  const [items, setItems] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const sub = watchQuizzes().subscribe({
      next: ({ items }) => {
        setItems([...(items as Quiz[])]);
        setLoading(false);
      },
      error: (err) => {
        setError(err);
        setLoading(false);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  const quizzes = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [items],
  );

  return { quizzes, loading, error };
}
