import client from '@/lib/amplifyClient';
import { unwrap } from '@/features/quiz/api/_utils';

export async function getProgress(id: string) {
  const response = await client.models.CreationProgress.get({ id });
  return unwrap(response, 'getProgress');
}

export async function createProgress(id: string) {
  const response = await client.models.CreationProgress.create({
    id,
    status: 'WARMING_UP',
    message: 'Warming up',
    errorText: '',
  });
  return unwrap(response, 'createProgress');
}

export function onProgressUpdate(id: string) {
  const response = client.models.CreationProgress.onUpdate({
    filter: { id: { eq: id } },
  });
  return response;
}

export function onProgressCreate(id: string) {
  const response = client.models.CreationProgress.onCreate({
    filter: { id: { eq: id } },
  });
  return response;
}

export function watchProgress(id: string) {
  const response = client.models.CreationProgress.observeQuery({
    filter: { id: { eq: id } },
  });
  return response;
}
