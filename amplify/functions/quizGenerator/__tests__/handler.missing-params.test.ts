// tests/handler.missing-params.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockDataClient, mockOpenAI, importHandler } from './utils';
import { makeCb, makeCtx } from './lambdaHelpers';

describe('missing required params', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [
      { arguments: { prompt: 'p', numQuestions: 3 } },
      /Missing required parameters/i,
    ],
    [
      { arguments: { quizId: 'q-1', numQuestions: 3 } },
      /Missing required parameters/i,
    ],
    [
      { arguments: { quizId: 'q-1', prompt: 'p' } },
      /Missing required parameters/i,
    ],
  ])('rejects: %j', async (eventPatch, regex) => {
    const spies = mockDataClient();
    const openai = mockOpenAI(); // should not be called
    const { handler } = await importHandler();

    const event = {
      identity: { sub: 'owner-123' },
      request: { headers: { authorization: 'Bearer t' } },
      ...eventPatch,
    } as any;

    await expect(handler(event, makeCtx(), makeCb())).rejects.toThrow(regex);
    expect(spies.createQuiz).not.toHaveBeenCalled();
    expect(openai.create).not.toHaveBeenCalled();
  });
});
