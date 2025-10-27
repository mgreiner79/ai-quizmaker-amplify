// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Polyfill Blob (not needed here, but keeps parity if you add knowledge later)
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
// Storage isn’t used in this happy path (no knowledge), keep noop to avoid accidental calls
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

function statusesFromUpserts() {
  return spies.upsertProgress.mock.calls.map((c) => c[2]?.status);
}

/* -------------------- Test -------------------- */
describe('quizWorker handler - happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits progress updates, creates quiz, resolves', async () => {
    const quizId = 'QUIZ-123';
    const ownerSub = 'OWNER-ABC';
    const prompt = 'Make a 1-question quiz about planets.';
    const numQuestions = 1;

    const llmQuiz = {
      title: 'Space Basics',
      description: 'Test your knowledge about planets.',
      previewTime: 5,
      answerTime: 20,
      maxPoints: 3000,
      questions: [
        {
          id: 'Q1',
          text: 'Which planet is known as the Red Planet?',
          previewTime: 5,
          answerTime: 20,
          maxPoints: 3000,
          correctAnswerId: 'A2',
          explanation: 'Mars appears red due to iron oxide on its surface.',
          answers: [
            { id: 'A1', text: 'Venus', message: 'Too hot and not red.' },
            { id: 'A2', text: 'Mars', message: 'Correct.' },
            { id: 'A3', text: 'Jupiter', message: 'That is a gas giant.' },
            { id: 'A4', text: 'Mercury', message: 'Closest to the sun.' },
          ],
        },
      ],
    };

    // LLM returns valid JSON
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(llmQuiz) } }],
    });

    const createdQuizRecord = {
      id: quizId,
      title: llmQuiz.title,
      description: llmQuiz.description,
      prompt,
      previewTime: llmQuiz.previewTime,
      answerTime: llmQuiz.answerTime,
      questions: llmQuiz.questions,
      maxPoints: llmQuiz.maxPoints,
      knowledgeFileKey: undefined,
      owner: ownerSub,
    };
    spies.quizCreate.mockResolvedValue({ data: createdQuizRecord });

    const { handler } = await import('../handler');

    // No knowledge → worker should skip EXTRACTING
    const event = sqsEvent({ quizId, prompt, numQuestions, ownerSub });

    await expect(handler(event)).resolves.toBeUndefined();

    // Progress sequence (no EXTRACTING)
    expect(statusesFromUpserts()).toEqual([
      'WARMING_UP',
      'GENERATING',
      'CREATED',
    ]);

    // Quiz.create called once with expected fields
    expect(spies.quizCreate).toHaveBeenCalledTimes(1);
    expect(spies.quizCreate.mock.calls[0][0]).toMatchObject({
      id: quizId,
      owner: ownerSub,
      title: llmQuiz.title,
      description: llmQuiz.description,
      prompt,
    });

    // OpenAI called once
    expect(openAiCreate).toHaveBeenCalledTimes(1);
  });
});
