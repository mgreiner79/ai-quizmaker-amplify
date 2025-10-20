// amplify/functions/quizGenerator/tests/handler.invalid-openai-json.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCb, makeCtx } from './lambdaHelpers';

// Hoisted spies so vi.mock factories can reference them
const spies = vi.hoisted(() => ({
  progUpdate: vi.fn(), // maps to CreationProgress.update
  progCreate: vi.fn(), // maps to CreationProgress.create (fallback)
  quizCreate: vi.fn(), // maps to Quiz.create
}));
const openAiCreate = vi.hoisted(() => vi.fn());

// Stable mocks
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));
vi.mock('@aws-amplify/backend/function/runtime', () => ({
  getAmplifyDataClientConfig: vi.fn().mockResolvedValue({
    resourceConfig: {},
    libraryOptions: {},
  }),
}));
vi.mock('$amplify/env/quiz-generator', () => ({
  env: { OPENAI_API_KEY: 'test-key' },
}));

vi.mock('aws-amplify/data', () => ({
  generateClient: vi.fn().mockImplementation(() => ({
    models: {
      CreationProgress: {
        update: spies.progUpdate, // IMPORTANT: .update (not updateProgress)
        create: spies.progCreate,
      },
      Quiz: {
        create: spies.quizCreate,
      },
    },
  })),
}));

vi.mock('aws-amplify/storage', () => ({
  downloadData: vi.fn().mockResolvedValue({
    result: Promise.resolve({
      body: { blob: async () => new Blob([`unused`]) },
    }),
  }),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: openAiCreate } },
  })),
}));

// Polyfill Blob in Node
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('quizGenerator handler - invalid OpenAI JSON', () => {
  it('sets ERROR progress for parsing, does not create quiz, and throws', async () => {
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: '{ invalid json' } }],
    });

    const { handler } = await import('../handler');

    const event = {
      arguments: {
        quizId: 'QUIZ-BAD-JSON',
        prompt: 'make a quiz',
        numQuestions: 1,
      },
      request: { headers: { authorization: 'Bearer token' } },
      identity: { sub: 'owner-1' },
    } as any;

    await expect(handler(event, makeCtx(), makeCb())).rejects.toThrow(
      /Failed to parse generated quiz JSON/i,
    );

    // Ensure a parsing ERROR progress patch was emitted
    const patches = spies.progUpdate.mock.calls.map((c) => c[0]);
    expect(
      patches.some(
        (p) =>
          p?.status === 'ERROR' &&
          /Error parsing quiz JSON/i.test(String(p?.message || '')),
      ),
    ).toBe(true);

    // Quiz.create must not be called
    expect(spies.quizCreate).not.toHaveBeenCalled();
  });
});
