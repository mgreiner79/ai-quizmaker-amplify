// src/features/quiz/utils/pointsMath.ts

export type StepConfig = {
  base: number;
  steps: number;
};

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function stepSize(cfg: StepConfig): number {
  const s = Math.max(1, Math.floor(cfg.steps)); // ensure integer >= 1
  return s > 0 ? cfg.base / s : cfg.base;
}

export function valueAtProgress(
  cfg: StepConfig,
  progressElapsed: number,
): number {
  const p = clamp01(progressElapsed);
  const s = Math.max(1, Math.floor(cfg.steps));
  const n = Math.floor(p * s);
  return Math.max(cfg.base - n * stepSize({ base: cfg.base, steps: s }), 0);
}

export function stepsPassedAtProgress(
  cfg: StepConfig,
  progressElapsed: number,
): number {
  const p = clamp01(progressElapsed);

  if (cfg.steps <= 0) return 0;

  const s = Math.max(1, Math.floor(cfg.steps));
  return Math.floor(p * s);
}

export function awardedPoints(
  cfg: StepConfig,
  isCorrect: boolean,
  progressElapsed: number,
): number {
  if (!isCorrect) return 0;
  return valueAtProgress(cfg, progressElapsed);
}
