// @vitest-environment node
// amplify/functions/quizGenerator/tests/handler.happy-path.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context, Callback } from 'aws-lambda';

/**
 * Mocks
 * Order matters: define all mocks BEFORE importing the handler module,
 * since the handler configures Amplify at module load.
 */

// Mock Amplify configure (no-op)
vi.mock('aws-amplify', () => ({
  Amplify: { configure: vi.fn() },
}));

// Mock env wiring used by the Lambda
vi.mock('$amplify/env/quiz-generator', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
  },
}));

// Mock backend runtime config fetch
vi.mock('@aws-amplify/backend/function/runtime', () => ({
  getAmplifyDataClientConfig: vi.fn().mockResolvedValue({
    resourceConfig: {},
    libraryOptions: {},
  }),
}));

// Capture spies for the generated data client and storage
const clientSpies = vi.hoisted(() => ({
  createProgress: vi.fn(),
  updateProgress: vi.fn(),
  createQuiz: vi.fn(),
}));

vi.mock('aws-amplify/data', () => {
  return {
    generateClient: vi.fn().mockImplementation(() => ({
      models: {
        CreationProgress: {
          // upsertProgress first tries update; happy path uses update only
          update: clientSpies.updateProgress,
          create: clientSpies.createProgress,
        },
        Quiz: {
          create: clientSpies.createQuiz,
        },
      },
    })),
  };
});

// downloadData is not used in this happy-path test (no knowledge file),
// but we mock it to keep the surface predictable if future changes enable it.
vi.mock('aws-amplify/storage', () => ({
  downloadData: vi.fn().mockResolvedValue({
    result: Promise.resolve({
      body: {
        blob: async () => new Blob([`Sample knowledge text`]),
      },
    }),
  }),
}));

// Mock OpenAI with a deterministic quiz JSON payload
const openAiSpies = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: openAiSpies.create,
        },
      },
    })),
  };
});

beforeEach(() => {
  vi.resetAllMocks();
  clientSpies.createProgress.mockReset();
  clientSpies.updateProgress.mockReset();
  clientSpies.createQuiz.mockReset();
  openAiSpies.create.mockReset();
});

describe('quizGenerator handler - happy path', () => {
  it('emits progress updates, creates quiz with owner, and returns created record', async () => {
    // Arrange
    const quizId = 'QUIZ-123';
    const ownerSub = 'OWNER-ABC';
    const prompt = 'Make a 1-question quiz about planets.';
    const numQuestions = 1;

    // Valid JSON matching the expected schema
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

    openAiSpies.create.mockResolvedValue({
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

    clientSpies.createQuiz.mockResolvedValue({ data: createdQuizRecord });

    // Import the handler AFTER mocks are set up
    const { handler } = await import('../handler');

    const event = {
      arguments: {
        quizId,
        prompt,
        numQuestions,
        // No knowledge file → no EXTRACTING phase in this happy path
      },
      request: { headers: { authorization: 'Bearer test-token' } },
      identity: { sub: ownerSub },
    } as any;

    // Act
    const ctx: Context = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'quiz-generator',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:eu:acct:function:quiz-generator',
      memoryLimitInMB: '128',
      awsRequestId: 'req-1',
      logGroupName: '/aws/lambda/quiz-generator',
      logStreamName: '2025/10/19/[$LATEST]test',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    };
    const cb: Callback<any> = vi.fn();
    const result = await handler(event as any, ctx, cb);

    // Assert: progress updates were called in order
    const statuses = clientSpies.updateProgress.mock.calls.map(
      (args) => args[0]?.status,
    );

    // upsertProgress is called with { id, ...patch }, so read `status` off the arg object
    // Expected sequence: WARMING_UP → GENERATING → CREATED
    expect(statuses).toEqual(['WARMING_UP', 'GENERATING', 'CREATED']);

    // Assert: Quiz.create called exactly once, with owner from identity.sub
    expect(clientSpies.createQuiz).toHaveBeenCalledTimes(1);
    const createArgs = clientSpies.createQuiz.mock.calls[0][0];

    expect(createArgs).toMatchObject({
      id: quizId,
      title: llmQuiz.title,
      description: llmQuiz.description,
      prompt,
      previewTime: llmQuiz.previewTime,
      answerTime: llmQuiz.answerTime,
      questions: llmQuiz.questions,
      maxPoints: llmQuiz.maxPoints,
      owner: ownerSub,
    });

    // Final return equals the created quiz record
    expect(result).toEqual(createdQuizRecord);
  });
});
