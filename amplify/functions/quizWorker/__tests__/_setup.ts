import { vi } from 'vitest';

// Stable no-op Amplify config
vi.mock('aws-amplify', () => ({ Amplify: { configure: vi.fn() } }));

// Stable backend runtime
vi.mock('@aws-amplify/backend/function/runtime', () => ({
  getAmplifyDataClientConfig: vi.fn().mockResolvedValue({
    resourceConfig: {},
    libraryOptions: {},
  }),
}));

// Storage default mock; override per test if needed
vi.mock('aws-amplify/storage', () => ({
  downloadData: vi.fn().mockResolvedValue({
    result: Promise.resolve({
      body: { blob: async () => new Blob([`Sample knowledge text`]) },
    }),
  }),
}));

// Worker env (note: LLM_API_KEY now)
vi.mock('$amplify/env/quiz-worker', () => ({
  env: { LLM_API_KEY: 'test-key' },
}));
