import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithTimeout } from '@/utils/http';

afterEach(() => vi.unstubAllGlobals());

describe('fetchWithTimeout', () => {
  it('transmet la requête et retourne la réponse', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchWithTimeout('https://exemple.test/a', { method: 'POST' });

    expect(await res.text()).toBe('ok');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://exemple.test/a');
    expect(init.method).toBe('POST');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('annule la requête quand le délai est dépassé', async () => {
    // Faux serveur qui ne répond jamais : il ne rejette que lorsque la requête est annulée
    vi.stubGlobal(
      'fetch',
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );

    await expect(fetchWithTimeout('https://exemple.test/lent', {}, 50)).rejects.toMatchObject({
      name: 'TimeoutError',
    });
  });
});
