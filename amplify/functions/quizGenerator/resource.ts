import { defineFunction, secret } from '@aws-amplify/backend';

export const quizGenerator = defineFunction({
  name: 'quiz-generator',
  entry: './handler.ts',
  timeoutSeconds: 600,
  environment: {
    OPENAI_API_KEY: "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"//secret('llm-api-key')
  }
});
