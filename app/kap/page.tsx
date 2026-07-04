import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { TIP_ETIKET, type KapBildirimTipi } from "@/lib/kap-ozet";
import StockLogo from "@/components/StockLogo";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "KAP Bildirimleri Sade Türkçe Özetleriyle | ParaKonuşur",
  description: "Borsa İstanbul şirketlerinin KAP bildirimleri, sıradan yatırımcının anlayacağı sade Türkçe özetleriyle. Sermaye artırımı, temettü, pay geri alım ve özel durum açıklamaları.",
  alternates: { canonical: "/kap" },
};

type KapSatir = {
  disclosure_index: number;
  ticker: string | null;
  bildirim_tipi: KapBildirimTipi;
  konu: string | null;
  kap_zamani: string | null;
  ozet_tek_cumle: string | null;
};

async function fetchSonBildirimler(): Promise<KapSatir[]> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase
    .from("kap_bildirimleri")
    .select("disclosure_index, ticker, bildirim_tipi, konu, kap_zamani, ozet_tek_cumle")
    .not("ozet_tek_cumle", "is", null)
    .order("kap_zamani", { ascending: false })
    .limit(50);
  return (data as KapSatir[] | null) ?? [];
}

function tarihFormatla(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", timeZone: "Europe/Istanbul" });
}

export default async function KapHubPage() {
  const bildirimler = await fetchSonBildirimler();

  return (
    <div className="dot-grid min-h-screen bg-[#0B1220] text-slate-100">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div className="animate-fade-up mb-8">
          <h1 className="m-0 text-2xl font-bold text-slate-50">KAP Bildirimleri</h1>
          <p className="m-0 mt-2 text-sm leading-relaxed text-slate-400">
            Borsa İstanbul şirketlerinin Kamuyu Aydınlatma Platformu bildirimleri —
            sıradan yatırımcının anlayacağı sade Türkçe özetleriyle. Her özette kaynak bildirimin aslına bağlantı bulunur.
          </p>
        </div>

        {bildirimler.length === 0 ? (
          <div className="card-glass animate-fade-up rounded-2xl p-8 text-center">
            <p className="m-0 text-sm text-slate-400">Özetlenmiş bildirimler kısa süre içinde burada listelenecek.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bildirimler.map((b, i) => {
              const ticker = b.ticker ?? "";
              return (
                <Link key={b.disclosure_index} href={`/kap/${b.disclosure_index}`}
                  className="card-glass animate-fade-up block rounded-xl p-4 transition-colors hover:bg-blue-500/5"
                  style={{ animationDelay: `${Math.min(i * 0.03, 0.4)}s` }}>
                  <div className="flex items-start gap-3">
                    <StockLogo ticker={ticker} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{ticker}</span>
                        <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-400">
                          {TIP_ETIKET[b.bildirim_tipi] ?? "KAP Bildirimi"}
                        </span>
                        <span className="ml-auto text-[11px] text-slate-600">{tarihFormatla(b.kap_zamani)}</span>
                      </div>
                      <p className="m-0 mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-300">
                        {b.ozet_tek_cumle ?? b.konu}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-slate-600">
          Bu sayfadaki içerikler yatırım tavsiyesi değildir; bilgilendirme amaçlıdır.
        </p>
      </main>
    </div>
  );
}
