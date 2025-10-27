// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* -------------------- Hoisted spies -------------------- */
const spies = vi.hoisted(() => ({
  quizCreate: vi.fn(), // models.Quiz.create
  upsertProgress: vi.fn(), // ../_shared/progress.upsertProgress
}));
const openAiCreate = vi.hoisted(() => vi.fn());

/* -------------------- Stable mocks -------------------- */
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

// Storage is not used when no knowledge file is provided, but keep a noop mock around
vi.mock('aws-amplify/storage', () => ({
  downloadData: vi.fn(),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: openAiCreate } },
  })),
}));

// Progress helper used by the worker
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

// Polyfill Blob for Node (if other tests in this suite add knowledge later)
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

beforeEach(() => {
  vi.clearAllMocks();

  // LLM returns valid JSON; we want to fail only on Quiz.create
  openAiCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
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
          }),
        },
      },
    ],
  });
});

/* -------------------- helpers -------------------- */
function sqsEvent(overrides?: Partial<Record<string, any>>) {
  const body = {
    quizId: 'QUIZ-CREATE-ERR',
    prompt: 'p',
    numQuestions: 1,
    ownerSub: 'owner-1',
    // no knowledge → skips EXTRACTING
    ...(overrides ?? {}),
  };
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

function lastStatus() {
  const calls = spies.upsertProgress.mock.calls;
  const last = calls[calls.length - 1];
  return last?.[2]?.status;
}

/* -------------------- test -------------------- */

describe('quizWorker handler - Quiz.create returns errors', () => {
  it('sets ERROR with serialized create errors; resolves; OpenAI once; Quiz.create once', async () => {
    const createErrors = [{ message: 'DB error', code: 'E_DB' }];
    spies.quizCreate.mockResolvedValue({ errors: createErrors });

    const { handler } = await import('../handler');

    await expect(handler(sqsEvent())).resolves.toBeUndefined();

    // OpenAI called once, Quiz.create called once
    expect(openAiCreate).toHaveBeenCalledTimes(1);
    expect(spies.quizCreate).toHaveBeenCalledTimes(1);

    // An ERROR progress patch with serialized errors should be sent
    const patches = spies.upsertProgress.mock.calls.map((c) => c[2]);
    const hasCreateErrorPatch = patches.some(
      (p) =>
        p?.status === 'ERROR' &&
        /Error creating quiz/i.test(String(p?.message || '')) &&
        String(p?.errorText || '') === JSON.stringify(createErrors),
    );
    expect(hasCreateErrorPatch).toBe(true);

    // Final status is ERROR (worker catches internally)
    expect(lastStatus()).toBe('ERROR');
  });
});
