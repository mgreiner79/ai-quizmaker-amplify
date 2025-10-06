import { describe, it, expect, vi } from 'vitest';

// Mock the defaults so tests are deterministic and not tied to real config values
vi.mock('@/features/quiz/config', () => ({
  QUIZ_DEFAULTS: Object.freeze({
    maxPoints: 9999,
    answerTimeSec: 42,
    previewTimeSec: 7,
  }),
}));

// Import AFTER the mock so helpers read the mocked defaults
import { getPreviewTime, getAnswerTime, getMaxPoints } from '../quizHelpers';

describe('quizHelpers', () => {
  const QUIZ: any = { maxPoints: 2000, answerTime: 25, previewTime: 6 };
  const Q: any = { maxPoints: 1500, answerTime: 15, previewTime: 4 };

  it('getMaxPoints: question > quiz > defaults', () => {
    expect(getMaxPoints(Q, QUIZ)).toBe(1500); // question wins
    expect(getMaxPoints(null, QUIZ)).toBe(2000); // quiz fallback
    expect(getMaxPoints(null, null)).toBe(9999); // defaults (mocked)
  });

  it('getAnswerTime: question > quiz > defaults', () => {
    expect(getAnswerTime(Q, QUIZ)).toBe(15); // question wins
    expect(getAnswerTime(null, QUIZ)).toBe(25); // quiz fallback
    expect(getAnswerTime(null, null)).toBe(42); // defaults (mocked)
  });

  it('getPreviewTime: question > quiz > defaults', () => {
    expect(getPreviewTime(Q, QUIZ)).toBe(4); // question wins
    expect(getPreviewTime(null, QUIZ)).toBe(6); // quiz fallback
    expect(getPreviewTime(null, null)).toBe(7); // defaults (mocked)
  });

  it('respects 0 values on question (nullish coalescing should not override)', () => {
    const Q0: any = { maxPoints: 0, answerTime: 0, previewTime: 0 };
    expect(getMaxPoints(Q0, QUIZ)).toBe(0);
    expect(getAnswerTime(Q0, QUIZ)).toBe(0);
    expect(getPreviewTime(Q0, QUIZ)).toBe(0);
  });

  it('respects 0 values on quiz when question is null', () => {
    const QUIZ0: any = { maxPoints: 0, answerTime: 0, previewTime: 0 };
    expect(getMaxPoints(null, QUIZ0)).toBe(0);
    expect(getAnswerTime(null, QUIZ0)).toBe(0);
    expect(getPreviewTime(null, QUIZ0)).toBe(0);
  });

  it('falls back to defaults only when both question and quiz are null/undefined', () => {
    expect(getMaxPoints(undefined as any, undefined as any)).toBe(9999);
    expect(getAnswerTime(undefined as any, undefined as any)).toBe(42);
    expect(getPreviewTime(undefined as any, undefined as any)).toBe(7);
  });
});
