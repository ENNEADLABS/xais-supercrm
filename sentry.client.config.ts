import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ajuster le taux d'echantillonnage en prod
  tracesSampleRate: 1.0,

  // Capturer les replays en cas d'erreur
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Desactiver en dev si pas de DSN
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [Sentry.replayIntegration()],
});
