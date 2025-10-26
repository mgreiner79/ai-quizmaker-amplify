// amplify/functions/quizGenerator/tests/lambdaHelpers.ts
import { vi } from 'vitest';
import type { Context, Callback } from 'aws-lambda';

// @ts-ignore
if (!globalThis.Blob) globalThis.Blob = require('buffer').Blob;

export function makeCtx(overrides: Partial<Context> = {}): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'quiz-generator',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:eu:test:function:quiz-generator',
    memoryLimitInMB: '128',
    awsRequestId: 'req-test',
    logGroupName: '/aws/lambda/quiz-generator',
    logStreamName: 'test',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
    ...overrides,
  };
}

export function makeCb<T = any>(): Callback<T> {
  return vi.fn() as unknown as Callback<T>;
}
