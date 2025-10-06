import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRafCountdown } from '../useRafCountdown';

describe('useRafCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with full duration and not running when active=false', () => {
    const { result } = renderHook(() =>
      useRafCountdown({ active: false, durationMs: 200 }),
    );
    expect(result.current.running).toBe(false);
    expect(result.current.remainingMs).toBe(200);
    expect(result.current.progressRemaining).toBe(1);
    expect(result.current.progressElapsed).toBe(0);
  });

  it('starts ticking when active=true and counts down over time', () => {
    const { result } = renderHook(() =>
      useRafCountdown({ active: true, durationMs: 100 }),
    );

    // Immediately after mount it should be running and near full time.
    expect(result.current.running).toBe(true);
    expect(result.current.remainingMs).toBeLessThanOrEqual(100);

    // Advance half the duration; remaining should drop.
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.remainingMs).toBeLessThan(100);
    expect(result.current.remainingMs).toBeGreaterThan(0);
    expect(result.current.progressRemaining).toBeGreaterThan(0);
    expect(result.current.progressElapsed).toBeGreaterThan(0);

    // Finish
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.running).toBe(false);
    expect(result.current.progressRemaining).toBe(0);
    expect(result.current.progressElapsed).toBe(1);
  });

  it('calls onEnd exactly once when reaching 0', () => {
    const onEnd = vi.fn();
    renderHook(() => useRafCountdown({ active: true, durationMs: 60, onEnd }));

    act(() => {
      vi.advanceTimersByTime(59);
    });
    expect(onEnd).toHaveBeenCalledTimes(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onEnd).toHaveBeenCalledTimes(1);

    // Advance more time; should not fire again
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('resets to full duration and stops when active -> false (not paused)', () => {
    const { result, rerender } = renderHook(
      (props: { active: boolean; durationMs: number }) =>
        useRafCountdown(props),
      { initialProps: { active: true, durationMs: 200 } },
    );

    act(() => {
      vi.advanceTimersByTime(80);
    });
    const mid = result.current.remainingMs;
    expect(mid).toBeLessThan(200);

    // Deactivate -> should reset remaining to full duration and not run
    rerender({ active: false, durationMs: 200 });
    expect(result.current.running).toBe(false);
    expect(result.current.remainingMs).toBe(200);
    expect(result.current.progressRemaining).toBe(1);
  });

  it('restarts when restartKey changes (without toggling active)', () => {
    const { result, rerender } = renderHook(
      (props: { keyVal: string }) =>
        useRafCountdown({
          active: true,
          durationMs: 200,
          restartKey: props.keyVal,
        }),
      { initialProps: { keyVal: 'Q1' } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    const beforeRestart = result.current.remainingMs;
    expect(beforeRestart).toBeGreaterThan(0);
    expect(beforeRestart).toBeLessThan(200);

    // Change key -> should reset to near full duration (allow a tiny tick variance)
    rerender({ keyVal: 'Q2' });
    expect(result.current.remainingMs).toBeGreaterThan(beforeRestart);
    expect(result.current.remainingMs).toBeLessThanOrEqual(200);
  });

  it('restarts when durationMs changes', () => {
    const { result, rerender } = renderHook(
      (props: { durationMs: number }) =>
        useRafCountdown({ active: true, durationMs: props.durationMs }),
      { initialProps: { durationMs: 150 } },
    );

    act(() => {
      vi.advanceTimersByTime(80);
    });
    const mid = result.current.remainingMs;
    expect(mid).toBeLessThan(150);

    // Increase total duration -> should reset remaining to the new full duration (approx)
    rerender({ durationMs: 300 });
    expect(result.current.remainingMs).toBeGreaterThan(mid);
    expect(result.current.remainingMs).toBeLessThanOrEqual(300);
  });

  it('cleans up rAF on unmount (no extra onEnd after unmount)', () => {
    const onEnd = vi.fn();
    const { unmount } = renderHook(() =>
      useRafCountdown({ active: true, durationMs: 200, onEnd }),
    );

    unmount();
    // Advance time; if cleanup failed, onEnd might still fire
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onEnd).not.toHaveBeenCalled();
  });
});
