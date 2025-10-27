import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

type CP = Schema['CreationProgress']['type'];
export type ProgressStatus = NonNullable<CP['status']>;
export const ProgressStatus = {
  QUEUED: 'QUEUED',
  WARMING_UP: 'WARMING_UP',
  EXTRACTING: 'EXTRACTING',
  GENERATING: 'GENERATING',
  CREATED: 'CREATED',
  ERROR: 'ERROR',
} as const satisfies Record<string, ProgressStatus>;

type ProgressPatch = {
  status?: ProgressStatus;
  message?: string;
  errorText?: string;
};

export async function upsertProgress(
  client: ReturnType<typeof generateClient<Schema>>,
  quizId: string,
  patch: ProgressPatch,
) {
  try {
    const resp = await client.models.CreationProgress.update({
      id: quizId,
      ...patch,
    });
    return resp.data;
  } catch {
    const resp = await client.models.CreationProgress.create({
      id: quizId,
      ...patch,
    });
    return resp.data;
  }
}
