// src/features/quiz/hooks/__tests__/useQuizzes.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1) Mock the API module once. It calls a global you control per test.
vi.mock('@/features/quiz/api/quizzes', () => ({
  watchQuizzes: () => (globalThis as any).__WATCH_QUIZZES__?.(),
}));

// 2) Tiny observable subject
type Subscription = { unsubscribe(): void };
type Observer<T> = { next?: (v: T) => void; error?: (e: any) => void };
type ObservableLike<T> = { subscribe(o: Observer<T>): Subscription };

function makeSubject<T>() {
  let obs: Observer<T> | null = null;
  const unsubscribe = vi.fn();
  const observable: ObservableLike<T> = {
    subscribe(o) {
      obs = o;
      return { unsubscribe };
    },
  };
  return {
    observable,
    emit: (v: T) => obs?.next?.(v),
    fail: (e: any) => obs?.error?.(e),
    unsubscribe,
  };
}

// 3) Quiz helper
type Quiz = {
  id: string;
  title: string;
  description: string;
  previewTime: number;
  answerTime: number;
  maxPoints: number;
  questions: any[];
  owner: string;
  createdAt: string;
  updatedAt: string;
};
const q = (id: string, ts: string): Quiz => ({
  id,
  title: id,
  description: '',
  previewTime: 0,
  answerTime: 0,
  maxPoints: 0,
  questions: [],
  owner: 'o',
  createdAt: ts,
  updatedAt: ts,
});

describe('useQuizzes (module-mocked watchQuizzes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads items and sorts by createdAt desc', async () => {
    const s = makeSubject<{ items: Quiz[] }>();
    (globalThis as any).__WATCH_QUIZZES__ = () => s.observable;

    // Import AFTER mock + global are ready
    const { useQuizzes } = await import('../useQuizzes');

    const { result } = renderHook(() => useQuizzes());
    expect(result.current.loading).toBe(true);
    expect(result.current.quizzes).toEqual([]);

    act(() => s.emit({ items: [q('a', '2025-01-01'), q('b', '2025-02-01')] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quizzes.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('sets error on stream error and stops loading', async () => {
    const s = makeSubject<{ items: Quiz[] }>();
    (globalThis as any).__WATCH_QUIZZES__ = () => s.observable;

    const { useQuizzes } = await import('../useQuizzes');

    const { result } = renderHook(() => useQuizzes());
    act(() => s.fail(new Error('boom')));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toMatch(/boom/);
  });

  it('unsubscribes on unmount', async () => {
    const s = makeSubject<{ items: Quiz[] }>();
    (globalThis as any).__WATCH_QUIZZES__ = () => s.observable;

    const { useQuizzes } = await import('../useQuizzes');

    const { unmount } = renderHook(() => useQuizzes());
    unmount();
    expect(s.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
