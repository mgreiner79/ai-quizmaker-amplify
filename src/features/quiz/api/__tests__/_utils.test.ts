// src/features/quiz/api/__tests__/_utils.test.ts
import { describe, it, expect } from 'vitest';
import { unwrap, ApiError } from '../_utils';

describe('unwrap', () => {
  it('returns data when present and no errors', () => {
    const res = { data: { id: 'Q1' } };
    expect(unwrap(res, 'getQuiz')).toEqual({ id: 'Q1' });
  });

  it('throws ApiError with concatenated messages when errors exist', () => {
    const res = {
      data: null,
      errors: [{ message: 'Oops' }, { message: 'Again' }],
    } as any;
    try {
      unwrap(res, 'updateQuiz');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.message).toContain('[updateQuiz] Oops; Again');
      expect(err.details).toEqual(res.errors);
      expect(err.name).toBe('ApiError');
    }
  });

  it('throws ApiError when no data returned', () => {
    const res = { data: null }; // no errors array
    expect(() => unwrap(res as any, 'deleteQuiz')).toThrowError(
      '[deleteQuiz] No data returned',
    );
  });
});
