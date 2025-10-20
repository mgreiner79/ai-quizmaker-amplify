// amplify/functions/quizGenerator/tests/getKnowledgeText.failure-paths.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCtx, makeCb } from './lambdaHelpers';

// Polyfill Blob for Node
// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

const spies = vi.hoisted(() => ({
  progUpdate: vi.fn(),
  progCreate: vi.fn(),
  quizCreate: vi.fn(),
  downloadData: vi.fn(),
}));
const openAiCreate = vi.hoisted(() => vi.fn());

// Base mocks (owned by this file)
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));
vi.mock('@aws-amplify/backend/function/runtime', () => ({
  getAmplifyDataClientConfig: vi
    .fn()
    .mockResolvedValue({ resourceConfig: {}, libraryOptions: {} }),
}));
vi.mock('$amplify/env/quiz-generator', () => ({
  env: { OPENAI_API_KEY: 'test-key' },
}));
vi.mock('aws-amplify/data', () => ({
  generateClient: vi.fn().mockImplementation(() => ({
    models: {
      CreationProgress: { update: spies.progUpdate, create: spies.progCreate },
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

beforeEach(() => {
  vi.clearAllMocks();
  // Don’t resetModules here; our mocks are defined at module scope.
  spies.quizCreate.mockResolvedValue({ data: { id: 'qid' } });
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
});

function eventWithKey(key: string) {
  return {
    arguments: {
      quizId: 'K-ERR',
      prompt: 'p',
      numQuestions: 1,
      knowledge: key,
    },
    request: { headers: { authorization: 'Bearer token' } },
    identity: { sub: 'owner-1' },
  } as any;
}

describe('getKnowledgeText failure paths', () => {
  it('S3 download failure → throws "Failed to retrieve or process knowledge file."', async () => {
    process.env.BUCKET_NAME = 'bkt-x';
    process.env.BUCKET_REGION = 'eu-west-1';

    // deferred promise for downloadData().result
    let reject!: (e: any) => void;
    const result = new Promise<never>((_res, rej) => {
      reject = rej;
    });

    spies.downloadData.mockReturnValue({ result });

    const { handler } = await import('../handler');

    // start the handler first, then reject so the awaiter is attached
    const run = handler(eventWithKey('notes/file.txt'), makeCtx(), makeCb());
    reject(new Error('S3 error'));

    await expect(run).rejects.toThrow(
      /Failed to retrieve or process knowledge file/i,
    );

    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('notes/file.txt');
    expect(call.options?.bucket?.bucketName).toBe('bkt-x');
    expect(call.options?.bucket?.region).toBe('eu-west-1');
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it('PDF parse failure → throws "Failed to retrieve or process knowledge file."', async () => {
    process.env.BUCKET_NAME = 'bkt-y';
    process.env.BUCKET_REGION = 'us-east-1';

    spies.downloadData.mockReturnValue({
      result: Promise.resolve({
        body: { blob: async () => new Blob(['dummy']) },
      }),
    });

    // Mock pdfreader BEFORE importing handler
    vi.doMock('pdfreader', () => ({
      PdfReader: class {
        parseBuffer(_buf: Buffer, cb: (err: any, item: any) => void) {
          cb(new Error('parse boom'), null);
        }
      },
    }));

    const { handler } = await import('../handler');

    await expect(
      handler(eventWithKey('docs/bad.pdf'), makeCtx(), makeCb()),
    ).rejects.toThrow(/Failed to retrieve or process knowledge file/i);

    const call = spies.downloadData.mock.calls[0][0];
    expect(call.path).toBe('docs/bad.pdf');
    expect(call.options?.bucket?.bucketName).toBe('bkt-y');
    expect(call.options?.bucket?.region).toBe('us-east-1');
    expect(openAiCreate).not.toHaveBeenCalled();
  });
});
