import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 1.0,

  // Desactiver en dev si pas de DSN
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
