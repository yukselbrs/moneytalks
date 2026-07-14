import * as Sentry from "@sentry/nextjs";

// Tek nokta hata raporu: her zaman console.error, DSN tanimliysa Sentry.
// Cron'lardaki "sessiz yutma" sinifini bitirmek icin catch bloklarinda bunu kullan (Faz 4 D.2).
export function hataYakala(baglam: string, err: unknown, ekstra?: Record<string, unknown>) {
  console.error(`[${baglam}]`, err, ekstra ?? "");
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { baglam },
      extra: ekstra,
    });
  }
}
