// src/fratures/quiz/hooks/__test__/useQuizPhaseTimers.test.ts

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Question, Quiz } from '@/features/quiz/types';
import { makeQuestion, makeQuiz } from '@/test/factories/quiz';

// ---- Hoisted mocks so we can reference them in tests ----
const mocks = vi.hoisted(() => ({
  useRafCountdown: vi.fn(),
  getPreviewTime: vi.fn(),
  getAnswerTime: vi.fn(),
}));

// Mock dependencies used by the hook under test
vi.mock('@/features/quiz/hooks/useRafCountdown', () => ({
  useRafCountdown: mocks.useRafCountdown,
}));
vi.mock('@/features/quiz/utils/quizHelpers', () => ({
  getPreviewTime: mocks.getPreviewTime,
  getAnswerTime: mocks.getAnswerTime,
}));

// Import AFTER mocks
import { useQuizPhaseTimers } from '@/features/quiz/hooks/useQuizPhaseTimers';

// Small helper for mocked rAF return objects
const rafResult = (remaining: number) => ({
  remaining: 0,
  progressRemaining: remaining,
  progressElapsed: 1 - remaining,
  running: true,
  durationMs: 1000,
});

describe('useQuizPhaseTimers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // default helper values (seconds)
    mocks.getPreviewTime.mockReturnValue(5);
    mocks.getAnswerTime.mockReturnValue(20);

    mocks.useRafCountdown.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('wires preview phase timer correctly (active only in preview) and maps progress to percent', () => {
    const q: Question = makeQuestion({ id: 'Q1' });
    const quiz: Quiz = makeQuiz({ id: 'QUIZ1' });

    // First call (preview) -> remainaing=0.9 -> 90%
    // Second call (question) -> inactive path, but we still return a shape (remaining=1.0 -> 100%)
    mocks.useRafCountdown
      .mockImplementationOnce(() => rafResult(0.9))
      .mockImplementationOnce(() => rafResult(1.0));

    const onPreviewEnd = vi.fn();
    const onQuestionEnd = vi.fn();
    const { result } = renderHook(() =>
      useQuizPhaseTimers(
        'preview',
        q as any,
        quiz as any,
        onPreviewEnd,
        onQuestionEnd,
      ),
    );

    // Progress mapping
    expect(result.current.previewProgressPct).toBeCloseTo(90);
    expect(result.current.questionProgressPct).toBeCloseTo(100);

    // Assert first useRafCountdown call (preview) arguments
    const firstCallArgs = mocks.useRafCountdown.mock.calls[0][0];
    expect(firstCallArgs.active).toBe(true);
    expect(firstCallArgs.durationMs).toBe(5 * 1000);
    expect(firstCallArgs.restartKey).toBe('Q1');
    expect(firstCallArgs.onEnd).toBe(onPreviewEnd);

    // Assert second useRafCountdown call (question) arguments
    const secondCallArgs = mocks.useRafCountdown.mock.calls[1][0];
    expect(secondCallArgs.active).toBe(false);
    expect(secondCallArgs.durationMs).toBe(20 * 1000);
    expect(secondCallArgs.restartKey).toBe('Q1');
    expect(secondCallArgs.onEnd).toBe(onQuestionEnd);
  });
  it('wires question phase timer correctly (active only in question)', () => {
    const q: Question = makeQuestion({ id: 'Q2' });
    const quiz: Quiz = makeQuiz({ id: 'QUIZ' });

    // For question phase: preview (inactive) -> 1.0; question (active) -> 0.25 remaining
    mocks.useRafCountdown
      .mockImplementationOnce(() => rafResult(1.0)) // preview inactive
      .mockImplementationOnce(() => rafResult(0.25)); // question active

    const onPreviewEnd = vi.fn();
    const onQuestionEnd = vi.fn();

    const { result } = renderHook(() =>
      useQuizPhaseTimers(
        'question',
        q as any,
        quiz as any,
        onPreviewEnd,
        onQuestionEnd,
      ),
    );

    // Progress mapping
    expect(result.current.previewProgressPct).toBeCloseTo(100);
    expect(result.current.questionProgressPct).toBeCloseTo(25); // 0.25 * 100

    // Preview call args
    const previewArgs = mocks.useRafCountdown.mock.calls[0][0];
    expect(previewArgs.active).toBe(false);
    expect(previewArgs.durationMs).toBe(5 * 1000);
    expect(previewArgs.restartKey).toBe('Q2');
    expect(previewArgs.onEnd).toBe(onPreviewEnd);

    // Question call args
    const questionArgs = mocks.useRafCountdown.mock.calls[1][0];
    expect(questionArgs.active).toBe(true);
    expect(questionArgs.durationMs).toBe(20 * 1000);
    expect(questionArgs.restartKey).toBe('Q2');
    expect(questionArgs.onEnd).toBe(onQuestionEnd);
  });

  it('handles no question: both timers duration=0 and inactive', () => {
    // When question is null, hook passes durationMs 0 and active false
    mocks.useRafCountdown
      .mockImplementationOnce(() => rafResult(1.0)) // preview
      .mockImplementationOnce(() => rafResult(1.0)); // question

    const { result } = renderHook(() =>
      useQuizPhaseTimers('preview', null, null),
    );

    // progress from mocks: 1.0 -> 100%
    expect(result.current.previewProgressPct).toBe(100);
    expect(result.current.questionProgressPct).toBe(100);

    // Verify args: durationMs 0 and active false when question is null
    const previewArgs = mocks.useRafCountdown.mock.calls[0][0];
    expect(previewArgs.active).toBe(false);
    expect(previewArgs.durationMs).toBe(0);
    const questionArgs = mocks.useRafCountdown.mock.calls[1][0];
    expect(questionArgs.active).toBe(false);
    expect(questionArgs.durationMs).toBe(0);
  });

  it('propagates restartKey as question.id to both timers (restarts on id change)', () => {
    const quiz: Quiz = makeQuiz({ id: 'QUIZ' });
    const q1: Question = makeQuestion({ id: 'Q1' });
    const q2: Question = makeQuestion({ id: 'Q2' });

    // Provide deterministic mocks for each render
    mocks.useRafCountdown
      .mockImplementationOnce(() => rafResult(0.9)) // render 1: preview
      .mockImplementationOnce(() => rafResult(1.0)) // render 1: question
      .mockImplementationOnce(() => rafResult(0.8)) // render 2: preview
      .mockImplementationOnce(() => rafResult(1.0)); // render 2: question

    const { rerender } = renderHook(
      ({ question }: { question: Question | null }) =>
        useQuizPhaseTimers('preview', question, quiz),
      { initialProps: { question: q1 } },
    );

    // First render - restartKey should be 'Q1'
    let previewArgs = mocks.useRafCountdown.mock.calls[0][0];
    let questionArgs = mocks.useRafCountdown.mock.calls[1][0];
    expect(previewArgs.restartKey).toBe('Q1');
    expect(questionArgs.restartKey).toBe('Q1');

    // Rerender with a different question id
    rerender({ question: q2 });

    // New calls should carry the new restartKey
    previewArgs = mocks.useRafCountdown.mock.calls[2][0];
    questionArgs = mocks.useRafCountdown.mock.calls[3][0];
    expect(previewArgs.restartKey).toBe('Q2');
    expect(questionArgs.restartKey).toBe('Q2');
  });

  it('passes through onPreviewEnd and onQuestionEnd callbacks', () => {
    const q: Question = makeQuestion({ id: 'QCB' });
    const quiz: Quiz = makeQuiz({ id: 'QUIZ' });
    const onPreviewEnd = vi.fn();
    const onQuestionEnd = vi.fn();

    // Mocks just to satisfy shape
    mocks.useRafCountdown
      .mockImplementationOnce(() => rafResult(0.5))
      .mockImplementationOnce(() => rafResult(0.5));

    renderHook(() =>
      useQuizPhaseTimers(
        'question',
        q as any,
        quiz as any,
        onPreviewEnd,
        onQuestionEnd,
      ),
    );

    const previewArgs = mocks.useRafCountdown.mock.calls[0][0];
    const questionArgs = mocks.useRafCountdown.mock.calls[1][0];
    expect(previewArgs.onEnd).toBe(onPreviewEnd);
    expect(questionArgs.onEnd).toBe(onQuestionEnd);
  });
});
