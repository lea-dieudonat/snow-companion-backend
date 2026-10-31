const FORCE_EXIT_AFTER_MS = 10_000;

/**
 * Exécute `cleanup` quand l'hébergeur (SIGTERM) ou Ctrl+C (SIGINT) demande l'arrêt,
 * puis quitte proprement. Si le nettoyage traîne, on force la sortie après 10 s.
 */
export function onShutdown(cleanup: () => Promise<void>): void {
  let shuttingDown = false;

  const handle = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] ${signal} reçu, arrêt en cours...`);

    setTimeout(() => {
      console.error('[shutdown] Délai dépassé, arrêt forcé');
      process.exit(1);
    }, FORCE_EXIT_AFTER_MS).unref();

    cleanup()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('[shutdown] Erreur pendant l’arrêt :', err);
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => handle('SIGTERM'));
  process.on('SIGINT', () => handle('SIGINT'));
}
