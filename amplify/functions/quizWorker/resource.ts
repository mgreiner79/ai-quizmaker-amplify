import { defineFunction, secret } from '@aws-amplify/backend';

export const quizWorker = defineFunction({
  name: 'quiz-worker',
  entry: './handler.ts',
  timeoutSeconds: 900,
  memoryMB: 1024,
  environment: {
    LLM_API_KEY: secret('llm-api-token'),
  },
});
