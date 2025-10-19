// src/features/quiz/api/__tests__/quizzes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks so we can reference them in tests
const mocks = vi.hoisted(() => ({
  observeQuery: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  onCreate: vi.fn(),
  quizGenerator: vi.fn(),
}));

// Mock the Amplify client default export
vi.mock('@/lib/amplifyClient', () => {
  return {
    default: {
      models: {
        Quiz: {
          observeQuery: mocks.observeQuery,
          delete: mocks.delete,
          get: mocks.get,
          update: mocks.update,
          onCreate: mocks.onCreate,
        },
      },
      mutations: {
        quizGenerator: mocks.quizGenerator,
      },
    },
  };
});

import {
  watchQuizzes,
  deleteQuiz,
  getQuiz,
  updateQuiz,
  generateQuiz,
  onQuizCreated,
} from '../quizzes';

// Helper to standardize a successful Amplify result
const ok = <T>(data: T) => ({ data });

beforeEach(() => {
  mocks.observeQuery.mockReset();
  mocks.delete.mockReset();
  mocks.get.mockReset();
  mocks.update.mockReset();
  mocks.onCreate.mockReset();
  mocks.quizGenerator.mockReset();
});

describe('quizzes API', () => {
  it('watchQuizzes returns observeQuery() result', () => {
    const stream = { subscribe: vi.fn() };
    mocks.observeQuery.mockReturnValue(stream);

    const result = watchQuizzes();
    expect(mocks.observeQuery).toHaveBeenCalledTimes(1);
    expect(result).toBe(stream);
  });

  it('deleteQuiz calls client.models.Quiz.delete with id and unwraps data', async () => {
    mocks.delete.mockResolvedValueOnce(ok({ id: 'Q1' }));

    const res = await deleteQuiz('Q1');
    expect(mocks.delete).toHaveBeenCalledWith({ id: 'Q1' });
    expect(res).toEqual({ id: 'Q1' });
  });

  it('getQuiz calls client.models.Quiz.get and unwraps data', async () => {
    const quiz = { id: 'Q2', title: 'T' };
    mocks.get.mockResolvedValueOnce(ok(quiz));

    const res = await getQuiz('Q2');
    expect(mocks.get).toHaveBeenCalledWith({ id: 'Q2' });
    expect(res).toEqual(quiz);
  });

  it('updateQuiz calls client.models.Quiz.update with quiz object and unwraps', async () => {
    const quiz = { id: 'Q3', title: 'New' } as any;
    mocks.update.mockResolvedValueOnce(ok(quiz));

    const res = await updateQuiz(quiz);
    expect(mocks.update).toHaveBeenCalledWith(quiz);
    expect(res).toEqual(quiz);
  });

  it('generateQuiz calls mutations.quizGenerator with mapped args and unwraps', async () => {
    const args = { quizId: 'Q4', prompt: 'p', numQuestions: 5, knowledge: 'k' };
    const payload = { taskId: 'TASK_1' };
    mocks.quizGenerator.mockResolvedValueOnce(ok(payload));

    const res = await generateQuiz(args);
    expect(mocks.quizGenerator).toHaveBeenCalledWith({
      quizId: 'Q4',
      prompt: 'p',
      numQuestions: 5,
      knowledge: 'k',
    });
    expect(res).toEqual(payload);
  });

  it('generateQuiz fills empty knowledge when undefined', async () => {
    mocks.quizGenerator.mockResolvedValueOnce(ok({ taskId: 'T2' }));
    await generateQuiz({ quizId: 'Qx', prompt: 'p', numQuestions: 3 });
    expect(mocks.quizGenerator).toHaveBeenCalledWith({
      quizId: 'Qx',
      prompt: 'p',
      numQuestions: 3,
      knowledge: '',
    });
  });

  it('onQuizCreated forwards the filter to client.models.Quiz.onCreate and returns result', () => {
    const stream = { subscribe: vi.fn() };
    mocks.onCreate.mockReturnValueOnce(stream);

    const res = onQuizCreated('QZ');
    expect(mocks.onCreate).toHaveBeenCalledWith({
      filter: { id: { eq: 'QZ' } },
    });
    expect(res).toBe(stream);
  });

  it('propagates unwrap errors (deleteQuiz)', async () => {
    const errorRes = { data: null, errors: [{ message: 'Delete failed' }] };
    mocks.delete.mockResolvedValueOnce(errorRes as any);

    await expect(deleteQuiz('Q1')).rejects.toThrow(
      '[deleteQuiz] Delete failed',
    );
  });
});
