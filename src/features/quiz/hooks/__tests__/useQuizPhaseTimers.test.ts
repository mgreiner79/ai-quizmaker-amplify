import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Question, Quiz } from '@/features/quiz/types';
import { makeQuestion, makeQuiz } from '@/test/factories/quiz';

// ---- Hoisted mocks so we can reference them in tests ----
const mocks = vi.hoisted(() => ({
  useRafCountdown: vi.fn(),
  useDiscreteStepValue: vi.fn(),
  getPreviewTime: vi.fn(),
  getAnswerTime: vi.fn(),
  getMaxPoints: vi.fn(),
}));

// Mock dependencies used by the hook under test
vi.mock('@/features/quiz/hooks/useRafCountdown', () => ({
  useRafCountdown: mocks.useRafCountdown,
}));
vi.mock('@/features/quiz/hooks/useDiscreteStepValue', () => ({
  useDiscreteStepValue: mocks.useDiscreteStepValue,
}));
vi.mock('@/features/quiz/utils/quizHelpers', () => ({
  getPreviewTime: mocks.getPreviewTime,
  getAnswerTime: mocks.getAnswerTime,
  getMaxPoints: mocks.getMaxPoints,
}));

// Import AFTER mocks
import { useQuizPhaseTimers } from '../useQuizPhaseTimers';

// Small helpers for mocked return objects
const rafResult = (remaining: number) => ({
  remainingMs: 0,
  progressRemaining: remaining, // 1 → 0
  progressElapsed: 1 - remaining, // 0 → 1
  running: true,
});

const pointsResult = (value: number, previous: number | null) => ({
  value,
  previous,
});

describe('useQuizPhaseTimers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // default helper values (seconds/points)
    mocks.getPreviewTime.mockReturnValue(5); // seconds
    mocks.getAnswerTime.mockReturnValue(20); // seconds
    mocks.getMaxPoints.mockReturnValue(3000);

    // Default rAF returns; we will override per-test with mockImplementationOnce for preview/question
    mocks.useRafCountdown.mockReset();
    mocks.useDiscreteStepValue.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('wires preview phase timer correctly (active only in preview) and maps progress to percent', () => {
    const q: Question = makeQuestion({ id: 'Q1' });
    const quiz: Quiz = makeQuiz({ id: 'QUIZ' });

    // First call (preview) -> remaining=0.9 -> 90%
    mocks.useRafCountdown
      .mockImplementationOnce(() => rafResult(0.9)) // preview
      .mockImplementationOnce(() => rafResult(1.0)); // question (inactive path still returns shape)

    // Points are based on question timer's progressElapsed (from 2nd rAF mock above -> 0)
    mocks.useDiscreteStepValue.mockReturnValue(pointsResult(2400, 3000));

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
    expect(result.current.previewProgress).toBeCloseTo(90); // 0.9 * 100
    expect(result.current.questionProgress).toBeCloseTo(100); // 1 * 100
    expect(result.current.maxPoints).toBe(2400);
    expect(result.current.oldPoints).toBe(3000);

    // Assert first useRafCountdown call (preview) arguments
    const firstCallArgs = mocks.useRafCountdown.mock.calls[0][0];
    expect(firstCallArgs.active).toBe(true);
    expect(firstCallArgs.durationMs).toBe(5 * 1000); // getPreviewTime() * 1000
    expect(firstCallArgs.restartKey).toBe('Q1');
    expect(firstCallArgs.onEnd).toBe(onPreviewEnd);

    // Assert second useRafCountdown call (question) arguments
    const secondCallArgs = mocks.useRafCountdown.mock.calls[1][0];
    expect(secondCallArgs.active).toBe(false); // phase is 'preview'
    expect(secondCallArgs.durationMs).toBe(20 * 1000); // getAnswerTime() * 1000
    expect(secondCallArgs.restartKey).toBe('Q1');
    expect(secondCallArgs.onEnd).toBe(onQuestionEnd);

    // Points hook arguments
    const pointsArgs = mocks.useDiscreteStepValue.mock.calls[0][0];
    expect(pointsArgs.base).toBe(3000); // getMaxPoints()
    expect(pointsArgs.steps).toBe(5);
    expect(pointsArgs.progressElapsed).toBeCloseTo(0); // from questionTimer.progressElapsed (1 - 1.0)
  });

  it('wires question phase timer correctly (active only in question) and points use question elapsed', () => {
    const q: Question = makeQuestion({ id: 'Q2' });
    const quiz: Quiz = makeQuiz({ id: 'QUIZ' });

    // For question phase: preview (inactive) -> 1.0; question (active) -> 0.25 remaining
    mocks.useRafCountdown
      .mockImplementationOnce(() => rafResult(1.0)) // preview inactive
      .mockImplementationOnce(() => rafResult(0.25)); // question active

    // progressElapsed for question timer is 0.75 (1 - 0.25)
    mocks.useDiscreteStepValue.mockReturnValue(pointsResult(1800, 2400));

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
    expect(result.current.previewProgress).toBeCloseTo(100);
    expect(result.current.questionProgress).toBeCloseTo(25); // 0.25 * 100
    expect(result.current.maxPoints).toBe(1800);
    expect(result.current.oldPoints).toBe(2400);

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

    // Points args use questionTimer.progressElapsed (0.75 from above)
    const pointsArgs = mocks.useDiscreteStepValue.mock.calls[0][0];
    expect(pointsArgs.base).toBe(3000);
    expect(pointsArgs.steps).toBe(5);
    expect(pointsArgs.progressElapsed).toBeCloseTo(0.75, 5);
  });

  it('handles no question: both timers duration=0, inactive, and base points=0', () => {
    // When question is null, hook passes durationMs 0 and active false
    mocks.useRafCountdown
      .mockImplementationOnce(() => rafResult(1.0)) // preview
      .mockImplementationOnce(() => rafResult(1.0)); // question

    mocks.getMaxPoints.mockReturnValueOnce(0);
    mocks.useDiscreteStepValue.mockReturnValue(pointsResult(0, null));

    const { result } = renderHook(() =>
      useQuizPhaseTimers('preview', null, null),
    );

    // progress from mocks: 1.0 -> 100%
    expect(result.current.previewProgress).toBe(100);
    expect(result.current.questionProgress).toBe(100);
    expect(result.current.maxPoints).toBe(0);
    expect(result.current.oldPoints).toBeNull();

    // Verify args: durationMs 0 and active false when question is null
    const previewArgs = mocks.useRafCountdown.mock.calls[0][0];
    expect(previewArgs.active).toBe(false);
    expect(previewArgs.durationMs).toBe(0);
    const questionArgs = mocks.useRafCountdown.mock.calls[1][0];
    expect(questionArgs.active).toBe(false);
    expect(questionArgs.durationMs).toBe(0);

    // Points base 0
    const pointsArgs = mocks.useDiscreteStepValue.mock.calls[0][0];
    expect(pointsArgs.base).toBe(0);
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

    mocks.useDiscreteStepValue.mockReturnValue(pointsResult(3000, null));

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
    mocks.useDiscreteStepValue.mockReturnValue(pointsResult(1000, 2000));

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
