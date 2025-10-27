// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Polyfill Blob for Node
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

const spies = vi.hoisted(() => ({
  quizCreate: vi.fn(),
  downloadData: vi.fn(),
  upsertProgress: vi.fn(),
}));
const openAiCreate = vi.hoisted(() => vi.fn());

/** ---- Base mocks ---- */
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));
vi.mock('@aws-amplify/backend/function/runtime', () => ({
  getAmplifyDataClientConfig: vi
    .fn()
    .mockResolvedValue({ resourceConfig: {}, libraryOptions: {} }),
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
  downloadData: (...a: any[]) => spies.downloadData(...a),
}));
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: openAiCreate } },
  })),
}));

// Mock progress helper used by the worker
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

beforeEach(() => {
  vi.clearAllMocks();

  // Default OpenAI success payload (not used when we fail early)
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

  // Default successful Quiz.create
  spies.quizCreate.mockResolvedValue({ data: { id: 'qid' } });
});

function sqsEventWithBody(body: Record<string, any>) {
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

describe('quizWorker getKnowledgeText failure paths', () => {
  it('S3 download failure → worker catches, sets ERROR progress, does not call OpenAI', async () => {
    process.env.BUCKET_NAME = 'bkt-x';
    process.env.BUCKET_REGION = 'eu-west-1';

    // Defer and then reject downloadData().result so the awaiter is attached
    let reject!: (e: any) => void;
    const result = new Promise<never>((_res, rej) => {
      reject = rej;
    });
    spies.downloadData.mockReturnValue({ result });

    const { handler } = await import('../handler');

    const event = sqsEventWithBody({
      quizId: 'K-ERR',
      prompt: 'p',
      numQuestions: 1,
      knowledge: 'notes/file.txt',
      ownerSub: 'owner-1',
    });

    const run = handler(event);
    // now cause the failure
    reject(new Error('S3 error'));

    await expect(run).resolves.toBeUndefined();

    // download was attempted with correct bucket + key
    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('notes/file.txt');
    expect(call.options?.bucket?.bucketName).toBe('bkt-x');
    expect(call.options?.bucket?.region).toBe('eu-west-1');

    // no LLM call on failure
    expect(openAiCreate).not.toHaveBeenCalled();

    // progress was set to ERROR
    const statusArgs = spies.upsertProgress.mock.calls.map(
      ([, , patch]) => patch.status,
    );
    expect(statusArgs).toContain('ERROR');

    // quiz not created on failure
    expect(spies.quizCreate).not.toHaveBeenCalled();
  });

  it('PDF parse failure → worker catches, sets ERROR progress, does not call OpenAI', async () => {
    process.env.BUCKET_NAME = 'bkt-y';
    process.env.BUCKET_REGION = 'us-east-1';

    // Successful S3 read returning a dummy Blob
    spies.downloadData.mockReturnValue({
      result: Promise.resolve({
        body: { blob: async () => new Blob(['dummy']) },
      }),
    });

    // Cause PdfReader to error during parse
    vi.doMock('pdfreader', () => ({
      PdfReader: class {
        parseBuffer(_buf: Buffer, cb: (err: any, item: any) => void) {
          cb(new Error('parse boom'), null);
        }
      },
    }));

    const { handler } = await import('../handler');

    const event = sqsEventWithBody({
      quizId: 'K-PDF',
      prompt: 'p',
      numQuestions: 1,
      knowledge: 'docs/bad.pdf',
      ownerSub: 'owner-2',
    });

    await expect(handler(event)).resolves.toBeUndefined();

    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('docs/bad.pdf');
    expect(call.options?.bucket?.bucketName).toBe('bkt-y');
    expect(call.options?.bucket?.region).toBe('us-east-1');

    expect(openAiCreate).not.toHaveBeenCalled();
    const statusArgs = spies.upsertProgress.mock.calls.map(
      ([, , patch]) => patch.status,
    );
    expect(statusArgs).toContain('ERROR');
    expect(spies.quizCreate).not.toHaveBeenCalled();
  });
});
