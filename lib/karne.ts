import bistCompanies from "@/data/bist-companies.json";

// Haftalik karne hesap cekirdegi — cron (e-posta) ve /api/karne (web gorunumu) ortak kullanir (Faz 4 B.7/B.10).

export type PortfoyRow = { user_id: string; ticker: string; adet: number };
export type SnapshotRow = { ticker: string; fiyat: number | null; getiri_1h: number | null };
export type RiskOzet = { skor: number; beta: number | null };
export type KapOlay = { disclosure_index: number; tickerlar: string[]; bildirim_tipi: string; ozet_tek_cumle: string | null; baslik: string | null };
export type SektorPay = { sektor: string; yuzde: number };

export type Karne = {
  toplamDeger: number;
  haftalikGetiri: number | null;
  endeksHaftalik: number | null;
  sektorler: SektorPay[];
  sektorSayisi: number;
  riskSkor: number | null;
  beta: number | null;
  riskKapsamYuzde: number;
  kapOlaylar: KapOlay[];
};

export const RISK_FETCH_CAP = 25;
export const KAP_OLAY_LIMIT = 3;

export const SEKTOR_MAP: Record<string, string | null> = Object.fromEntries(
  (bistCompanies as { ticker: string; sektor?: string | null }[]).map(c => [c.ticker, c.sektor ?? null])
);

export const EGITIM_ICERIKLERI = [
  { baslik: "Beta nedir?", metin: "Beta, bir hissenin endekse göre ne kadar oynak olduğunu ölçer. 1'in üzeri endeksten sert, altı endeksten yumuşak hareket eğilimi anlamına gelir." },
  { baslik: "Çeşitlendirme ne işe yarar?", metin: "Farklı sektörlere yayılan bir portföyde tek bir sektöre özgü olumsuz gelişmenin toplam portföye etkisi sınırlı kalır. Konsantrasyon arttıkça o sektörün dalgalanması portföyün dalgalanması haline gelir." },
  { baslik: "Bedelsiz sermaye artırımı", metin: "Şirket iç kaynaklarından sermayesini artırır ve pay sayısı çoğalır; fiyat mekanik olarak aynı oranda düşer. Toplam piyasa değeri bu işlemle değişmez." },
  { baslik: "RSI göstergesi", metin: "RSI, son dönem yükseliş ve düşüşlerin gücünü 0-100 arasında özetler. 70 üzeri genellikle 'aşırı alım', 30 altı 'aşırı satım' bölgesi olarak adlandırılır — tek başına yön garantisi vermez." },
  { baslik: "Likidite riski", metin: "Düşük işlem hacimli hisselerde alış-satış farkı açılabilir ve büyük emirler fiyatı oynatabilir. Pozisyondan çıkmak istediğinde karşı taraf bulmak zorlaşabilir." },
  { baslik: "F/K oranı", metin: "Fiyat/Kazanç oranı, hissenin fiyatının yıllık kârının kaç katı olduğunu gösterir. Sektörler arası F/K karşılaştırması yanıltıcı olabilir; aynı sektör içinde daha anlamlıdır." },
  { baslik: "Volatilite", metin: "Volatilite, fiyatın ortalama etrafında ne kadar salındığının ölçüsüdür. Yüksek volatilite hem yukarı hem aşağı yönde daha geniş hareket aralığı demektir." },
  { baslik: "Temettü verimi", metin: "Temettü verimi, yıllık nakit temettünün hisse fiyatına oranıdır. Temettü ödemesi sonrası fiyat genellikle ödeme tutarı kadar düzeltilir." },
];

export function haftaBaslangici(): string {
  const trNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const gun = trNow.getUTCDay();
  const pazartesiOffset = gun === 0 ? 6 : gun - 1;
  const pazartesi = new Date(trNow);
  pazartesi.setUTCDate(trNow.getUTCDate() - pazartesiOffset);
  return pazartesi.toISOString().slice(0, 10);
}

