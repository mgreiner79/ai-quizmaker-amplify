import { Amplify } from 'aws-amplify';
import { generateClient, get } from 'aws-amplify/data';
import { Schema } from '../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/quiz-enqueue';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env,
);
Amplify.configure(resourceConfig, libraryOptions);

type EnqueueBody = {
  quizId: string;
  prompt: string;
  numQuestions: number;
  knowledge?: string;
  ownerSub: string;
};
export const handler: Schema['quizGenerator']['functionHandler'] = async (
  event,
) => {
  // Fast validation
  const { quizId, prompt, numQuestions } = event.arguments;
  if (!quizId || !prompt || !numQuestions) {
    throw new Error(
      'Missing required parameters: quizId, prompt, numQuestions',
    );
  }
  const knowledge =
    typeof event.arguments.knowledge === 'string'
      ? event.arguments.knowledge
      : undefined;

  const ownerSub =
    event?.identity && 'sub' in event.identity
      ? (event.identity.sub as string)
      : (() => {
          throw new Error('Missing identity.sub');
        })();

  const queueUrl = process.env.QUEUE_URL;
  if (!queueUrl) {
    throw new Error('QUEUE_URL is not set');
  }

  const client = generateClient<Schema>({ authMode: 'iam' });
  const progress = await client.models.CreationProgress.create({
    id: quizId,
    status: 'WARMING_UP',
    message: 'Warming up',
    errorText: '',
  });

  // Send message to SQS
  const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
  const sqsClient = new SQSClient({});
  const body: EnqueueBody = {
    quizId,
    prompt,
    numQuestions,
    knowledge,
    ownerSub,
  };
  const sendCommand = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(body),
  });
  await sqsClient.send(sendCommand);
  return progress.data;
};
