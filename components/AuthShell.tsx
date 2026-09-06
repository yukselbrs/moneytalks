import type { ReactNode } from "react";
import Link from "next/link";
import LogoIcon from "@/components/LogoIcon";
import StockLogo from "@/components/StockLogo";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#060c17] text-slate-100">
      <header className="mx-auto flex w-full max-w-[1536px] items-center justify-between gap-4 px-6 py-7 sm:px-10 lg:px-16">
        <Link href="/" aria-label="ParaKonuşur ana sayfa" className="inline-flex items-center gap-3">
          <LogoIcon size={32} />
          <span className="text-xl font-semibold tracking-tight">para<span className="text-blue-500">konuşur</span></span>
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-xs text-slate-300 transition hover:text-white sm:text-sm">Ana sayfaya dön <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </header>

      <main className="mx-auto grid w-full max-w-[1536px] flex-1 items-center gap-16 px-6 py-10 sm:px-10 lg:grid-cols-[1.3fr_1fr] lg:gap-24 lg:px-16 lg:py-16 xl:gap-36">
        <section aria-labelledby="login-story-title" className="order-2 min-w-0 border-t border-slate-800/70 pt-10 lg:order-1 lg:border-0 lg:pt-0">
          <p className="mb-5 text-xs tracking-[0.2em] text-blue-300">PİYASALARIN ÖTESİNİ GÖR</p>
          <h1 id="login-story-title" className="font-[family-name:var(--font-geist)] text-[clamp(2.6rem,4.3vw,4.3rem)] font-semibold leading-[1.12] tracking-[-0.045em]">Her veri bir parça.<br /><span className="text-[#9bb8ff]">Birlikte anlamlı.</span></h1>
          <p className="mt-7 text-base font-semibold leading-relaxed text-slate-100 xl:text-lg">Portföyün bugün neden değişti? Riskin nerede birikiyor?</p>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">Pako AI, getirini etkileyen hisseleri ve portföyündeki yoğunlaşmayı ortaya koyar. Şirket verilerini, teknik göstergeleri ve haberleri yorumlayarak nelere dikkat edebileceğini açıklar.</p>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs"><p className="tracking-[0.16em] text-slate-200">TAKİP ETTİĞİN DÜNYA</p><span className="text-slate-400">Örnek görünüm</span></div>
            {[
              { ticker: "THYAO", name: "Türk Hava Yolları", topic: "Bilanço" },
              { ticker: "GARAN", name: "Garanti BBVA", topic: "KAP" },
              { ticker: "ASELS", name: "Aselsan", topic: "Teknik görünüm" },
            ].map(item => (
              <Link key={item.ticker} href={`/hisse/${item.ticker}`} className="group flex items-center gap-4 border-t border-slate-800/70 py-4 transition hover:bg-slate-800/20">
                <StockLogo ticker={item.ticker} size={36} radius={6} />
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.ticker}</p><p className="mt-1 text-sm text-slate-400">{item.name}</p></div>
                <span className="text-xs text-slate-400 sm:text-sm">{item.topic}</span><ArrowRight size={18} className="ml-2 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-300" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div className="flex gap-4 border-t border-slate-800/70 pt-5">
            <Sparkles size={23} className="mt-0.5 shrink-0 text-blue-400" aria-hidden="true" />
            <div><p className="text-base text-blue-400">Sadece rakamları görme, ne anlattıklarını da öğren.</p><p className="mt-2 text-sm leading-6 text-slate-300">Portföyünü incele. Hisseleri karşılaştır. Pako’ya sor.</p><p className="mt-1 text-xs leading-5 text-slate-400">Yatırım tavsiyesi değildir.</p></div>
          </div>
        </section>

        {children}
      </main>

      <footer className="border-t border-slate-800/60"><div className="mx-auto flex max-w-[1536px] flex-col items-center justify-between gap-5 px-6 py-6 text-xs text-slate-400 sm:flex-row sm:px-10 lg:px-16"><p>© {new Date().getFullYear()} ParaKonuşur</p><nav aria-label="Yasal ve destek bağlantıları" className="flex items-center gap-6"><Link href="/gizlilik" className="hover:text-white">Gizlilik</Link><Link href="/kullanim-sartlari" className="hover:text-white">Kullanım şartları</Link><a href="mailto:support@parakonusur.com" className="hover:text-white">Destek</a></nav></div></footer>
    </div>
  );
}