export function isoHaftaNo(): number {
  const now = new Date();
  const baslangic = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return Math.floor((now.getTime() - baslangic.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export async function fetchEndeksHaftalik(): Promise<number | null> {
  try {
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=1mo", {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const closes: (number | null)[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const gecerli = closes.filter((c): c is number => c !== null && c > 0);
    if (gecerli.length < 6) return null;
    const son = gecerli[gecerli.length - 1];
    const haftaOnce = gecerli[gecerli.length - 6];
    return ((son - haftaOnce) / haftaOnce) * 100;
  } catch {
    return null;
  }
}

// Risk skoru karnede ZENGINLESTIRMEDIR — eksik olursa karne yine uretilir (riskSkor null).
// Bu yuzden sure butcesi var: /api/risk pahali (Yahoo + TradingView, 10 faktor) ve 25
// ticker'i 5'erli sirayla cekmek Vercel'in 60sn limitini asiyordu (2 Agu'da 504
// FUNCTION_INVOCATION_TIMEOUT). Butce dolunca elde ne varsa onunla devam edilir.
export async function fetchRiskOzetleri(
  appUrl: string, tickers: string[], sonTarihMs?: number,
): Promise<Record<string, RiskOzet>> {
  const sonuc: Record<string, RiskOzet> = {};
  const hedefler = tickers.slice(0, RISK_FETCH_CAP);
  const ES_ZAMANLI = 8;

  for (let i = 0; i < hedefler.length; i += ES_ZAMANLI) {
    if (sonTarihMs && Date.now() > sonTarihMs) break;      // butce doldu — kismi sonucla devam
    const chunk = hedefler.slice(i, i + ES_ZAMANLI);
    await Promise.all(chunk.map(async ticker => {
      try {
        const res = await fetch(`${appUrl}/api/risk?ticker=${ticker}`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.skor !== "number") return;
        sonuc[ticker] = { skor: data.skor, beta: typeof data?.meta?.beta === "number" ? data.meta.beta : null };
      } catch {
        return;   // tek ticker'in dusmesi karneyi engellemez
      }
    }));
  }

  return sonuc;
}

export function karneHesapla(
  pozisyonlar: PortfoyRow[],
  snapshots: Record<string, SnapshotRow>,
  riskler: Record<string, RiskOzet>,
  endeksHaftalik: number | null,
  kapOlaylarTumu: KapOlay[]
): Karne | null {
  type Degerli = { ticker: string; deger: number; getiri1h: number | null };
  const degerli: Degerli[] = [];

  for (const p of pozisyonlar) {
    const snap = snapshots[p.ticker];
    if (!snap?.fiyat || snap.fiyat <= 0 || !p.adet || p.adet <= 0) continue;
    degerli.push({ ticker: p.ticker, deger: p.adet * snap.fiyat, getiri1h: snap.getiri_1h });
  }

  const toplamDeger = degerli.reduce((acc, d) => acc + d.deger, 0);
  if (!degerli.length || toplamDeger <= 0) return null;

  const getirili = degerli.filter(d => d.getiri1h !== null);
  const getiriliDeger = getirili.reduce((acc, d) => acc + d.deger, 0);
  const haftalikGetiri = getiriliDeger > 0
    ? getirili.reduce((acc, d) => acc + d.getiri1h! * d.deger, 0) / getiriliDeger
    : null;

  const sektorDegerleri = new Map<string, number>();
  for (const d of degerli) {
    const sektor = SEKTOR_MAP[d.ticker] || "Diğer";
    sektorDegerleri.set(sektor, (sektorDegerleri.get(sektor) || 0) + d.deger);
  }
  const sektorler = [...sektorDegerleri.entries()]
    .map(([sektor, deger]) => ({ sektor, yuzde: (deger / toplamDeger) * 100 }))
    .sort((a, b) => b.yuzde - a.yuzde)
    .slice(0, 3);

  const riskli = degerli.filter(d => riskler[d.ticker]);
  const riskliDeger = riskli.reduce((acc, d) => acc + d.deger, 0);
  const riskKapsamYuzde = (riskliDeger / toplamDeger) * 100;
  const riskSkor = riskliDeger > 0
    ? riskli.reduce((acc, d) => acc + riskler[d.ticker].skor * d.deger, 0) / riskliDeger
    : null;
  const betali = riskli.filter(d => riskler[d.ticker].beta !== null);
  const betaliDeger = betali.reduce((acc, d) => acc + d.deger, 0);
  const beta = betaliDeger > 0
    ? betali.reduce((acc, d) => acc + riskler[d.ticker].beta! * d.deger, 0) / betaliDeger
    : null;

  const tickerSet = new Set(degerli.map(d => d.ticker));
  const kapOlaylar = kapOlaylarTumu
    .filter(o => o.tickerlar.some(t => tickerSet.has(t)))
    .slice(0, KAP_OLAY_LIMIT);

  return {
    toplamDeger,
    haftalikGetiri,
    endeksHaftalik,
    sektorler,
    sektorSayisi: sektorDegerleri.size,
    riskSkor,
    beta,
    riskKapsamYuzde,
    kapOlaylar,
  };
}
