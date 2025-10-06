import { useCallback, useEffect, useRef, useState } from 'react';
import { generateQuiz, onQuizCreated } from '@/features/quiz/api/quizzes';
import { watchProgress, createProgress } from '@/features/quiz/api/progress';
import type { CreationProgress } from '@/features/quiz/types';

type StartArgs = {
  quizId: string;
  prompt: string;
  numQuestions: number;
  knowledge?: string;
};

export function useQuizCreation(quizId: string, onCreated?: () => void) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<CreationProgress | null>(null);
  const [message, setMessage] = useState('Warming up');
  const [loading, setLoading] = useState(false);
  const subsRef = useRef<Array<{ unsubscribe: () => void }>>([]);

  // tidy cleanup
  useEffect(() => {
    return () => {
      subsRef.current.forEach((s) => s.unsubscribe());
      subsRef.current = [];
    };
  }, []);

  const start = useCallback(
    async ({ prompt, numQuestions, knowledge }: StartArgs) => {
      setLoading(true);
      setError(null);
      setSubmitted(true);
      // 1) Seed the progress row so observeQuery sees it on the first read

      try {
        await createProgress(quizId);
      } catch {
        // if it already exists, that's fine
      }

      // 2) Wire up realtime updates BEFORE triggering the Lambda
      subsRef.current.push(
        watchProgress(quizId).subscribe({
          next: ({ items }) => {
            const first = items[0];
            console.log('Progress query:', first);
            if (first) setProgress({ ...first });
          },
          error: (e) =>
            setError(e instanceof Error ? e : new Error('Unknown error')),
        }),
      );

      // 3) Kick off the Lambda to do the work
      try {
        await generateQuiz({ quizId, prompt, numQuestions, knowledge });
      } catch (error) {
        setSubmitted(false);
        setError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    },
    [quizId],
  );

  useEffect(() => {
    if (!submitted) return;
    const sub = onQuizCreated(quizId).subscribe({
      next: () => {
        onCreated?.();
      },
      error: (error) => console.warn('Subscription error:', error),
    });

    return () => {
      sub.unsubscribe();
    };
  }, [submitted, quizId, onCreated]);

  useEffect(() => {
    setMessage(
      progress?.message ??
        (progress?.status as string | undefined) ??
        'Warming up',
    );
  }, [progress]);

  return { start, submitted, loading, error, progress, message };
}
