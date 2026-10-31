import prisma from '@/config/prisma';

const DEFAULT_MAX_DURATION_MS = 30 * 60_000;

/** Transforme un nom de job en entier 32 bits stable (clé du verrou PostgreSQL). */
export function lockKey(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  }
  return hash;
}

/**
 * Exécute `job` seulement si aucune autre instance ne l'exécute déjà.
 *
 * Utilise un verrou "advisory" PostgreSQL lié à une transaction : il est libéré
 * automatiquement à la fin du job, ou si le processus meurt (la connexion tombe).
 * Retourne false sans rien exécuter quand le verrou est pris par quelqu'un d'autre.
 */
export async function runExclusive(
  name: string,
  job: () => Promise<void>,
  maxDurationMs: number = DEFAULT_MAX_DURATION_MS,
): Promise<boolean> {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<
        { locked: boolean }[]
      >`SELECT pg_try_advisory_xact_lock(${lockKey(name)}::bigint) AS locked`;
      if (!rows[0]?.locked) return false;

      await job();
      return true;
    },
    // La transaction reste ouverte pendant tout le job : on lui laisse le temps de finir
    { timeout: maxDurationMs, maxWait: 5_000 },
  );
}
