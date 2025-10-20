// src/features/quiz/hooks/__tests__/useUpdateQuiz.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUpdateQuiz } from '../useUpdateQuiz';
import { makeQuiz } from '@/test/factories/quiz';

const updateQuizMock = vi.fn();
vi.mock('@/features/quiz/api/quizzes', () => ({
  updateQuiz: (...args: any[]) => updateQuizMock(...args),
}));

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

describe('useUpdateQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with saving=false and error=null', () => {
    const { result } = renderHook(() => useUpdateQuiz());
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.save).toBe('function');
  });

  it('sets saving=true during request and false after success', async () => {
    const d = deferred<any>();
    updateQuizMock.mockReturnValueOnce(d.promise);

    const { result } = renderHook(() => useUpdateQuiz());

    let ret: any;
    act(() => {
      // triggers setSaving(true) synchronously, but React commits on next tick
      const p = result.current.save(sampleQuiz);
      // stash promise to await later
      (ret as any) = p;
    });

    await waitFor(() => expect(result.current.saving).toBe(true));

    d.resolve({ ok: true, id: 'Q1' });
    ret = await (ret as Promise<any>);

    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(result.current.error).toBeNull();
    expect(updateQuizMock).toHaveBeenCalledWith(sampleQuiz);
    expect(ret).toEqual({ ok: true, id: 'Q1' });
  });

  it('sets error when updateQuiz rejects', async () => {
    const err = new Error('boom');
    updateQuizMock.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useUpdateQuiz());

    await act(async () => {
      await result.current.save(sampleQuiz);
    });

    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBe(err);
  });

  it('treats response with .errors as failure', async () => {
    const err = new Error('bad');
    updateQuizMock.mockResolvedValueOnce({ errors: err });

    const { result } = renderHook(() => useUpdateQuiz());

    await act(async () => {
      await result.current.save(sampleQuiz);
    });

    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBe(err);
  });

  it('clears previous error on next attempt', async () => {
    updateQuizMock
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce({ ok: true });

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
