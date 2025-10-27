// amplify/backend.ts

import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { quizEnqueue } from './functions/quizEnqueue/resource';
import { quizWorker } from './functions/quizWorker/resource';

import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

const backend = defineBackend({
  auth,
  data,
  quizEnqueue,
  quizWorker,
  storage,
});

const dlq = new sqs.Queue(backend.stack, 'QuizDLQ', {
  retentionPeriod: cdk.Duration.days(7),
});

const queue = new sqs.Queue(backend.stack, 'QuizGenQueue', {
  visibilityTimeout: cdk.Duration.minutes(15),
  retentionPeriod: cdk.Duration.minutes(30),
  deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
});

// enqueue → send permissions + env
queue.grantSendMessages(backend.quizEnqueue.resources.lambda);
backend.quizEnqueue.addEnvironment('QUEUE_URL', queue.queueUrl);

// worker ← SQS event source + S3 read
backend.quizWorker.resources.lambda.addEventSource(
  new SqsEventSource(queue, { batchSize: 1 }),
);
backend.storage.resources.bucket.grantRead(backend.quizWorker.resources.lambda);

// This is needed because this lambda is not included in the data resource.
backend.quizWorker.addEnvironment(
  'AMPLIFY_DATA_GRAPHQL_ENDPOINT',
  backend.data.graphqlUrl,
);

backend.quizWorker.addEnvironment(
  'BUCKET_NAME',
  backend.storage.resources.bucket.bucketName,
);
backend.quizWorker.addEnvironment(
  'BUCKET_REGION',
  backend.storage.stack.region,
);

backend.storage.resources.bucket.grantRead(backend.quizWorker.resources.lambda);
