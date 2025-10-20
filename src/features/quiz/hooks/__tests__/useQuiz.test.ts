// src/features/quiz/hooks/__tests__/useQuiz.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Quiz } from '@/features/quiz/types';

// 1) Module mock → calls per-test global
vi.mock('@/features/quiz/api/quizzes', () => ({
  getQuiz: (id: string) => (globalThis as any).__GET_QUIZ__?.(id),
}));

// helper: controllable promise
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const quiz = (id: string): Quiz => ({
  id,
  title: `Title ${id}`,
  description: 'd',
  previewTime: 5,
  answerTime: 20,
  maxPoints: 3000,
  questions: [],
  owner: 'owner',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
});

describe('useQuiz (module-mocked getQuiz)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no id → does nothing, loading=false, quiz=null, error=null', async () => {
    (globalThis as any).__GET_QUIZ__ = vi.fn();
    const { useQuiz } = await import('../useQuiz');

    const { result } = renderHook(() => useQuiz(undefined));
    // effect runs immediately
    expect(result.current.loading).toBe(false);
    expect(result.current.quiz).toBeNull();
    expect(result.current.error).toBeNull();
    expect((globalThis as any).__GET_QUIZ__).not.toHaveBeenCalled();

    // refetch still no-op
    await act(async () => {
      await result.current.refetch();
    });
    expect((globalThis as any).__GET_QUIZ__).not.toHaveBeenCalled();
  });

  it('success path: loads quiz and clears error', async () => {
    (globalThis as any).__GET_QUIZ__ = vi.fn().mockResolvedValue(quiz('A'));
    const { useQuiz } = await import('../useQuiz');

    const { result } = renderHook(({ id }) => useQuiz(id), {
      initialProps: { id: 'A' },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect((globalThis as any).__GET_QUIZ__).toHaveBeenCalledWith('A');
    expect(result.current.quiz?.id).toBe('A');
    expect(result.current.error).toBeNull();
  });

  it('sets loading=true while in-flight then false after resolve', async () => {
    const d = deferred<Quiz>();
    (globalThis as any).__GET_QUIZ__ = vi.fn().mockReturnValue(d.promise);
    const { useQuiz } = await import('../useQuiz');

    const { result } = renderHook(() => useQuiz('X'));
    // request started in effect
    await waitFor(() => expect(result.current.loading).toBe(true));

    act(() => {
      d.resolve(quiz('X'));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quiz?.id).toBe('X');
    expect(result.current.error).toBeNull();
  });

  it('error path: reject sets error and loading=false', async () => {
    const err = new Error('boom');
    (globalThis as any).__GET_QUIZ__ = vi.fn().mockRejectedValue(err);
    const { useQuiz } = await import('../useQuiz');

    const { result } = renderHook(() => useQuiz('E'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.quiz).toBeNull();
    expect(result.current.error).toBe(err);
  });

  it('refetch clears previous error and updates quiz', async () => {
    (globalThis as any).__GET_QUIZ__ = vi
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce(quiz('R'));

    const { useQuiz } = await import('../useQuiz');
    const { result } = renderHook(() => useQuiz('R'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);

    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.quiz?.id).toBe('R');
  });

  it('changing id triggers fetch again', async () => {
    (globalThis as any).__GET_QUIZ__ = vi
      .fn()
      .mockResolvedValueOnce(quiz('A'))
      .mockResolvedValueOnce(quiz('B'));

    const { useQuiz } = await import('../useQuiz');
    const { result, rerender } = renderHook(({ id }) => useQuiz(id), {
      initialProps: { id: 'A' },
    });

    await waitFor(() => expect(result.current.quiz?.id).toBe('A'));

    rerender({ id: 'B' });
    await waitFor(() => expect(result.current.quiz?.id).toBe('B'));

    expect((globalThis as any).__GET_QUIZ__).toHaveBeenNthCalledWith(1, 'A');
    expect((globalThis as any).__GET_QUIZ__).toHaveBeenNthCalledWith(2, 'B');
  });
});
