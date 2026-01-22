import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring - sample 20% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Environment
  environment: process.env.VERCEL_ENV || "development",

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
});
