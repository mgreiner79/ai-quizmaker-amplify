// amplify/functions/quizGenerator/tests/handler.missing-sub.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context, Callback } from 'aws-lambda';

// Mock env wiring used by the Lambda
vi.mock('$amplify/env/quiz-generator', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));

vi.mock('@aws-amplify/backend/function/runtime', () => ({
  getAmplifyDataClientConfig: vi.fn().mockResolvedValue({
    resourceConfig: {},
    libraryOptions: {},
  }),
}));

// Spies we can inspect
const spies = vi.hoisted(() => ({
  quizCreate: vi.fn(),
  progUpdate: vi.fn(),
  progCreate: vi.fn(),
}));

// Keep a stable implementation. Do NOT wipe this with resetAllMocks.
vi.mock('aws-amplify/data', () => ({
  generateClient: vi.fn().mockImplementation(() => ({
    models: {
      Quiz: { create: spies.quizCreate },
      CreationProgress: {
        update: spies.progUpdate,
        create: spies.progCreate,
      },
    },
  })),
}));

const openAiCreate = vi.hoisted(() => vi.fn());
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: openAiCreate } },
  })),
}));

vi.mock('aws-amplify/storage', () => ({ downloadData: vi.fn() }));
// $amplify/env/quiz-generator is provided by vitest.config.ts alias

beforeEach(() => {
  // preserve mock implementations; only clear call history
  vi.clearAllMocks();
});

const ctx: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'quiz-generator',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:eu:test:function:quiz-generator',
  memoryLimitInMB: '128',
  awsRequestId: 'req-missing-sub',
  logGroupName: '/aws/lambda/quiz-generator',
  logStreamName: 'test',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};
const cb: Callback<any> = vi.fn();

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

describe('quizGenerator handler - missing identity.sub', () => {
  it('errors when identity exists but sub is missing; sets progress ERROR; does not create quiz', async () => {
    const { handler } = await import('../handler');

    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(llmQuiz) } }],
    });

    const event = {
      identity: {}, // missing sub
      request: { headers: { authorization: 'Bearer t' } },
      arguments: { quizId: 'q-1', prompt: 'p', numQuestions: 3 },
    } as any;

    await expect(handler(event, ctx, cb)).rejects.toThrow(/sub/i);

    expect(openAiCreate).toHaveBeenCalledTimes(1);
    expect(spies.quizCreate).not.toHaveBeenCalled();

    const patches = spies.progUpdate.mock.calls.map((c) => c[0]);
    const statuses = patches.map((p) => p.status);

    // Robust assertions: first warmup, contains generating, ends in ERROR.
    expect(statuses[0]).toBe('WARMING_UP');
    expect(statuses).toContain('GENERATING');
    expect(statuses.at(-1)).toBe('ERROR');

    const lastPatch = patches.at(-1)!;
    expect(lastPatch).toMatchObject({
      status: 'ERROR',
      message: 'Error during quiz generation',
    });

    // The earlier explicit error patch should also be present
    expect(patches.some((p) => p.message === 'Error determining user')).toBe(
      true,
    );
  });

  it('errors when identity is omitted; sets progress ERROR; does not create quiz', async () => {
    const { handler } = await import('../handler');

    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(llmQuiz) } }],
    });

    const event = {
      // identity omitted
      request: { headers: { authorization: 'Bearer t' } },
      arguments: { quizId: 'q-2', prompt: 'p2', numQuestions: 2 },
    } as any;

    await expect(handler(event, ctx, cb)).rejects.toThrow(
      /could not determine the user/i,
    );

    expect(openAiCreate).toHaveBeenCalledTimes(1);
    expect(spies.quizCreate).not.toHaveBeenCalled();

    const patches = spies.progUpdate.mock.calls.map((c) => c[0]);
    const statuses = patches.map((p) => p.status);

    expect(statuses[0]).toBe('WARMING_UP');
    // In this branch GENERATING might not occur depending on where it throws,
    // but final state must be ERROR.
    expect(statuses.at(-1)).toBe('ERROR');

    // Ensure we recorded an explanatory errorText
    const lastPatch = patches.at(-1)!;
    expect(String(lastPatch.errorText || '')).toMatch(/sub/i);
  });
});
