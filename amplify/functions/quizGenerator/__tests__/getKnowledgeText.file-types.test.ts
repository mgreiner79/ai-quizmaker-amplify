// amplify/functions/quizGenerator/tests/getKnowledgeText.file-types.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCtx, makeCb } from './lambdaHelpers';

// Hoisted spies so mock factories can reference them
const spies = vi.hoisted(() => ({
  progUpdate: vi.fn(), // CreationProgress.update
  progCreate: vi.fn(), // CreationProgress.create
  quizCreate: vi.fn(), // Quiz.create
  downloadData: vi.fn(), // aws-amplify/storage.downloadData
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
  downloadData: (...args: any[]) => spies.downloadData(...args),
}));
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: openAiCreate } },
  })),
}));

// Mock the PDF reader used by the code
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

// Polyfill Blob in Node
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
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

// Helper to stub downloadData .result with a Blob made from text
function stubDownloadDataReturn(text: string) {
  spies.downloadData.mockReturnValue({
    result: Promise.resolve({
      body: { blob: async () => new Blob([text]) },
    }),
  } as any);
}

function makeEvent(knowledgeKey: string) {
  return {
    arguments: {
      quizId: 'K-1',
      prompt: 'prompt',
      numQuestions: 1,
      knowledge: knowledgeKey,
    },
    request: { headers: { authorization: 'Bearer token' } },
    identity: { sub: 'owner-1' },
  } as any;
}

describe('getKnowledgeText via handler for different file extensions', () => {
  it('.txt → returns plain text in prompt and uses bucket params', async () => {
    process.env.BUCKET_NAME = 'bucket-a';
    process.env.BUCKET_REGION = 'eu-west-1';
    stubDownloadDataReturn('plain text content');

    const { handler } = await import('../handler');

    await handler(makeEvent('folder/file.txt'), makeCtx(), makeCb());

    // Assert OpenAI prompt contains the raw text
    const arg = openAiCreate.mock.calls[0][0];
    const promptStr = String(arg.messages[0].content);
    expect(promptStr).toContain('plain text content');

    // Assert S3 params used bucket envs
    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('folder/file.txt');
    expect(call.options?.bucket?.bucketName).toBe('bucket-a');
    expect(call.options?.bucket?.region).toBe('eu-west-1');
  });

  it('.json → returns pretty stringified JSON in prompt', async () => {
    process.env.BUCKET_NAME = 'bucket-b';
    process.env.BUCKET_REGION = 'us-east-1';
    const obj = { a: 1, b: { c: true } };
    stubDownloadDataReturn(JSON.stringify(obj));

    const { handler } = await import('../handler');

    await handler(makeEvent('data/config.json'), makeCtx(), makeCb());

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
  });

  it('.pdf → parsed text from pdfreader appears in prompt', async () => {
    process.env.BUCKET_NAME = 'bucket-c';
    process.env.BUCKET_REGION = 'ap-southeast-1';
    // Blob content irrelevant; parser reads Buffer regardless
    stubDownloadDataReturn('dummy bytes');

    const { handler } = await import('../handler');

    await handler(makeEvent('docs/file.pdf'), makeCtx(), makeCb());

    const arg = openAiCreate.mock.calls[0][0];
    const promptStr = String(arg.messages[0].content);

    // From our mocked PdfReader: lines joined with \n
    expect(promptStr).toContain('PDF-Line-1');
    expect(promptStr).toContain('PDF-Line-2');

    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('docs/file.pdf');
    expect(call.options?.bucket?.bucketName).toBe('bucket-c');
    expect(call.options?.bucket?.region).toBe('ap-southeast-1');
  });

  it('.unknown → treated as text', async () => {
    process.env.BUCKET_NAME = 'bucket-d';
    process.env.BUCKET_REGION = 'eu-central-1';
    stubDownloadDataReturn('unknown ext content');

    const { handler } = await import('../handler');

    await handler(makeEvent('misc/file.dat'), makeCtx(), makeCb());

    const arg = openAiCreate.mock.calls[0][0];
    const promptStr = String(arg.messages[0].content);
    expect(promptStr).toContain('unknown ext content');

    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('misc/file.dat');
    expect(call.options?.bucket?.bucketName).toBe('bucket-d');
    expect(call.options?.bucket?.region).toBe('eu-central-1');
  });
});
