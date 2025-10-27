// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Polyfill Blob in Node
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

/* -------------------- Hoisted spies -------------------- */
const spies = vi.hoisted(() => ({
  quizCreate: vi.fn(), // models.Quiz.create
  downloadData: vi.fn(), // aws-amplify/storage.downloadData
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
vi.mock('aws-amplify/storage', () => ({
  downloadData: (...args: any[]) => spies.downloadData(...args),
}));
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: openAiCreate } },
  })),
}));

// Mock the progress helper used by the worker
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

// Mock the PDF reader used by the code (success path)
vi.mock('pdfreader', () => ({
  PdfReader: class {
    parseBuffer(_buf: Buffer, cb: (err: any, item: any) => void) {
      // deterministic sequence: two text items then EOF
      cb(null, { text: 'PDF-Line-1' });
      cb(null, { text: 'PDF-Line-2' });
      cb(null, null);
    }
  },
}));

beforeEach(() => {
  vi.clearAllMocks();

  // default Quiz.create result (success)
  spies.quizCreate.mockResolvedValue({ data: { id: 'qid' } });

  // default OpenAI response (valid JSON)
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
            questions: [],
          }),
        },
      },
    ],
  });
});

/* -------------------- helpers -------------------- */
function stubDownloadDataReturn(text: string) {
  spies.downloadData.mockReturnValue({
    result: Promise.resolve({
      body: { blob: async () => new Blob([text]) },
    }),
  } as any);
}

function sqsEvent(
  knowledgeKey: string,
  overrides?: Partial<Record<string, any>>,
) {
  const body = {
    quizId: 'K-1',
    prompt: 'prompt',
    numQuestions: 1,
    ownerSub: 'owner-1',
    knowledge: knowledgeKey,
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

function statusesCalled() {
  return spies.upsertProgress.mock.calls.map(([, , patch]) => patch.status);
}

/* -------------------- tests -------------------- */

describe('quizWorker getKnowledgeText via handler for different file extensions', () => {
  it('.txt → returns plain text in prompt and uses bucket params', async () => {
    process.env.BUCKET_NAME = 'bucket-a';
    process.env.BUCKET_REGION = 'eu-west-1';
    stubDownloadDataReturn('plain text content');

    const { handler } = await import('../handler');

    await expect(handler(sqsEvent('folder/file.txt'))).resolves.toBeUndefined();

    // Assert OpenAI prompt contains the raw text
    const arg = openAiCreate.mock.calls[0][0];
    const promptStr = String(arg.messages[0].content);
    expect(promptStr).toContain('plain text content');

    // Assert S3 params used bucket envs
    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('folder/file.txt');
    expect(call.options?.bucket?.bucketName).toBe('bucket-a');
    expect(call.options?.bucket?.region).toBe('eu-west-1');

    // Status flow includes WARMING_UP, EXTRACTING, GENERATING, CREATED
    const statuses = statusesCalled();
    expect(statuses).toContain('WARMING_UP');
    expect(statuses).toContain('EXTRACTING');
    expect(statuses).toContain('GENERATING');
    expect(statuses).toContain('CREATED');

    // Quiz created
    expect(spies.quizCreate).toHaveBeenCalledTimes(1);
  });

  it('.json → returns pretty stringified JSON in prompt', async () => {
    process.env.BUCKET_NAME = 'bucket-b';
    process.env.BUCKET_REGION = 'us-east-1';
    const obj = { a: 1, b: { c: true } };
    stubDownloadDataReturn(JSON.stringify(obj));

    const { handler } = await import('../handler');

    await expect(
      handler(sqsEvent('data/config.json')),
    ).resolves.toBeUndefined();

    const arg = openAiCreate.mock.calls[0][0];
    const promptStr = String(arg.messages[0].content);

    // Pretty stringified form should include indentation and keys
    expect(promptStr).toContain('"a": 1');
    expect(promptStr).toContain('"b": {');

    // S3 args include env
    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('data/config.json');
    expect(call.options?.bucket?.bucketName).toBe('bucket-b');
    expect(call.options?.bucket?.region).toBe('us-east-1');

    const statuses = statusesCalled();
    expect(statuses).toContain('WARMING_UP');
    expect(statuses).toContain('EXTRACTING');
    expect(statuses).toContain('GENERATING');
    expect(statuses).toContain('CREATED');

    expect(spies.quizCreate).toHaveBeenCalledTimes(1);
  });

  it('.pdf → parsed text from pdfreader appears in prompt', async () => {
    process.env.BUCKET_NAME = 'bucket-c';
    process.env.BUCKET_REGION = 'ap-southeast-1';
    // Blob content irrelevant; parser reads Buffer regardless
    stubDownloadDataReturn('dummy bytes');

    const { handler } = await import('../handler');

    await expect(handler(sqsEvent('docs/file.pdf'))).resolves.toBeUndefined();

    const arg = openAiCreate.mock.calls[0][0];
    const promptStr = String(arg.messages[0].content);

    // From our mocked PdfReader: lines joined with \n
    expect(promptStr).toContain('PDF-Line-1');
    expect(promptStr).toContain('PDF-Line-2');

    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('docs/file.pdf');
    expect(call.options?.bucket?.bucketName).toBe('bucket-c');
    expect(call.options?.bucket?.region).toBe('ap-southeast-1');

    const statuses = statusesCalled();
    expect(statuses).toContain('WARMING_UP');
    expect(statuses).toContain('EXTRACTING');
    expect(statuses).toContain('GENERATING');
    expect(statuses).toContain('CREATED');

    expect(spies.quizCreate).toHaveBeenCalledTimes(1);
  });

  it('.unknown → treated as text', async () => {
    process.env.BUCKET_NAME = 'bucket-d';
    process.env.BUCKET_REGION = 'eu-central-1';
    stubDownloadDataReturn('unknown ext content');

    const { handler } = await import('../handler');

    await expect(handler(sqsEvent('misc/file.dat'))).resolves.toBeUndefined();

    const arg = openAiCreate.mock.calls[0][0];
    const promptStr = String(arg.messages[0].content);
    expect(promptStr).toContain('unknown ext content');

    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('misc/file.dat');
    expect(call.options?.bucket?.bucketName).toBe('bucket-d');
    expect(call.options?.bucket?.region).toBe('eu-central-1');

    const statuses = statusesCalled();
    expect(statuses).toContain('WARMING_UP');
    expect(statuses).toContain('EXTRACTING');
    expect(statuses).toContain('GENERATING');
    expect(statuses).toContain('CREATED');

    expect(spies.quizCreate).toHaveBeenCalledTimes(1);
  });
});
