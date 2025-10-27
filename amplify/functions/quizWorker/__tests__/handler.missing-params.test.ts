// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Polyfill Blob (keeps parity if other tests add knowledge)
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

/* -------- Hoisted spies -------- */
const spies = vi.hoisted(() => ({
  quizCreate: vi.fn(), // models.Quiz.create
  upsertProgress: vi.fn(), // ../_shared/progress.upsertProgress
}));
const openAiCreate = vi.hoisted(() => vi.fn());

/* -------- Mocks -------- */
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));
vi.mock('@aws-amplify/backend/function/runtime', () => ({
  getAmplifyDataClientConfig: vi.fn().mockResolvedValue({
    resourceConfig: {},
    libraryOptions: {},
  }),
}));
vi.mock('$amplify/env/quiz-worker', () => ({
  env: { LLM_API_KEY: 'test-key' },
}));
vi.mock('aws-amplify/data', () => ({
  generateClient: vi.fn().mockImplementation(() => ({
    models: {
      CreationProgress: { update: vi.fn(), create: vi.fn() },
      Quiz: { create: spies.quizCreate },
    },
  })),
}));
vi.mock('aws-amplify/storage', () => ({ downloadData: vi.fn() }));
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: openAiCreate } },
  })),
}));
vi.mock('../../_shared/progress', () => ({
  upsertProgress: (...args: any[]) => spies.upsertProgress(...args),
  ProgressStatus: {
    WARMING_UP: 'WARMING_UP',
    EXTRACTING: 'EXTRACTING',
    GENERATING: 'GENERATING',
    CREATED: 'CREATED',
    ERROR: 'ERROR',
  },
}));

/* -------- Helpers -------- */
function sqsEvent(body: Record<string, any>) {
  return {
    Records: [
      {
        messageId: 'm1',
        receiptHandle: 'rh',
        body: JSON.stringify(body),
        attributes: {},
        messageAttributes: {},
        md5OfBody: '',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:eu:acct:queue',
        awsRegion: 'eu',
      },
    ],
  } as any;
}

describe('quizWorker - missing required params', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    // missing quizId
    [{ prompt: 'p', numQuestions: 3, ownerSub: 'o1' }, false],
    // missing prompt (quizId present → we expect an ERROR progress)
    [{ quizId: 'q-1', numQuestions: 3, ownerSub: 'o1' }, true],
    // missing numQuestions (quizId present → we expect an ERROR progress)
    [{ quizId: 'q-1', prompt: 'p', ownerSub: 'o1' }, true],
  ])(
    'skips work and does not call LLM/Quiz.create: %j',
    async (body, expectErrorProgress) => {
      const { handler } = await import('../handler');

      await expect(handler(sqsEvent(body))).resolves.toBeUndefined();

      // No LLM and no DB create attempted
      expect(openAiCreate).not.toHaveBeenCalled();
      expect(spies.quizCreate).not.toHaveBeenCalled();

      // If quizId provided, we emit an ERROR progress patch
      if (expectErrorProgress) {
        const patches = spies.upsertProgress.mock.calls.map((c) => c[2]);
        expect(
          patches.some(
            (p) =>
              p?.status === 'ERROR' &&
              /Missing required parameters/i.test(String(p?.message || '')),
          ),
        ).toBe(true);
      } else {
        // No quizId → we cannot write progress
        expect(spies.upsertProgress).not.toHaveBeenCalled();
      }
    },
  );
});
