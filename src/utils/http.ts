export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/**
 * fetch avec un délai maximum : sans lui, un service externe qui ne répond jamais
 * bloque indéfiniment l'appelant (cron de synchro, outil de l'agent...).
 * Au-delà du délai la requête est annulée et une erreur "TimeoutError" est levée.
 */
export function fetchWithTimeout(
  url: string | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  return fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) });
}
