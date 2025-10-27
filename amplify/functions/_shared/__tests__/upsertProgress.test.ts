// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertProgress, ProgressStatus } from '../progress';

// Minimal shape of the client expected by upsertProgress
type FakeClient = {
  models: {
    CreationProgress: {
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
};

function makeClient() {
  const update = vi.fn();
  const create = vi.fn();
  const client: FakeClient = {
    models: { CreationProgress: { update, create } },
  };
  return { client, update, create };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('upsertProgress()', () => {
  it('uses update() when it succeeds and returns its data', async () => {
    const { client, update, create } = makeClient();

    update.mockResolvedValueOnce({
      data: { id: 'Q-1', status: 'GENERATING', message: 'm', errorText: '' },
    });

    const data = await upsertProgress(client as any, 'Q-1', {
      status: ProgressStatus.GENERATING,
      message: 'm',
      errorText: '',
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      id: 'Q-1',
      status: 'GENERATING',
      message: 'm',
      errorText: '',
    });
    expect(create).not.toHaveBeenCalled();
    expect(data).toEqual({
      id: 'Q-1',
      status: 'GENERATING',
      message: 'm',
      errorText: '',
    });
  });

  it('falls back to create() when update() throws and returns its data', async () => {
    const { client, update, create } = makeClient();

    update.mockRejectedValueOnce(new Error('not found'));
    create.mockResolvedValueOnce({
      data: {
        id: 'Q-2',
        status: 'WARMING_UP',
        message: 'Warming up',
        errorText: '',
      },
    });

    const data = await upsertProgress(client as any, 'Q-2', {
      status: ProgressStatus.WARMING_UP,
      message: 'Warming up',
      errorText: '',
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      id: 'Q-2',
      status: 'WARMING_UP',
      message: 'Warming up',
      errorText: '',
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      id: 'Q-2',
      status: 'WARMING_UP',
      message: 'Warming up',
      errorText: '',
    });

    expect(data).toEqual({
      id: 'Q-2',
      status: 'WARMING_UP',
      message: 'Warming up',
      errorText: '',
    });
  });

  it('propagates when both update() and create() fail', async () => {
    const { client, update, create } = makeClient();

    update.mockRejectedValueOnce(new Error('missing'));
    create.mockRejectedValueOnce(new Error('db down'));

    await expect(
      upsertProgress(client as any, 'Q-3', {
        status: ProgressStatus.ERROR,
        message: 'e',
        errorText: 'boom',
      }),
    ).rejects.toThrow(/db down/i);

    expect(update).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('passes through partial patches (e.g., only status)', async () => {
    const { client, update } = makeClient();

    update.mockResolvedValueOnce({
      data: { id: 'Q-4', status: 'CREATED' },
    });

    const data = await upsertProgress(client as any, 'Q-4', {
      status: ProgressStatus.CREATED,
    });

    expect(update).toHaveBeenCalledWith({ id: 'Q-4', status: 'CREATED' });
    expect(data).toEqual({ id: 'Q-4', status: 'CREATED' });
  });

  it('ProgressStatus enum exposes expected values', () => {
    expect(ProgressStatus.QUEUED).toBe('QUEUED');
    expect(ProgressStatus.WARMING_UP).toBe('WARMING_UP');
    expect(ProgressStatus.EXTRACTING).toBe('EXTRACTING');
    expect(ProgressStatus.GENERATING).toBe('GENERATING');
    expect(ProgressStatus.CREATED).toBe('CREATED');
    expect(ProgressStatus.ERROR).toBe('ERROR');
  });
});
