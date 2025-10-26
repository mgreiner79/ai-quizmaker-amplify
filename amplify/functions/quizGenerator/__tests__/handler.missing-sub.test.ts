// tests/handler.missing-sub.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mockDataClient,
  mockOpenAI,
  importHandler,
  statusesFrom,
} from './utils';
import { makeCb, makeCtx } from './lambdaHelpers';

const llmQuiz = {
  title: 'T',
  description: 'D',
  previewTime: 5,
  answerTime: 20,
  maxPoints: 3000,
  questions: [
    {
      id: 'Q1',
      text: 'q',
      previewTime: 5,
      answerTime: 20,
      maxPoints: 3000,
      correctAnswerId: 'A1',
      explanation: 'e',
      answers: [
        { id: 'A1', text: 't1', message: 'm1' },
        { id: 'A2', text: 't2', message: 'm2' },
        { id: 'A3', text: 't3', message: 'm3' },
        { id: 'A4', text: 't4', message: 'm4' },
      ],
    },
  ],
};

describe('missing identity.sub', () => {
  beforeEach(() => vi.clearAllMocks());

  it('identity present but sub missing → ERROR progress, no quiz', async () => {
    const openai = mockOpenAI({
      choices: [{ message: { content: JSON.stringify(llmQuiz) } }],
    });
    const spies = mockDataClient();
    const { handler } = await importHandler();

    await expect(
      handler(
        {
          identity: {}, // no sub
          request: { headers: { authorization: 'Bearer t' } },
          arguments: { quizId: 'q-1', prompt: 'p', numQuestions: 3 },
        } as any,
        makeCtx(),
        makeCb(),
      ),
    ).rejects.toThrow(/sub/i);

    expect(openai.create).toHaveBeenCalledTimes(1);
    expect(spies.createQuiz).not.toHaveBeenCalled();

    const statuses = statusesFrom(spies.updateProgress);
    expect(statuses[0]).toBe('WARMING_UP');
    expect(statuses).toContain('GENERATING');
    expect(statuses.at(-1)).toBe('ERROR');

    const patches = spies.updateProgress.mock.calls.map((c) => c[0]);
    expect(patches.some((p) => p.message === 'Error determining user')).toBe(
      true,
    );
  });

  it('identity omitted → ERROR progress, no quiz', async () => {
    const openai = mockOpenAI({
      choices: [{ message: { content: JSON.stringify(llmQuiz) } }],
    });
    const spies = mockDataClient();
    const { handler } = await importHandler();

    await expect(
      handler(
        {
          request: { headers: { authorization: 'Bearer t' } },
          arguments: { quizId: 'q-2', prompt: 'p2', numQuestions: 2 },
        } as any,
        makeCtx(),
        makeCb(),
      ),
    ).rejects.toThrow(/could not determine the user/i);

    expect(openai.create).toHaveBeenCalledTimes(1);
    expect(spies.createQuiz).not.toHaveBeenCalled();

    const statuses = statusesFrom(spies.updateProgress);
    expect(statuses[0]).toBe('WARMING_UP');
    expect(statuses.at(-1)).toBe('ERROR');

    const lastPatch = spies.updateProgress.mock.calls.at(-1)![0];
    expect(String(lastPatch.errorText || '')).toMatch(/sub/i);
  });
});
