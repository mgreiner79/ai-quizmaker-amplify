// amplify/functions/quizGenerator/tests/upsertProgress.fallback.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCtx, makeCb } from './lambdaHelpers';

// Hoisted spies used by mock factories
const spies = vi.hoisted(() => ({
  progUpdate: vi.fn(), // CreationProgress.update
  progCreate: vi.fn(), // CreationProgress.create (fallback)
  quizCreate: vi.fn(), // Quiz.create
}));
const openAiCreate = vi.hoisted(() => vi.fn());

// Stable mocks (owned by this file)
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

describe('upsertProgress fallback to create() when update() fails', () => {
  it('calls CreationProgress.create once with merged fields when update throws', async () => {
    // Force the FIRST upsert (WARMING_UP) update to fail so fallback path executes
    spies.progUpdate.mockRejectedValueOnce(new Error('Not found'));

    // Keep OpenAI simple; it won’t run before the first upsert but set a valid value anyway
    openAiCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: 't',
              description: 'd',
              previewTime: 5,
              answerTime: 20,
              maxPoints: 3000,
              questions: [],
            }),
          },
        },
      ],
    });

    const { handler } = await import('../handler');

    const quizId = 'P-1';
    const event = {
      arguments: { quizId, prompt: 'p', numQuestions: 1 },
      request: { headers: { authorization: 'Bearer token' } },
      identity: { sub: 'owner-1' },
    } as any;

    // We only care that the first upsert falls back; the handler may later throw,
    // but fallback should already have happened. Run and catch if needed.
    try {
      await handler(event, makeCtx(), makeCb());
    } catch {
      // ignore; later stages can fail without affecting the assertion
    }

    // update called at least once and first call rejected
    expect(spies.progUpdate).toHaveBeenCalled();

    // create must be called once as fallback with merged defaults + patch
    expect(spies.progCreate).toHaveBeenCalledTimes(1);
    const createArg = spies.progCreate.mock.calls[0][0];

    // From handler's first upsert:
    // defaults in upsertProgress + provided patch { status:'WARMING_UP', message:'Warming up' }
    expect(createArg).toMatchObject({
      id: quizId,
      status: 'WARMING_UP',
      message: 'Warming up',
      errorText: '', // default supplied by upsertProgress on create
    });
  });

  it('propagates if create() also fails (optional negative case)', async () => {
    spies.progUpdate.mockRejectedValueOnce(new Error('Not found'));
    spies.progCreate.mockRejectedValueOnce(new Error('DB create failed'));

    openAiCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: 't',
              description: 'd',
              previewTime: 5,
              answerTime: 20,
              maxPoints: 3000,
              questions: [],
            }),
          },
        },
      ],
    });

    const { handler } = await import('../handler');

    const event = {
      arguments: { quizId: 'P-2', prompt: 'p', numQuestions: 1 },
      request: { headers: { authorization: 'Bearer token' } },
      identity: { sub: 'owner-1' },
    } as any;

    await expect(handler(event, makeCtx(), makeCb())).rejects.toBeTruthy();

    // update may be called multiple times by later phases
    expect(spies.progUpdate).toHaveBeenCalled();
    // but create should be used exactly once as fallback for the first failure
    expect(spies.progCreate).toHaveBeenCalledTimes(1);

    const createArg = spies.progCreate.mock.calls[0][0];
    expect(createArg).toMatchObject({
      id: 'P-2',
      status: 'WARMING_UP',
      message: 'Warming up',
      errorText: '',
    });
  });
});
