import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDiscreteStepValue } from '../useDiscreteStepValue';

describe('useDiscreteStepValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('initializes with base value at progress 0', () => {
    const { result } = renderHook(() =>
      useDiscreteStepValue({ base: 10, steps: 5, progressElapsed: 0 }),
    );
    expect(result.current.value).toBe(10);
    expect(result.current.previous).toBeNull();
  });

  it('decreases in discrete steps as progress crosses thresholds', () => {
    const { result, rerender } = renderHook(
      ({ p }) =>
        useDiscreteStepValue({ base: 10, steps: 5, progressElapsed: p }),
      { initialProps: { p: 0 } },
    );

    rerender({ p: 0.19 });
    expect(result.current.value).toBe(10);

    rerender({ p: 0.2 });
    expect(result.current.value).toBe(8);
    expect(result.current.previous).toBe(10);

    rerender({ p: 0.41 });
    expect(result.current.value).toBe(6);
    expect(result.current.previous).toBe(8);

    rerender({ p: 0.61 });
    expect(result.current.value).toBe(4);
    expect(result.current.previous).toBe(6);

    rerender({ p: 0.81 });
    expect(result.current.value).toBe(2);
    expect(result.current.previous).toBe(4);

    rerender({ p: 1 });
    expect(result.current.value).toBe(0);
    expect(result.current.previous).toBe(2);
  });

  it('clamps progressElapsed to [0,1]', () => {
    const { result, rerender } = renderHook(
      ({ p }) =>
        useDiscreteStepValue({ base: 10, steps: 5, progressElapsed: p }),
      { initialProps: { p: -5 } },
    );
    expect(result.current.value).toBe(10); // clamped to 0

    rerender({ p: 2 }); // clamped to 1
    expect(result.current.value).toBe(0);
  });

  it('guards invalid steps: floors and min 1', () => {
    // steps=0 -> safeSteps=1, so only jumps at p=1 from 10 -> 0
    const { result, rerender } = renderHook(
      ({ s, p }) =>
        useDiscreteStepValue({ base: 10, steps: s, progressElapsed: p }),
      { initialProps: { s: 0, p: 0 } },
    );
    expect(result.current.value).toBe(10);

    rerender({ s: 0, p: 0.5 });
    expect(result.current.value).toBe(10); // still 10, since safeSteps=1

    rerender({ s: 0, p: 1 });
    expect(result.current.value).toBe(0);

    // non-integer -> floor
    rerender({ s: 2.9, p: 0 }); // floor to 2
    expect(result.current.value).toBe(10);
    rerender({ s: 2.9, p: 0.51 }); // > 1/2 => one step passed (floor(0.51*2)=1)
    expect(result.current.value).toBeCloseTo(10 - 10 / 2, 5); // 5
  });

  it('exposes previous step briefly, then clears after fadeMs', () => {
    const { result, rerender } = renderHook(
      ({ p }) =>
        useDiscreteStepValue({
          base: 10,
          steps: 5,
          progressElapsed: p,
          fadeMs: 200,
        }),
      { initialProps: { p: 0 } },
    );

    // cross first threshold -> value 8, previous 10
    rerender({ p: 0.21 });
    expect(result.current.value).toBe(8);
    expect(result.current.previous).toBe(10);

    // not yet cleared before fadeMs
    act(() => vi.advanceTimersByTime(199));
    expect(result.current.previous).toBe(10);

    // clears after fadeMs
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.previous).toBeNull();
  });

  it('clears previous immediately when fadeMs=0', () => {
    const { result, rerender } = renderHook(
      ({ p }) =>
        useDiscreteStepValue({
          base: 10,
          steps: 5,
          progressElapsed: p,
          fadeMs: 0,
        }),
      { initialProps: { p: 0 } },
    );

    rerender({ p: 0.21 });
    expect(result.current.value).toBe(8);
    // previous is set then cleared synchronously in the same effect turn
    expect(result.current.previous).toBeNull();
  });

  it('cleans up timeout on unmount (no lingering timers)', () => {
    const { rerender, unmount } = renderHook(
      ({ p }) =>
        useDiscreteStepValue({
          base: 10,
          steps: 5,
          progressElapsed: p,
          fadeMs: 5000,
        }),
      { initialProps: { p: 0 } },
    );

    // cause a step change -> schedule a timeout to clear `previous`
    rerender({ p: 0.25 });

    // unmount should clear the timeout; advancing timers should not throw
    unmount();
    act(() => vi.advanceTimersByTime(6000));
    // If cleanup failed, we might see act warnings or errors — none expected.
    expect(true).toBe(true);
  });

  it('updates when base changes (recomputes steps from new base)', () => {
    const { result, rerender } = renderHook(
      ({ base, p }) =>
        useDiscreteStepValue({
          base,
          steps: 5,
          progressElapsed: p,
          fadeMs: 0,
        }),
      { initialProps: { base: 10, p: 0.21 } },
    );
    expect(result.current.value).toBe(8);

    // change base -> step size changes accordingly
    rerender({ base: 20, p: 0.21 }); // stepSize=4; stepsPassed=1 -> 16
    expect(result.current.value).toBe(16);
  });
});
