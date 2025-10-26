import { SQSEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import OpenAI from 'openai';
import { generateClient } from 'aws-amplify/data';
import { downloadData } from 'aws-amplify/storage';
import schema from './schema';
import type { Schema } from '../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/quiz-worker';

const LLM_MODEL = 'gpt-40';
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env,
);
Amplify.configure(resourceConfig, libraryOptions);

const llmClient = new OpenAI({
  apiKey: env.LLM_API_KEY,
});

const getKnowledgeText = async (knowledge: string): Promise<string> => {
  const bucketName = process.env.BUCKET_NAME ?? '';
  const bucketRegion = process.env.BUCKET_REGION ?? '';
  const s3Response = await downloadData({
    path: knowledge,
    options: { bucket: { bucketName, region: bucketRegion } },
  }).result;

  const fileBlob = await s3Response.body.blob();
  if (!fileBlob) throw new Error('File content is empty');

  const lower = knowledge.toLowerCase();
  if (lower.endsWith('.pdf')) {
    const { PdfReader } = await import('pdfreader');
    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    return await new Promise<string>((resolve, reject) => {
      let text = '';
      new PdfReader().parseBuffer(buffer, (err, item) => {
        if (err) reject(err);
        else if (!item) resolve(text);
        else if (item.text) text += item.text + '\n';
      });
    });
  } else if (lower.endsWith('.json')) {
    const json = JSON.parse(await fileBlob.text());
    return JSON.stringify(json, null, 2);
  } else {
    return await fileBlob.text();
  }
};

type ProgressPatch = {
  status?: 'WARMING_UP' | 'EXTRACTING' | 'GENERATING' | 'CREATED' | 'ERROR';
  message?: string;
  errorText?: string;
};

async function upsertProgress(
  client: ReturnType<typeof generateClient<Schema>>,
  quizId: string,
  patch: ProgressPatch,
) {
  try {
    await client.models.CreationProgress.update({ id: quizId, ...patch });
  } catch {
    await client.models.CreationProgress.create({
      id: quizId,
      status: 'WARMING_UP',
      message: 'Warming up',
      errorText: '',
      ...patch,
    });
  }
}

export const handler = async (event: SQSEvent) => {
  const client = generateClient<Schema>({ authMode: 'iam' });

  for (const record of event.Records) {
    const { quizId, knowledge, prompt, numQuestions, ownerSub } = JSON.parse(
      record.body,
    ) as {
      quizId: string;
      knowledge?: string;
      prompt: string;
      numQuestions: number;
      ownerSub: string;
    };

    try {
      await upsertProgress(client, quizId, {
        status: 'WARMING_UP',
        message: 'Warming up',
      });
      let knowledgeText = '';
      if (knowledge) {
        await upsertProgress(client, quizId, {
          status: 'EXTRACTING',
          message: 'Extracting knowledge',
        });
        knowledgeText = await getKnowledgeText(knowledge);
      }
      await upsertProgress(client, quizId, {
        status: 'GENERATING',
        message: 'Generating quiz',
      });

      const compiledPrompt = `
            You are a quiz generator. Given the following knowledge:
            ${knowledgeText}

            Generate a quiz with the following description:
            ${prompt}

            Make it so that the correct and incorrect answers have roughtly similar number of words in them.

            The quiz should have ${numQuestions} questions. Each question should include:
            - text: the question text
            - previewTime: time in seconds to preview the question (if it overrides the default)
            - answerTime: time in seconds for answering the question (if it overrides the default)
            - maxPoints: maximum points for a correct answer (if it overrides the default)
            - answers: an array of 4 answers, each with a text and a message
            - correctAnswerId: the id of the correct answer
            - explanation: an explanation for the answer

            Use as the following defaults:
            - previewTime: 5
            - answerTime: 20
            - maxPoints: 3000

            Respond with valid JSON.
        `;

      const chatCompletion = await llmClient.chat.completions.create({
        messages: [{ role: 'system', content: compiledPrompt }],
        model: LLM_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_schema', json_schema: schema },
      });

      const raw = chatCompletion.choices[0].message.content ?? '{}';
      let parsedQuiz: any;
      try {
        parsedQuiz = JSON.parse(raw);
      } catch (e) {
        await upsertProgress(client, quizId, {
          status: 'ERROR',
          message: 'Error parsing quiz JSON',
          errorText: 'Failed to parse generated quiz JSON.',
        });
        throw e;
      }

      const newQuiz = await client.models.Quiz.create({
        title: parsedQuiz.title,
        id: quizId,
        description: parsedQuiz.description,
        prompt,
        previewTime: parsedQuiz.previewTime,
        answerTime: parsedQuiz.answerTime,
        questions: parsedQuiz.questions,
        maxPoints: parsedQuiz.maxPoints,
        knowledgeFileKey: parsedQuiz.knowledgeFileKey,
        owner: ownerSub,
      });

      if (newQuiz.errors) {
        await upsertProgress(client, quizId, {
          status: 'ERROR',
          message: 'Error creating quiz',
          errorText: JSON.stringify(newQuiz.errors),
        });
        throw new Error('Quiz creation failed.');
      }

      await upsertProgress(client, quizId, {
        status: 'CREATED',
        message: 'Quiz generation complete',
      });
    } catch (error) {
      await upsertProgress(client, quizId, {
        status: 'ERROR',
        message: 'Error during quiz generation',
        errorText: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error('Worker error:', error);
    }
  }
};
