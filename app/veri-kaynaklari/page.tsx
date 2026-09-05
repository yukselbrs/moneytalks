import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, Clock3, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Veri Kaynakları ve Metodoloji | ParaKonuşur",
  description: "ParaKonuşur'un fiyat, bilanço, fon, halka arz ve AI analiz kaynakları; veri gecikmeleri ve hesaplama sınırları.",
  alternates: { canonical: "https://www.parakonusur.com/veri-kaynaklari" },
};
const sources = [
  ["Hisse fiyatları ve grafikler", "Yahoo Finance", "BIST fiyatları 15 dakika gecikmelidir. Piyasa kapalıyken son işlem verisi gösterilir. Yenileme sıklığı, kaynağın veri gecikmesini ortadan kaldırmaz."],
  ["Finansal tablolar", "İş Yatırım, TradingView ve halka arz izahnameleri", "Son açıklanan finansal dönem kullanılır. Bilanço dönemi ile fiyatın tarihi farklı olabilir. Eksik değerler sıfır kabul edilmemelidir."],
  ["Şirket haberleri", "Kamuyu Aydınlatma Platformu (KAP)", "Bildirimler ve üretilen özetler asıl açıklamanın yerine geçmez. Önemli ayrıntılar için kaynak bildirimi inceleyin."],
  ["Yatırım fonları", "TEFAS", "Fon fiyatları gün sonunda veya fonun ilan takvimine göre açıklanır. Gün içi değerler, tahmin olarak işaretlendikleri durumda kesin fon fiyatı değildir."],
  ["Halka arzlar", "Ahlatcı Yatırım, Halkarz.com ve izahnameler", "Lot aracı eşit dağıtım ve bireysel tahsisat varsayımlarıyla yaklaşık sonuç verir. Üst sınır tahminleri ayrıca belirtilir. Kesin sonuç için arz sonuçlarını inceleyin."],
  ["Döviz ve kıymetli madenler", "Yahoo Finance; kesintilerde ECB referans kurları", "Gram değerleri ons ve döviz kurundan türetilir. Gösterilen değerler banka gişe veya fiziki piyasa alış/satış fiyatı değildir."],
];
export default function SourcesPage() {
  return <main className="mx-auto w-full max-w-5xl px-6 py-12 lg:py-20">
    <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-300"><ArrowLeft size={16} /> ParaKonuşur</Link>
    <div className="mb-12 mt-12"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Şeffaflık</p><h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Her verinin bir kaynağı.<br />Her analizin bir sınırı var.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">ParaKonuşur verileri bir araya getirir ve anlaşılır hale getirir. Aşağıdaki kapsam ve gecikmeleri, ekrandaki sayıları değerlendirirken dikkate alın.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">{[[Database,"Kaynakları görün"],[Clock3,"Veri tarihini kontrol edin"],[ShieldCheck,"Kararı kendiniz verin"]].map(([Icon,text]) => { const I = Icon as typeof Database; return <div key={String(text)} className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/50 p-5"><I size={20} className="text-blue-300" /><span className="text-sm text-slate-200">{String(text)}</span></div>; })}</div>
    <div className="my-10 divide-y divide-slate-700/50 rounded-2xl border border-slate-700/50 bg-slate-900/30">{sources.map(([title,source,detail]) => <section key={title} className="grid gap-3 p-6 sm:grid-cols-[210px_1fr]"><div><h2 className="font-semibold text-slate-100">{title}</h2><p className="mt-2 text-sm text-blue-300">{source}</p></div><p className="text-sm leading-7 text-slate-300">{detail}</p></section>)}</div>
    <section className="space-y-4"><h2 className="text-2xl font-semibold text-slate-100">Risk skoru ve yapay zekâ</h2><p className="text-base leading-8 text-slate-300">Hisse risk skoru fiyat oynaklığı, piyasa duyarlılığı, teknik göstergeler, temel oranlar ve makro koşulları birleştiren bir ölçüdür. Hisse riskinde yüksek değer daha yüksek riski ifade eder. Farklı varlık sınıflarının risk ölçekleri doğrudan karşılaştırılamaz. Portföy grafiği mevcut pozisyonları geçmiş fiyatlarla değerlendirir; gerçek işlem tarihçesi veya nakit akışına dayalı yatırım getirisi değildir.</p><p className="text-base leading-8 text-slate-300">Pako AI hata yapabilir veya önemli bir ayrıntıyı atlayabilir. Özetleri kaynaklarıyla karşılaştırın. Kontrollerimiz hatalı veya yönlendirici ifadeleri azaltmayı amaçlar; doğruluk garantisi vermez. Platform yatırım danışmanlığı sunmaz.</p><Link href="/risk-uyarisi" className="inline-block text-sm font-semibold text-blue-300">Risk uyarısını oku →</Link></section>
  </main>;
}
