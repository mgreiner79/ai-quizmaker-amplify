// amplify/functions/quizGenerator/tests/handler.create-failure.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCb, makeCtx } from './lambdaHelpers';

// Hoisted spies for factory mocks
const spies = vi.hoisted(() => ({
  progUpdate: vi.fn(), // CreationProgress.update
  progCreate: vi.fn(), // CreationProgress.create (fallback)
  quizCreate: vi.fn(), // Quiz.create
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
        update: spies.progUpdate,
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

// Polyfill Blob for Node
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('quizGenerator handler - Quiz.create returns errors', () => {
  it('emits ERROR with serialized create errors, throws, OpenAI called once, Quiz.create called once', async () => {
    // OpenAI returns valid JSON so only create fails
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
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(llmQuiz) } }],
    });

    // Data client create returns errors
    const createErrors = [{ message: 'DB error', code: 'E_DB' }];
    spies.quizCreate.mockResolvedValue({ errors: createErrors });

    const { handler } = await import('../handler');

    const event = {
      arguments: {
        quizId: 'QUIZ-CREATE-ERR',
        prompt: 'p',
        numQuestions: 1,
      },
      request: { headers: { authorization: 'Bearer token' } },
      identity: { sub: 'owner-1' },
    } as any;

    await expect(handler(event, makeCtx(), makeCb())).rejects.toThrow(
      /Quiz creation failed/i,
    );

    // Verify ERROR patch for create failure contains serialized errors
    const patches = spies.progUpdate.mock.calls.map((c) => c[0]);
    const hasCreateErrorPatch = patches.some(
      (p) =>
        p?.status === 'ERROR' &&
        /Error creating quiz/i.test(String(p?.message || '')) &&
        String(p?.errorText || '') === JSON.stringify(createErrors),
    );
    expect(hasCreateErrorPatch).toBe(true);

    // OpenAI called once, Quiz.create called once
    expect(openAiCreate).toHaveBeenCalledTimes(1);
    expect(spies.quizCreate).toHaveBeenCalledTimes(1);

    // Final catcher also sets a generic ERROR; ensure last status is ERROR
    expect(patches.at(-1)?.status).toBe('ERROR');
  });
});
