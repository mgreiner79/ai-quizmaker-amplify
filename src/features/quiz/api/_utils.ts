// src/features/quiz/api/_utils.ts

export class ApiError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

type AmplifyResult<T> = { data: T | null | undefined; errors?: any[] };

export function unwrap<T>(res: AmplifyResult<T>, op = 'operation'): T {
  if (res?.errors?.length) {
    const msg = res.errors.map((e) => e?.message ?? String(e)).join('; ');
    throw new ApiError(`[${op}] ${msg}`, res.errors);
  }
  if (!res?.data) {
    throw new ApiError(`[${op}] No data returned`);
  }
  return res.data;
}
