import { vi } from 'vitest';
import type { Context, Callback } from 'aws-lambda';

/* ---------- Data client mock via global ref ---------- */
declare global {
  // eslint-disable-next-line no-var
  var __DATA_CLIENT__:
    | {
        createProgress: ReturnType<typeof vi.fn>;
        updateProgress: ReturnType<typeof vi.fn>;
        createQuiz: ReturnType<typeof vi.fn>;
      }
    | undefined;

  // eslint-disable-next-line no-var
  var __OPENAI_CREATE__: ReturnType<typeof vi.fn> | undefined;
}

export function mockDataClient(
  overrides?: Partial<NonNullable<typeof globalThis.__DATA_CLIENT__>>,
) {
  globalThis.__DATA_CLIENT__ = {
    createProgress: vi.fn(),
    updateProgress: vi.fn(),
    createQuiz: vi.fn(),
    ...(overrides ?? {}),
  };

  vi.mock('aws-amplify/data', () => ({
    generateClient: vi.fn().mockImplementation(() => ({
      models: {
        CreationProgress: {
          update: globalThis.__DATA_CLIENT__!.updateProgress,
          create: globalThis.__DATA_CLIENT__!.createProgress,
        },
        Quiz: {
          create: globalThis.__DATA_CLIENT__!.createQuiz,
        },
      },
    })),
  }));

  return globalThis.__DATA_CLIENT__!;
}

/* ---------- OpenAI mock via global ref ---------- */
export function mockOpenAI(payload?: unknown) {
  globalThis.__OPENAI_CREATE__ = vi.fn();
  if (payload !== undefined) {
    globalThis.__OPENAI_CREATE__.mockResolvedValue(payload);
  }
  vi.mock('openai', () => ({
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: globalThis.__OPENAI_CREATE__! } },
    })),
  }));
  return { create: globalThis.__OPENAI_CREATE__! };
}

/* ---------- helpers ---------- */

export async function importHandler() {
  vi.resetModules();
  return import('../handler');
}

export function statusesFrom(spy: ReturnType<typeof vi.fn>): string[] {
  return spy.mock.calls.map((c) => c[0]?.status);
}
