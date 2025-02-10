import OpenAI from 'openai';
import { generateClient } from 'aws-amplify/data';
import { v4 as uuidv4 } from 'uuid';
import type { Schema } from '../../data/resource';
import schema from './schema';
import { env } from '$amplify/env/quiz-generator';
import outputs from '../../../amplify_outputs.json';
import { Amplify } from 'aws-amplify';

Amplify.configure(outputs);


const llmClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

export const handler: Schema['quizGenerator']['functionHandler'] = async (
  event,
) => {
  // Parse the incoming request
  console.log(event)
  const { knowledge, description, numQuestions } = event.arguments;
  const jwtToken = event.request.headers.authorization

  // Validation
  if (!description || !numQuestions) {
    throw new Error('Missing required parameters');
  }


  // Construct the prompt for OpenAI
  const prompt = `
    You are a quiz generator. Given the following knowledge:
    ${knowledge}

    Generate a quiz with the following description:
    ${description}

    The quiz should have ${numQuestions} questions. Each question should include:
    - text: the question text
    - previewTime: time in seconds to preview the question (if it overrides the default)
    - answerTime: time in seconds for answering the question (if it overrides the default)
    - maxPoints: maximum points for a correct answer (if it overrides the default)
    - answers: an array of 4 answers, each with a text and a message
    - correctAnswerId: the id of the correct answer
    - explanation: an explanation for the answer

    Use as the following defaults:
    - previewTime: 10
    - answerTime: 30
    - maxPoints: 3000

    Respond with valid JSON.
    `;

  console.log(schema)
  const chatCompletion = await llmClient.chat.completions.create({
    messages: [{ role: 'system', content: prompt }],
    model: 'gpt-4o',
    temperature: 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: schema,
    },
  });

  const parsedQuiz = JSON.parse(
    chatCompletion.choices[0].message.content ?? '{}',
  );

  console.log(parsedQuiz)

  const quizId = uuidv4();

  // We need to know the user who triggered this function in order to set the 'owner' property
  // on the Quiz item.
  let sub = ""
  if (event.identity && "sub" in event.identity) {
    sub = event.identity.sub
  }
  else {
    throw new Error("Could not determine the user who triggered this function. 'sub' not found in event.identity. This function must be triggered by a user.")
  }
  
  const token = event.request.headers.authorization
  const client = generateClient<Schema>({
    authToken: token
  });
  
  await client.models.Quiz.create({
    title: parsedQuiz.title,
    id: quizId,
    description: parsedQuiz.description,
    previewTime: parsedQuiz.previewTime,
    answerTime: parsedQuiz.answerTime,
    questions: parsedQuiz.questions,
    maxPoints: parsedQuiz.maxPoints,
    knowledgeFileKey: parsedQuiz.knowledgeFileKey,
    owner: sub,
  });

  console.log("Finished creating quiz")


  const quiz = await client.models.Quiz.get({ id: quizId });
  console.log(quiz)

  if (!quiz['data']) {
    throw Error;
  }

  return quiz['data'];
};
