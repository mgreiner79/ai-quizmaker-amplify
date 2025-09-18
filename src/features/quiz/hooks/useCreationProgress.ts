import { useEffect, useState } from 'react';
import {
  watchProgress,
  onProgressCreate,
  onProgressUpdate,
} from '@/features/quiz/api/progress';

import type { CreationProgress } from '@/features/quiz/types';

type Options = { initialMessage?: string };

export function useCreationProgress(quizId: string, opts: Options = {}) {
  const initialMessage = opts.initialMessage ?? 'Warming up';
  const [progress, setProgress] = useState<CreationProgress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    setError(null);

    // normalize different payload shapes from Amplify subscriptions
    const pick = (evt: any): CreationProgress | null => {
      console.log('Progress event:', evt);
      if (!evt) return null;
      if (evt.data) return evt.data as CreationProgress;
      if (evt.element) return evt.element as CreationProgress;
      // observeQuery passes { items, isSynced }, so we handle that separately
      // but if someone passed a raw model object, accept it:
      if (evt.id) return evt as CreationProgress;
      return null;
    };

    const handleErr = (err: unknown) => {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    };

    const subs: Array<{ unsubscribe: () => void }> = [];

    // 1) Subscribe to CREATE first — catches the very first row if it appears after mount
    subs.push(
      onProgressCreate(quizId).subscribe({
        next: (evt) => {
          const p = pick(evt);
          if (p) setProgress({ ...p });
          setLoading(false);
        },
        error: handleErr,
      }),
    );

    // 2) Subscribe to UPDATE — picks up subsequent patches
    subs.push(
      onProgressUpdate(quizId).subscribe({
        next: (evt) => {
          const p = pick(evt);
          if (p) setProgress({ ...p });
          setLoading(false);
        },
        error: handleErr,
      }),
    );

    // 3) ObserveQuery — initial snapshot + live (if connected in time)
    subs.push(
      watchProgress(quizId).subscribe({
        next: ({ items }) => {
          const first = items[0];
          if (first) setProgress({ ...first });
          setLoading(false);
        },
        error: handleErr,
      }),
    );

    return () => subs.forEach((s) => s.unsubscribe());
  }, [quizId]);

  const message =
    progress?.message ??
    (progress?.status as string | undefined) ??
    initialMessage;

  const status = (progress as any)?.status as string | undefined;

  return { progress, message, status, loading, error };
}
