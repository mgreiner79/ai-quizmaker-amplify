import { Amplify } from 'aws-amplify';
import OpenAI from 'openai';
import { generateClient } from 'aws-amplify/data';
import { downloadData } from 'aws-amplify/storage';
import schema from './schema';
import type { Schema } from '../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/quiz-generator'

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const llmClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});


export const handler: Schema['quizGenerator']['functionHandler'] = async (
  event,
) => {
  // Parse the incoming request
  console.log(event)
  const { quizId, knowledge, description, numQuestions } = event.arguments;
  // Validation
  if (!description || !numQuestions || !quizId) {
    throw new Error('Missing required parameters');
  }

  const token = event.request.headers.authorization
  const client = generateClient<Schema>({
    authToken: token
  });

  const publishProgress = async (message: string) => {
    console.log(message);
    const correlationId = quizId;
    await client.models.CreationProgress.create({
      correlationId,
      message,
    });
  };

  await publishProgress('Warming up');


  let knowledgeText = '';
  if (knowledge){
    await publishProgress('Extracting knowledge');
    knowledgeText = await getKnowledgeText(knowledge)
  } else {  
    knowledgeText = ""
  }

  // Construct the prompt for OpenAI
  const prompt = `
    You are a quiz generator. Given the following knowledge:
    ${knowledgeText}

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

  await publishProgress('Generating quiz');

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

  

  // We need to know the user who triggered this function in order to set the 'owner' property
  // on the Quiz item.
  let sub = ""
  if (event.identity && "sub" in event.identity) {
    sub = event.identity.sub
  }
  else {
    throw new Error("Could not determine the user who triggered this function. 'sub' not found in event.identity. This function must be triggered by a user.")
  }
  
  
  
  const newQuiz = await client.models.Quiz.create({
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
  await publishProgress('Quiz generation complete');

  if (newQuiz.errors) {
    throw new Error("Quiz creation failed.");
  }

  return newQuiz.data;
  
};


const getKnowledgeText = async (knowledge: string) => {
  
  let knowledgeText = "";
  try {

    // Retrieve the object from S3
    const bucketName = process.env.BUCKET_NAME ?? ""
    const bucketRegion = process.env.BUCKET_REGION ?? ""
    console.log(bucketName)
    const s3Response = await downloadData({
      path: knowledge,
      options: {
        bucket: {
          bucketName: bucketName,
          region: bucketRegion
        },
      }
    }).result;

    // The Body is typically a Buffer
    const fileBuffer = await s3Response.body.blob();
    if (!fileBuffer) {
      throw new Error('File content is empty');
    }

    // Use the file extension to determine how to extract text
    const lowerKey = knowledge.toLowerCase();
    if (lowerKey.endsWith('.pdf')) {
      // Dynamically import pdf-parse for PDF text extraction
      const { PdfReader } = await import('pdfreader');
      const buffer = Buffer.from(await fileBuffer.arrayBuffer());
      // Create a promise to accumulate text items extracted from the PDF
      knowledgeText = await new Promise<string>((resolve, reject) => {
        let text = "";
        new PdfReader().parseBuffer(buffer, (err, item) => {
          if (err) {
            reject(err);
          } else if (!item) {
            // End of file reached
            resolve(text);
          } else if (item.text) {
            // Append the text with a newline (adjust as needed)
            text += item.text + "\n";
          }
        });
      });
    } else if (lowerKey.endsWith('.json')) {
      // Parse and format JSON content
      const jsonContent = JSON.parse(await fileBuffer.text());
      console.log(jsonContent)
      knowledgeText = JSON.stringify(jsonContent, null, 2);
    } else {
      // For .txt or any other file, assume plain text
      knowledgeText = await fileBuffer.text();
    }
    return knowledgeText;
  } catch (error) {
    console.error('Error retrieving or processing knowledge file:', error);
    throw new Error('Failed to retrieve or process knowledge file.');
  }
}