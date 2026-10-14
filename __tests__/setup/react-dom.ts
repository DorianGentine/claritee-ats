import { afterEach, vi } from "vitest";

// Setup commun aux tests de composants (environnement jsdom uniquement : les fichiers
// en environnement node n'ont pas de `window` et ne sont pas concernés).
if (typeof window !== "undefined") {
  // Indique à React que l'environnement gère `act` (sinon : avertissement
  // « The current testing environment is not configured to support act(...) »).
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  const { cleanup } = await import("@testing-library/react");
  const { act } = await import("react");

  afterEach(async () => {
    cleanup();
    // Le scheduler React planifie du travail (popovers Radix, transitions…) qui peut
    // se déclencher après le teardown jsdom → « window is not defined » non capturé,
    // qui fait échouer le run même si tous les tests passent. On le vide tant que
    // `window` existe encore.
    if (vi.isFakeTimers()) {
      // Avec des faux timers, un setTimeout ne se déclencherait jamais (hook en
      // timeout) : on fait avancer les timers en attente, sans changer de mode.
      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      return;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });
}
