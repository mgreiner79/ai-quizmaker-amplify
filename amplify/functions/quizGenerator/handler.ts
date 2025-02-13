import { Amplify } from 'aws-amplify';
import OpenAI from 'openai';
import { generateClient } from 'aws-amplify/data';
import { downloadData } from 'aws-amplify/storage';
import schema from './schema';
import type { Schema } from '../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/quiz-generator';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const llmClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Extracts text content from a file stored in S3.
 */
const getKnowledgeText = async (knowledge: string): Promise<string> => {
  try {
    const bucketName = process.env.BUCKET_NAME ?? "";
    const bucketRegion = process.env.BUCKET_REGION ?? "";
    console.log(`Using bucket: ${bucketName}`);
    
    const s3Response = await downloadData({
      path: knowledge,
      options: {
        bucket: { bucketName, region: bucketRegion },
      },
    }).result;
    
    // Retrieve file content as a Blob.
    const fileBlob = await s3Response.body.blob();
    if (!fileBlob) {
      throw new Error('File content is empty');
    }
    
    const lowerKey = knowledge.toLowerCase();
    if (lowerKey.endsWith('.pdf')) {
      // Dynamically import pdf-parse for PDF text extraction.
      const { PdfReader } = await import('pdfreader');
      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      return await new Promise<string>((resolve, reject) => {
        let text = "";
        new PdfReader().parseBuffer(buffer, (err, item) => {
          if (err) {
            reject(err);
          } else if (!item) {
            // End of file reached.
            resolve(text);
          } else if (item.text) {
            text += item.text + "\n";
          }
        });
      });
    } else if (lowerKey.endsWith('.json')) {
      // Parse and format JSON content.
      const jsonContent = JSON.parse(await fileBlob.text());
      console.log(jsonContent);
      return JSON.stringify(jsonContent, null, 2);
    } else {
      // Assume plain text for .txt or other file types.
      return await fileBlob.text();
    }
  } catch (error) {
    console.error('Error retrieving or processing knowledge file:', error);
    throw new Error('Failed to retrieve or process knowledge file.');
  }
};

/**
 * Main handler for quiz generation.
 */
export const handler: Schema['quizGenerator']['functionHandler'] = async (event) => {
  console.log('Received event:', JSON.stringify(event));

  // Extract and validate required parameters.
  const { quizId, knowledge, prompt, numQuestions } = event.arguments;
  if (!quizId || !prompt || !numQuestions) {
    throw new Error('Missing required parameters: quizId, description, or numQuestions.');
  }

  // Create a client with the auth token.
  const token = event.request.headers.authorization;
  const client = generateClient<Schema>({ authToken: token });

  // Helper: Publish progress messages.
  const publishProgress = async (message: string): Promise<void> => {
    console.log('Progress:', message);
    try {
      await client.models.CreationProgress.create({
        correlationId: quizId,
        message,
      });
    } catch (error) {
      console.error(`Failed to publish progress "${message}":`, error);
      // Optionally, you can choose to throw here, but we log and continue.
    }
  };

  try {
    // Step 1: Warm up.
    await publishProgress('Warming up');

    // Step 2: Extract knowledge (if provided).
    let knowledgeText = "";
    if (knowledge) {
      await publishProgress('Extracting knowledge');
      knowledgeText = await getKnowledgeText(knowledge);
    }

    // Step 3: Build the prompt for OpenAI.
    const compiledPrompt = `
      You are a quiz generator. Given the following knowledge:
      ${knowledgeText}

      Generate a quiz with the following description:
      ${prompt}

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

    // Step 4: Request quiz generation from OpenAI.
    const chatCompletion = await llmClient.chat.completions.create({
      messages: [{ role: 'system', content: compiledPrompt }],
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: schema,
      },
    });

    const messageContent = chatCompletion.choices[0].message.content;
    let parsedQuiz;
    try {
      parsedQuiz = JSON.parse(messageContent ?? '{}');
    } catch (parseError) {
      console.error('Error parsing quiz JSON:', parseError);
      throw new Error('Failed to parse generated quiz JSON.');
    }

    // Step 5: Determine the owner (user) from event identity.
    let ownerSub = "";
    if (event.identity && "sub" in event.identity) {
      ownerSub = event.identity.sub;
    } else {
      throw new Error("Could not determine the user who triggered this function. 'sub' not found in event.identity.");
    }

    // Step 6: Create the new quiz record.
    const newQuiz = await client.models.Quiz.create({
      title: parsedQuiz.title,
      id: quizId,
      description: parsedQuiz.description,
      prompt: prompt,
      previewTime: parsedQuiz.previewTime,
      answerTime: parsedQuiz.answerTime,
      questions: parsedQuiz.questions,
      maxPoints: parsedQuiz.maxPoints,
      knowledgeFileKey: parsedQuiz.knowledgeFileKey,
      owner: ownerSub,
    });

    if (newQuiz.errors) {
      console.error('Quiz creation errors:', newQuiz.errors);
      throw new Error("Quiz creation failed.");
    }

    await publishProgress('Quiz generation complete');

    console.log("Finished creating quiz:", newQuiz);

    return newQuiz.data;
  } catch (error) {
    console.error('Error in quizGenerator handler:', error);
    throw error;
  }
};
