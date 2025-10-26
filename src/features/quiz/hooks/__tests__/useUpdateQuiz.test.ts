// src/features/quiz/hooks/__tests__/useUpdateQuiz.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Quiz } from '@/features/quiz/types';
import { makeQuiz } from '@/test/factories/quiz';

// 1) Module mock that calls a global you set per test
vi.mock('@/features/quiz/api/quizzes', () => ({
  updateQuiz: (q: Quiz) => (globalThis as any).__UPDATE_QUIZ__?.(q),
}));

// Helper: controllable promise
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const sampleQuiz = makeQuiz({ id: 'Q1' });

describe('useUpdateQuiz (module-mocked updateQuiz)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success path: returns value, clears error, saving false', async () => {
    (globalThis as any).__UPDATE_QUIZ__ = vi
      .fn()
      .mockResolvedValue({ ok: true, id: 'Q1' });
    const { useUpdateQuiz } = await import('../useUpdateQuiz');

    const { result } = renderHook(() => useUpdateQuiz());
    let ret: any;
    await act(async () => {
      ret = await result.current.save(sampleQuiz);
    });

    expect((globalThis as any).__UPDATE_QUIZ__).toHaveBeenCalledWith(
      sampleQuiz,
    );
    expect(result.current.error).toBeNull();
    expect(result.current.saving).toBe(false);
    expect(ret).toEqual({ ok: true, id: 'Q1' });
  });

  it('sets saving=true while request is in flight, then false after resolve', async () => {
    const d = deferred<any>();
    (globalThis as any).__UPDATE_QUIZ__ = vi.fn().mockReturnValue(d.promise);
    const { useUpdateQuiz } = await import('../useUpdateQuiz');

    const { result } = renderHook(() => useUpdateQuiz());

    act(() => {
      void result.current.save(sampleQuiz);
    });
    await waitFor(() => expect(result.current.saving).toBe(true));

    act(() => {
      d.resolve({ ok: true });
    });
    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('propagates reject into error state', async () => {
    const err = new Error('boom');
    (globalThis as any).__UPDATE_QUIZ__ = vi.fn().mockRejectedValue(err);
    const { useUpdateQuiz } = await import('../useUpdateQuiz');

    const { result } = renderHook(() => useUpdateQuiz());
    await act(async () => {
      await result.current.save(sampleQuiz);
    });

    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBe(err);
  });

  it('treats `{errors}` payload as failure and sets error', async () => {
    const err = new Error('bad');
    (globalThis as any).__UPDATE_QUIZ__ = vi
      .fn()
      .mockResolvedValue({ errors: err });
    const { useUpdateQuiz } = await import('../useUpdateQuiz');

    const { result } = renderHook(() => useUpdateQuiz());
    await act(async () => {
      await result.current.save(sampleQuiz);
    });

    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBe(err);
  });

  it('clears previous error on next attempt', async () => {
    (globalThis as any).__UPDATE_QUIZ__ = vi
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce({ ok: true });

    const { useUpdateQuiz } = await import('../useUpdateQuiz');
    const { result } = renderHook(() => useUpdateQuiz());

    await act(async () => {
      await result.current.save(sampleQuiz);
    });
    expect(result.current.error).toBeInstanceOf(Error);

    await act(async () => {
      await result.current.save(sampleQuiz);
    });
    expect(result.current.error).toBeNull();
  });
});
