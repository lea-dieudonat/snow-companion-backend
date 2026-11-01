import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchAllFrenchStationsFromOverpass } from '@/services/overpass.service';

const reponseOk = () =>
  new Response(
    JSON.stringify({
      elements: [{ type: 'way', id: 1, center: { lat: 45, lon: 6 }, tags: { name: 'Val Test' } }],
    }),
  );

afterEach(() => vi.unstubAllGlobals());

describe('fetchAllFrenchStationsFromOverpass', () => {
  it('envoie un User-Agent (Overpass répond 406 sans)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reponseOk());
    vi.stubGlobal('fetch', fetchMock);

    await fetchAllFrenchStationsFromOverpass(1);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)['User-Agent']).toBeTruthy();
  });

  it('réessaie après un 502 puis réussit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('saturé', { status: 502 }))
      .mockResolvedValueOnce(reponseOk());
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const stations = await fetchAllFrenchStationsFromOverpass(1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(stations).toHaveLength(1);
  });

  it('abandonne après 4 tentatives sur un 502 persistant', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response('x', { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(fetchAllFrenchStationsFromOverpass(1)).rejects.toThrow('502');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('ne réessaie pas sur une erreur définitive (406)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('x', { status: 406 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAllFrenchStationsFromOverpass(1)).rejects.toThrow('406');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
