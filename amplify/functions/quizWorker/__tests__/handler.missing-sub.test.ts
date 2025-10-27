// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Polyfill Blob for parity
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

/* -------------------- Hoisted spies -------------------- */
const spies = vi.hoisted(() => ({
  quizCreate: vi.fn(), // models.Quiz.create
  upsertProgress: vi.fn(), // ../_shared/progress.upsertProgress
}));
const openAiCreate = vi.hoisted(() => vi.fn());

/* -------------------- Mocks -------------------- */
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

/* -------------------- Shared LLM payload (unused now) -------------------- */
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

/* -------------------- Tests -------------------- */
describe('quizWorker - missing ownerSub (identity.sub equivalent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ownerSub present but falsy/empty → posts only one ERROR progress, no LLM, no quiz', async () => {
    // LLM should NOT be called, but stub anyway for safety
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(llmQuiz) } }],
    });

    const { handler } = await import('../handler');

    const event = sqsEvent({
      quizId: 'q-1',
      prompt: 'p',
      numQuestions: 3,
      ownerSub: '', // missing identity
    });

    await expect(handler(event)).resolves.toBeUndefined();

    // LLM not called at all because ownerSub check is before try/LLM
    expect(openAiCreate).not.toHaveBeenCalled();
    // No quiz creation
    expect(spies.quizCreate).not.toHaveBeenCalled();

    // Exactly one upsert: ERROR (pre-try check)
    expect(spies.upsertProgress).toHaveBeenCalledTimes(1);
    const patch = spies.upsertProgress.mock.calls[0][2];
    expect(patch.status).toBe('ERROR');
    expect(String(patch.message || '')).toMatch(/Error determining user/i);
    expect(String(patch.errorText || '')).toMatch(/ownerSub/i);
  });

  it('ownerSub omitted → posts only one ERROR progress, no LLM, no quiz', async () => {
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(llmQuiz) } }],
    });

    const { handler } = await import('../handler');

    const event = sqsEvent({
      quizId: 'q-2',
      prompt: 'p2',
      numQuestions: 2,
      // ownerSub missing
    });

    await expect(handler(event)).resolves.toBeUndefined();

    expect(openAiCreate).not.toHaveBeenCalled();
    expect(spies.quizCreate).not.toHaveBeenCalled();

    expect(spies.upsertProgress).toHaveBeenCalledTimes(1);
    const patch = spies.upsertProgress.mock.calls[0][2];
    expect(patch.status).toBe('ERROR');
    expect(String(patch.message || '')).toMatch(/Error determining user/i);
    expect(String(patch.errorText || '')).toMatch(/ownerSub/i);
  });
});
