// /src/features/quiz/utils/__tests__/computeAwardForAnswer.test.ts
import { describe, it, expect } from 'vitest';
import { computeAwardForAnswer } from '@/features/quiz/utils/quizScoring';
import type { Question, Quiz } from '@/features/quiz/types';
import { makeQuestion, makeQuiz } from '@/test/factories/quiz';

describe('computeAwardForAnswer', () => {
  const BASE = 3000;
  const STEPS = 5; // step size = 600
  const TOTAL_SEC = 20; // answer time

  const qBase = (overrides?: Partial<Question>) =>
    makeQuestion({
      id: 'Q1',
      correctAnswerId: 'A1',
      // ensure helpers read from question-level first
      answerTime: TOTAL_SEC,
      maxPoints: BASE,
      answers: [
        { id: 'A1', text: 'Correct', message: 'ok' },
        { id: 'A2', text: 'Wrong', message: 'no' },
      ],
      ...overrides,
    });

  const quizBase = (overrides?: Partial<Quiz>) =>
    makeQuiz({
      id: 'QUIZ1',
      ...overrides,
    });

  it('awards full points at t=0 for a correct answer', () => {
    const q = qBase();
    const quiz = quizBase();
    const pts = computeAwardForAnswer(
      'A1',
      q as any,
      quiz as any,
      /*elapsed*/ 0,
      STEPS,
    );
    expect(pts).toBe(BASE);
  });

  it('awards 0 points if the answer is incorrect (regardless of time)', () => {
    const q = qBase();
    const quiz = quizBase();
    expect(computeAwardForAnswer('A2', q as any, quiz as any, 0, STEPS)).toBe(
      0,
    );
    expect(computeAwardForAnswer('A2', q as any, quiz as any, 10, STEPS)).toBe(
      0,
    );
    expect(computeAwardForAnswer('A2', q as any, quiz as any, 999, STEPS)).toBe(
      0,
    );
  });

  it('applies discrete step decay based on elapsed progress (5 steps: 600 each)', () => {
    const q = qBase();
    const quiz = quizBase();
    // thresholds at 20%, 40%, 60%, 80%, 100%
    expect(computeAwardForAnswer('A1', q as any, quiz as any, 0, STEPS)).toBe(
      3000,
    ); // 0%
    expect(
      computeAwardForAnswer(
        'A1',
        q as any,
        quiz as any,
        0.2 * TOTAL_SEC,
        STEPS,
      ),
    ).toBe(2400); // 1 step
    expect(
      computeAwardForAnswer(
        'A1',
        q as any,
        quiz as any,
        0.4 * TOTAL_SEC,
        STEPS,
      ),
    ).toBe(1800); // 2 steps
    expect(
      computeAwardForAnswer(
        'A1',
        q as any,
        quiz as any,
        0.6 * TOTAL_SEC,
        STEPS,
      ),
    ).toBe(1200); // 3 steps
    expect(
      computeAwardForAnswer(
        'A1',
        q as any,
        quiz as any,
        0.8 * TOTAL_SEC,
        STEPS,
      ),
    ).toBe(600); // 4 steps
    expect(
      computeAwardForAnswer(
        'A1',
        q as any,
        quiz as any,
        1.0 * TOTAL_SEC,
        STEPS,
      ),
    ).toBe(0); // 5 steps
  });

  it('clamps elapsed < 0 to 0 progress (awards full points if correct)', () => {
    const q = qBase();
    const quiz = quizBase();
    expect(computeAwardForAnswer('A1', q as any, quiz as any, -5, STEPS)).toBe(
      BASE,
    );
  });

  it('clamps elapsed > total to 1 progress (awards 0 if correct)', () => {
    const q = qBase();
    const quiz = quizBase();
    expect(
      computeAwardForAnswer(
        'A1',
        q as any,
        quiz as any,
        TOTAL_SEC + 100,
        STEPS,
      ),
    ).toBe(0);
  });

  it('respects steps override (3 steps -> step size = base/3)', () => {
    const q = qBase();
    const quiz = quizBase();
    const stepsOverride = 3; // step size = 1000
    // progress 0.34 -> floor(0.34*3)=1 -> 3000 - 1*1000 = 2000
    const pts = computeAwardForAnswer(
      'A1',
      q as any,
      quiz as any,
      0.34 * TOTAL_SEC,
      stepsOverride,
    );
    expect(pts).toBe(2000);
  });

  it('when totalSec = 0, progress is treated as 1 (instant timeout -> 0 if correct)', () => {
    const q = qBase({ answerTime: 0 }); // question-level time 0
    const quiz = quizBase();
    const pts = computeAwardForAnswer(
      'A1',
      q as any,
      quiz as any,
      /*elapsed*/ 0,
      STEPS,
    );
    expect(pts).toBe(0);
  });

  it('uses quiz-level defaults if question-level values are missing', () => {
    // remove question-level maxPoints/answerTime to make helpers fall back to quiz-level
    const q = qBase({
      answerTime: undefined as any,
      maxPoints: undefined as any,
    });
    const quiz = quizBase({ answerTime: 10, maxPoints: 1000 });

    // with 5 steps: step size = 200, at 50% => progress 0.5 => floor(0.5*5)=2 => 1000 - 400 = 600
    const pts = computeAwardForAnswer(
      'A1',
      q as any,
      quiz as any,
      5,
      /*steps*/ 5,
    );
    expect(pts).toBe(600);
  });
});
