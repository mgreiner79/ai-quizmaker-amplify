import client from '@/lib/amplifyClient';

export async function getProgress(id: string) {
  return (await client.models.CreationProgress.get({ id })).data;
}

export async function createProgress(id: string) {
  return client.models.CreationProgress.create({
    id,
    status: 'WARMING_UP',
    message: 'Warming up',
    errorText: '',
  });
}

export function onProgressUpdate(id: string) {
  return client.models.CreationProgress.onUpdate({
    filter: { id: { eq: id } },
  });
}

export function onProgressCreate(id: string) {
  return client.models.CreationProgress.onCreate({
    filter: { id: { eq: id } },
  });
}

export function watchProgress(id: string) {
  return client.models.CreationProgress.observeQuery({
    filter: { id: { eq: id } },
  });
}
