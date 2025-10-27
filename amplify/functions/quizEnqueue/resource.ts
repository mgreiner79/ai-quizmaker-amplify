// amplify/functions/quizEnqueue/resource.ts

import { defineFunction } from '@aws-amplify/backend';

export const quizEnqueue = defineFunction({
  name: 'quiz-enqueue',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
  resourceGroupName: 'data',
});
