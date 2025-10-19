// amplify/functions/quizGenerator/tests/handler.missing-params.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context, Callback } from 'aws-lambda';

// --- Mocks (set up before importing handler) ---

vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));

vi.mock('@aws-amplify/backend/function/runtime', () => ({
  getAmplifyDataClientConfig: vi.fn().mockResolvedValue({
    resourceConfig: {},
    libraryOptions: {},
  }),
}));

// Mock env wiring used by the Lambda
vi.mock('$amplify/env/quiz-generator', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

// generateClient mock + spies
const spies = vi.hoisted(() => ({
  quizCreate: vi.fn(),
  progUpdate: vi.fn(),
  progCreate: vi.fn(),
}));

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

// OpenAI mocked to ensure no real calls (should not be hit here)
const openAiCreate = vi.hoisted(() => vi.fn());
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: openAiCreate } },
  })),
}));

// downloadData mocked (not used here)
vi.mock('aws-amplify/storage', () => ({
  downloadData: vi.fn(),
}));

// env alias is resolved via vitest.config.ts resolve.alias

beforeEach(() => {
  vi.resetAllMocks();
  spies.quizCreate.mockReset();
  spies.progUpdate.mockReset();
  spies.progCreate.mockReset();
  openAiCreate.mockReset();
});

describe('quizGenerator handler - missing required params', () => {
  const ctx: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'quiz-generator',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:eu:test:function:quiz-generator',
    memoryLimitInMB: '128',
    awsRequestId: 'req-missing',
    logGroupName: '/aws/lambda/quiz-generator',
    logStreamName: 'test',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
  const cb: Callback<any> = vi.fn();

  it('throws when quizId is missing', async () => {
    const { handler } = await import('../handler');

    const event = {
      identity: { sub: 'owner-123' },
      request: { headers: { authorization: 'Bearer t' } },
      arguments: { prompt: 'p', numQuestions: 3 },
    } as any;

    await expect(handler(event, ctx, cb)).rejects.toThrow(
      /Missing required parameters/i,
    );

    expect(spies.quizCreate).not.toHaveBeenCalled();
    // no OpenAI calls either
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it('throws when prompt is missing', async () => {
    const { handler } = await import('../handler');

    const event = {
      identity: { sub: 'owner-123' },
      request: { headers: { authorization: 'Bearer t' } },
      arguments: { quizId: 'q-1', numQuestions: 3 },
    } as any;

    await expect(handler(event, ctx, cb)).rejects.toThrow(
      /Missing required parameters/i,
    );

    expect(spies.quizCreate).not.toHaveBeenCalled();
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it('throws when numQuestions is missing', async () => {
    const { handler } = await import('../handler');

    const event = {
      identity: { sub: 'owner-123' },
      request: { headers: { authorization: 'Bearer t' } },
      arguments: { quizId: 'q-1', prompt: 'p' },
    } as any;

    await expect(handler(event, ctx, cb)).rejects.toThrow(
      /Missing required parameters/i,
    );

    expect(spies.quizCreate).not.toHaveBeenCalled();
    expect(openAiCreate).not.toHaveBeenCalled();
  });
});
