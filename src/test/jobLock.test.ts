import { describe, it, expect } from 'vitest';
import { lockKey, runExclusive } from '@/cron/job-lock';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('lockKey', () => {
  it('est stable et différent selon le nom', () => {
    expect(lockKey('station-sync')).toBe(lockKey('station-sync'));
    expect(lockKey('station-sync')).not.toBe(lockKey('station-populate'));
  });
});

describe('runExclusive', () => {
  it('exécute le job et retourne true', async () => {
    let ran = false;
    const result = await runExclusive('test-simple', async () => {
      ran = true;
    });

    expect(result).toBe(true);
    expect(ran).toBe(true);
  });

  it("n'exécute pas un job déjà en cours (deux instances simultanées)", async () => {
    let runs = 0;
    const job = async () => {
      runs += 1;
      await sleep(300);
    };

    const [first, second] = await Promise.all([
      runExclusive('test-concurrent', job),
      runExclusive('test-concurrent', job),
    ]);

    expect([first, second].sort()).toEqual([false, true]);
    expect(runs).toBe(1);
  });

  it('libère le verrou même si le job échoue', async () => {
    await expect(
      runExclusive('test-failure', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await runExclusive('test-failure', async () => {})).toBe(true);
  });
});
