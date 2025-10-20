// tests/handler.happy-path.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mockDataClient,
  mockOpenAI,
  importHandler,
  statusesFrom,
} from './utils';
import { makeCb, makeCtx } from './lambdaHelpers';

describe('quizGenerator handler - happy path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits progress updates, creates quiz, returns record', async () => {
    const quizId = 'QUIZ-123';
    const ownerSub = 'OWNER-ABC';
    const prompt = 'Make a 1-question quiz about planets.';
    const numQuestions = 1;

    const llmQuiz = {
      title: 'Space Basics',
      description: 'Test your knowledge about planets.',
      previewTime: 5,
      answerTime: 20,
      maxPoints: 3000,
      questions: [
        {
          id: 'Q1',
          text: 'Which planet is known as the Red Planet?',
          previewTime: 5,
          answerTime: 20,
          maxPoints: 3000,
          correctAnswerId: 'A2',
          explanation: 'Mars appears red due to iron oxide on its surface.',
          answers: [
            { id: 'A1', text: 'Venus', message: 'Too hot and not red.' },
            { id: 'A2', text: 'Mars', message: 'Correct.' },
            { id: 'A3', text: 'Jupiter', message: 'That is a gas giant.' },
            { id: 'A4', text: 'Mercury', message: 'Closest to the sun.' },
          ],
        },
      ],
    };

    const openai = mockOpenAI({
      choices: [{ message: { content: JSON.stringify(llmQuiz) } }],
    });
    const client = mockDataClient();
    const { handler } = await importHandler();

    const createdQuizRecord = {
      id: quizId,
      title: llmQuiz.title,
      description: llmQuiz.description,
      prompt,
      previewTime: llmQuiz.previewTime,
      answerTime: llmQuiz.answerTime,
      questions: llmQuiz.questions,
      maxPoints: llmQuiz.maxPoints,
      knowledgeFileKey: undefined,
      owner: ownerSub,
    };
    client.createQuiz.mockResolvedValue({ data: createdQuizRecord });

    const event = {
      arguments: { quizId, prompt, numQuestions },
      request: { headers: { authorization: 'Bearer test-token' } },
      identity: { sub: ownerSub },
    } as any;

    const result = await handler(event, makeCtx(), makeCb());

    expect(statusesFrom(client.updateProgress)).toEqual([
      'WARMING_UP',
      'GENERATING',
      'CREATED',
    ]);

    expect(client.createQuiz).toHaveBeenCalledTimes(1);
    expect(client.createQuiz.mock.calls[0][0]).toMatchObject({
      id: quizId,
      owner: ownerSub,
      title: llmQuiz.title,
    });

    expect(openai.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(createdQuizRecord);
  });
});
