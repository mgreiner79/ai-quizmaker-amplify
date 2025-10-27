// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Polyfill Blob in Node (keeps parity if other tests add knowledge)
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

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

// Storage not needed for this test path; noop to avoid accidental calls
vi.mock('aws-amplify/storage', () => ({ downloadData: vi.fn() }));

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

/* -------------------- Helpers -------------------- */
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

function lastStatus() {
  const calls = spies.upsertProgress.mock.calls;
  const last = calls[calls.length - 1];
  return last?.[2]?.status;
}

/* -------------------- Test -------------------- */
describe('quizWorker handler - invalid OpenAI JSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets ERROR progress for parsing, does not create quiz, and resolves', async () => {
    // OpenAI returns invalid JSON
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: '{ invalid json' } }],
    });

    const { handler } = await import('../handler');

    const event = sqsEvent({
      quizId: 'QUIZ-BAD-JSON',
      prompt: 'make a quiz',
      numQuestions: 1,
      ownerSub: 'owner-1',
    });

    await expect(handler(event)).resolves.toBeUndefined();

    // Ensure a parsing ERROR progress patch was emitted
    const patches = spies.upsertProgress.mock.calls.map((c) => c[2]);
    expect(
      patches.some(
        (p) =>
          p?.status === 'ERROR' &&
          /Error parsing quiz JSON/i.test(String(p?.message || '')),
      ),
    ).toBe(true);

    // Quiz.create must not be called on parse failure
    expect(spies.quizCreate).not.toHaveBeenCalled();

    // OpenAI called once
    expect(openAiCreate).toHaveBeenCalledTimes(1);

    // Final status is ERROR (outer catch also sets ERROR)
    expect(lastStatus()).toBe('ERROR');
  });
});
