import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js App Router requiert unsafe-inline et unsafe-eval
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind inline styles
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Supabase REST + Realtime WebSocket, Sentry, Vercel Analytics
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://o0.ingest.sentry.io https://vitals.vercel-insights.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "xais",
  project: "xais-supercrm",
  // Supprime les logs du build Sentry sauf erreurs
  silent: !process.env.CI,
  // Upload source maps pour le debugging en prod
  widenClientFileUpload: true,
});
