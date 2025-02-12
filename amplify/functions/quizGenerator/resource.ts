import { defineFunction, secret } from '@aws-amplify/backend';

export const quizGenerator = defineFunction({
  name: 'quiz-generator',
  entry: './handler.ts',
  timeoutSeconds: 600,
  environment: {
    OPENAI_API_KEY:  secret('llm-api-token')
  }
});
