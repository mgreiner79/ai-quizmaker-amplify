// src/features/quiz/hooks/__tests__/usePhaseTimer.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePhaseTimer } from '../usePhaseTimer';

describe('usePhaseTimer', () => {
  let now = 0;

  const advance = (ms: number) => {
    now += ms;
    vi.advanceTimersByTime(ms);
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.useRealTimers();
    (
      performance.now as unknown as { mockRestore?: () => void }
    ).mockRestore?.();
  });

  it('initializes with remainingMs value at full value', () => {
    const { result } = renderHook(() =>
      usePhaseTimer({
        active: true,
        durationMs: 5000,
      }),
    );
    expect(result.current.remainingMs).toBe(5000);
  });

  it('does not start when inactive', () => {
    const { result } = renderHook(() =>
      usePhaseTimer({
        active: false,
        durationMs: 5000,
      }),
    );
    expect(result.current.remainingMs).toBe(5000);
    expect(result.current.running).toBe(false);
  });

  it('calls onEnd exactly once and reaches remainingMs=0', () => {
    const onEnd = vi.fn();
    const { result } = renderHook(() =>
      usePhaseTimer({
        active: true,
        durationMs: 1000,
        onEnd,
        tickMs: 50,
      }),
    );
    act(() => advance(250));
    expect(result.current.remainingMs).toBe(750);
    expect(result.current.running).toBe(true);
    expect(result.current.progressElapsed).toBeCloseTo(0.25, 2);

    act(() => advance(800));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.running).toBe(false);
    expect(result.current.progressElapsed).toBe(1);

    act(() => advance(5000));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(result.current.remainingMs).toBe(0);
  });

  it('progressElapsed is clamped and monotonic', () => {
    const { result } = renderHook(() =>
      usePhaseTimer({
        active: true,
        durationMs: 300,
        tickMs: 50,
      }),
    );

    let last = result.current.progressElapsed;
    expect(last).toBeGreaterThanOrEqual(0);
    expect(last).toBeLessThanOrEqual(1);

    for (let i = 0; i < 10; i++) {
      act(() => advance(50));
      const cur = result.current.progressElapsed;
      expect(cur).toBeGreaterThanOrEqual(last - 1e-6);
      expect(cur).toBeLessThanOrEqual(1 + 1e-6);
      last = cur;
    }

    act(() => advance(500));
    expect(result.current.progressElapsed).toBe(1);
  });
});
