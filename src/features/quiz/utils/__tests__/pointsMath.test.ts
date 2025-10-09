// src/features/quiz/utils/__tests__/pointsMath.test.ts

import { describe, it, expect } from 'vitest';
import {
  clamp01,
  stepSize,
  valueAtProgress,
  stepsPassedAtProgress,
  awardedPoints,
  type StepConfig,
} from '@/features/quiz/utils/pointsMath';

describe('clamp01', () => {
  it('clamps below 0 to 0', () => {
    expect(clamp01(-100)).toBe(0);
    expect(clamp01(-0.001)).toBe(0);
  });

  it('passes through values in [0,1]', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(1)).toBe(1);
  });

  it('clamps above 1 to 1', () => {
    expect(clamp01(1.00001)).toBe(1);
    expect(clamp01(9)).toBe(1);
  });
});

describe('stepSize', () => {
  it('returns base/steps when steps > 0', () => {
    const cfg: StepConfig = { base: 3000, steps: 5 };
    expect(stepSize(cfg)).toBe(600);
  });

  it('returns base when steps <=0', () => {
    expect(stepSize({ base: 3000, steps: 0 })).toBe(3000);
    expect(stepSize({ base: 3000, steps: -5 })).toBe(3000);
  });

  it('works with base 0', () => {
    expect(stepSize({ base: 0, steps: 5 })).toBe(0);
    expect(stepSize({ base: 0, steps: 0 })).toBe(0);
  });
});

describe('stepsPassedAtProgress', () => {
  it('returns 0  at progress 0', () => {
    const cfg: StepConfig = { base: 3000, steps: 5 };
    expect(stepsPassedAtProgress(cfg, 0)).toBe(0);
  });

  it('returns floor(progress * steps), clamped to [0..steps]', () => {
    const cfg: StepConfig = { base: 3000, steps: 5 };
    expect(stepsPassedAtProgress(cfg, 0.001)).toBe(0);
    expect(stepsPassedAtProgress(cfg, 0.19)).toBe(0);
    expect(stepsPassedAtProgress(cfg, 0.2)).toBe(1);
    expect(stepsPassedAtProgress(cfg, 0.39)).toBe(1);
    expect(stepsPassedAtProgress(cfg, 0.4)).toBe(2);
    expect(stepsPassedAtProgress(cfg, 0.999)).toBe(4);
    expect(stepsPassedAtProgress(cfg, 1)).toBe(5);
  });
  it('clamps progress outside [0,1]', () => {
    const cfg: StepConfig = { base: 3000, steps: 5 };
    expect(stepsPassedAtProgress(cfg, -10)).toBe(0);
    expect(stepsPassedAtProgress(cfg, 10)).toBe(5);
  });

  it('handles steps <= 0 by always returning 0.. (base irrelevant)', () => {
    expect(stepsPassedAtProgress({ base: 3000, steps: 0 }, 0.5)).toBe(0);
    expect(stepsPassedAtProgress({ base: 3000, steps: -2 }, 1)).toBe(0);
  });
});

describe('valueAtProgress', () => {
  it('returns base at progress 0', () => {
    const cfg: StepConfig = { base: 3000, steps: 5 };
    expect(valueAtProgress(cfg, 0)).toBe(3000);
  });

  it('drops in discrete steps at thresholds', () => {
    const cfg: StepConfig = { base: 3000, steps: 5 }; // step size 600
    // thresholds at p = 0.2, 0.4, 0.6, 0.8, 1.0
    expect(valueAtProgress(cfg, 0)).toBe(3000);
    expect(valueAtProgress(cfg, 0.1999)).toBe(3000); // before first step
    expect(valueAtProgress(cfg, 0.2)).toBe(2400);
    expect(valueAtProgress(cfg, 0.3999)).toBe(2400);
    expect(valueAtProgress(cfg, 0.4)).toBe(1800);
    expect(valueAtProgress(cfg, 0.6)).toBe(1200);
    expect(valueAtProgress(cfg, 0.8)).toBe(600);
    // At exactly 1.0, all 5 steps have passed.
    expect(valueAtProgress(cfg, 1)).toBe(0);
  });

  it('clamps progress outside [0,1]', () => {
    const cfg: StepConfig = { base: 100, steps: 4 }; // step 25
    expect(valueAtProgress(cfg, -5)).toBe(100);
    expect(valueAtProgress(cfg, 2)).toBe(0);
  });

  it('handles steps = 0 (treats as one step directly to 0 at p>=1)', () => {
    const cfg: StepConfig = { base: 500, steps: 0 };
    // stepSize = base, n = floor(p*0)=0 for p<1, becomes 0 at p=1
    expect(valueAtProgress(cfg, 0)).toBe(500);
    expect(valueAtProgress(cfg, 0.5)).toBe(500);
    expect(valueAtProgress(cfg, 0.999)).toBe(500);
    expect(valueAtProgress(cfg, 1)).toBe(0);
  });

  it('works with base 0', () => {
    const cfg: StepConfig = { base: 0, steps: 5 };
    expect(valueAtProgress(cfg, 0)).toBe(0);
    expect(valueAtProgress(cfg, 0.5)).toBe(0);
    expect(valueAtProgress(cfg, 1)).toBe(0);
  });
});

describe('awardedPoints', () => {
  it('returns 0 when not correct', () => {
    const cfg: StepConfig = { base: 3000, steps: 5 };
    expect(awardedPoints(cfg, false, 0)).toBe(0);
    expect(awardedPoints(cfg, false, 0.5)).toBe(0);
    expect(awardedPoints(cfg, false, 1)).toBe(0);
  });

  it('returns valueAtProgress when correct', () => {
    const cfg: StepConfig = { base: 3000, steps: 5 }; // 600 per step
    expect(awardedPoints(cfg, true, 0)).toBe(3000);
    expect(awardedPoints(cfg, true, 0.2)).toBe(2400);
    expect(awardedPoints(cfg, true, 0.4)).toBe(1800);
    expect(awardedPoints(cfg, true, 0.6)).toBe(1200);
    expect(awardedPoints(cfg, true, 0.8)).toBe(600);
    expect(awardedPoints(cfg, true, 1)).toBe(0);
  });

  it('clamps progress for correctness awards', () => {
    const cfg: StepConfig = { base: 1000, steps: 2 }; // 500 per step
    expect(awardedPoints(cfg, true, -1)).toBe(1000);
    expect(awardedPoints(cfg, true, 3)).toBe(0);
  });
});
