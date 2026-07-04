import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { TIP_ETIKET, type KapBildirimTipi } from "@/lib/kap-ozet";
import StockLogo from "@/components/StockLogo";

export const revalidate = 1800;

type KapBildirim = {
  disclosure_index: number;
  ticker: string | null;
  tickerlar: string[];
  bildirim_tipi: KapBildirimTipi;
  baslik: string | null;
  konu: string | null;
  kap_zamani: string | null;
  kap_link: string | null;
  ozet_tek_cumle: string | null;
  ozet_ne_demek: string | null;
};

function supabaseAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

async function fetchBildirim(index: string): Promise<KapBildirim | null> {
  const parsed = parseInt(index, 10);
  if (Number.isNaN(parsed)) return null;
  const { data } = await supabaseAnon()
    .from("kap_bildirimleri")
    .select("disclosure_index, ticker, tickerlar, bildirim_tipi, baslik, konu, kap_zamani, kap_link, ozet_tek_cumle, ozet_ne_demek")
    .eq("disclosure_index", parsed)
    .maybeSingle();
  return (data as KapBildirim | null) ?? null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ index: string }> }
): Promise<Metadata> {
  const { index } = await params;
  const bildirim = await fetchBildirim(index);
  if (!bildirim) return { title: "KAP Bildirimi | ParaKonuşur" };

  const ticker = bildirim.ticker ?? bildirim.tickerlar[0] ?? "";
  const tipEtiket = TIP_ETIKET[bildirim.bildirim_tipi] ?? "KAP Bildirimi";
  const title = `${ticker} ${tipEtiket} ne anlama geliyor?`;
  const desc = bildirim.ozet_tek_cumle ?? bildirim.konu ?? `${ticker} için KAP bildirimi sade Türkçe özetiyle.`;

  return {
    title: `${title} | ParaKonuşur`,
    description: desc,
    openGraph: { title, description: desc, url: `/kap/${bildirim.disclosure_index}` },
    twitter: { card: "summary", title, description: desc },
    alternates: { canonical: `/kap/${bildirim.disclosure_index}` },
  };
}

function tarihFormatla(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

export default async function KapBildirimPage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = await params;
  const bildirim = await fetchBildirim(index);
  if (!bildirim) notFound();

  const ticker = bildirim.ticker ?? bildirim.tickerlar[0] ?? "";
  const tipEtiket = TIP_ETIKET[bildirim.bildirim_tipi] ?? "KAP Bildirimi";
  const kapLink = bildirim.kap_link ?? `https://www.kap.org.tr/tr/Bildirim/${bildirim.disclosure_index}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${ticker} ${tipEtiket} ne anlama geliyor?`,
    description: bildirim.ozet_tek_cumle ?? bildirim.konu ?? undefined,
    datePublished: bildirim.kap_zamani ?? undefined,
    author: { "@type": "Organization", name: "ParaKonuşur" },
    publisher: { "@type": "Organization", name: "ParaKonuşur", url: "https://parakonusur.com" },
    about: { "@type": "Corporation", tickerSymbol: ticker },
  };

  return (
    <div className="dot-grid min-h-screen bg-[#0B1220] text-slate-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <nav className="mb-6 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300">Ana Sayfa</Link>
          <span className="mx-2">/</span>
          <Link href="/kap" className="hover:text-slate-300">KAP Bildirimleri</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-400">{ticker}</span>
        </nav>

        <div className="card-glass animate-fade-up rounded-2xl p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <StockLogo ticker={ticker} size={40} />
            <div>
              <h1 className="m-0 text-xl font-bold text-slate-50 sm:text-2xl">
                {ticker} {tipEtiket} ne anlama geliyor?
              </h1>
              <p className="m-0 mt-1 text-xs text-slate-500">
                {tarihFormatla(bildirim.kap_zamani)} · KAP Bildirim #{bildirim.disclosure_index}
              </p>
            </div>
          </div>

          {bildirim.baslik && <p className="mb-4 text-sm text-slate-400">{bildirim.baslik}</p>}

          {bildirim.ozet_tek_cumle ? (
            <>
              <p className="mb-5 rounded-xl border-l-[3px] border-blue-500 bg-slate-900/70 p-4 text-base font-semibold leading-relaxed text-slate-100">
                {bildirim.ozet_tek_cumle}
              </p>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Bu ne demek?</h2>
              <p className="mb-6 leading-relaxed text-slate-300">{bildirim.ozet_ne_demek}</p>
            </>
          ) : (
            <p className="mb-6 leading-relaxed text-slate-300">{bildirim.konu ?? "Bu bildirimin özeti henüz hazırlanıyor."}</p>
          )}

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <a href={kapLink} target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-blue-500/30 px-4 py-2.5 text-center text-sm font-medium text-blue-400 hover:bg-blue-500/10">
              KAP bildiriminin aslı →
            </a>
            <Link href={`/hisse/${ticker}`}
              className="rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:opacity-90">
              {ticker} hisse sayfası →
            </Link>
          </div>

          <p className="m-0 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">
            Bu içerik yatırım tavsiyesi değildir; bilgilendirme amaçlıdır. Özet, KAP bildiriminin aslından
            yapay zekâ ile üretilmiştir — bağlayıcı olan kaynak bildirimdir.
          </p>
        </div>

        <div className="animate-fade-up mt-6 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-5 text-center">
          <p className="m-0 mb-3 text-sm text-slate-300">
            {ticker} izleme listendeyse, yeni KAP bildirimleri sade özetiyle e-postana gelir.
          </p>
          <Link href="/register" className="text-sm font-semibold text-blue-400 hover:text-blue-300">
            Ücretsiz kayıt ol →
          </Link>
        </div>
      </main>
    </div>
  );
}
