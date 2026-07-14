// Next.js instrumentation hook — sunucu tarafinda Sentry'yi baslatir.
// SENTRY_DSN env tanimli degilse hicbir sey yapmaz (lokal gelistirme sifir maliyet).
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
    environment: process.env.VERCEL_ENV || "development",
  });
}
