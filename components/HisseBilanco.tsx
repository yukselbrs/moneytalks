"use client";

import { useEffect, useState } from "react";

type CeyrekSeri = {
  toplam_varlik: (number | null)[];
  hasilat: (number | null)[];
  brut_kar: (number | null)[];
  net_kar: (number | null)[];
  favok: (number | null)[];
  toplam_borc: (number | null)[];
};

type Bilanco = {
  ticker: string;
  toplam_varlik: number | null; toplam_yukumluluk: number | null; ozkaynak: number | null;
  ceyrek_seri: CeyrekSeri | null;
  son_bildirim_tarihi: string | null;
  updated_at: string;
};

// "Bin ₺": ham deger / 1000, binlik ayracli, ondaliksiz (Is Yatirim "Ozet Finansallar" birimi).
function binTL(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return Math.round(v / 1000).toLocaleString("tr-TR");
}

// Yuzde degisim: (yeni - eski) / |eski|. Yesil artis / kirmizi azalis.
function yuzdeDegisim(yeni: number | null, eski: number | null): { metin: string; renk: string } {
  if (yeni === null || eski === null || eski === 0) return { metin: "—", renk: "#475569" };
  const d = ((yeni - eski) / Math.abs(eski)) * 100;
  const yuvarli = Math.round(d);
  return { metin: `%${yuvarli > 0 ? "" : ""}${yuvarli}`, renk: yuvarli >= 0 ? "#22C55E" : "#EF4444" };
}

type Satir = { ad: string; yeni: number | null; eski: number | null };

function KartTablo({ baslik, birim, kolonlar, satirlar }: { baslik: string; birim: string; kolonlar: [string, string]; satirlar: Satir[] }) {
  const gecerli = satirlar.filter(s => s.yeni !== null || s.eski !== null);
  if (!gecerli.length) return null;
  return (
    <div className="card-glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      <div className="bil-satir bil-head">
        <span style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.2px", whiteSpace: "nowrap" }}>{baslik}</span>
          <span style={{ fontSize: 10.5, color: "#64748B", fontWeight: 600 }}>{birim}</span>
        </span>
        <span className="bil-num" style={{ fontSize: 12.5, fontWeight: 800, color: "#E2E8F0" }}>{kolonlar[0]}</span>
        <span className="bil-num" style={{ fontSize: 12.5, fontWeight: 800, color: "#E2E8F0" }}>{kolonlar[1]}</span>
        <span className="bil-num" style={{ fontSize: 12.5, fontWeight: 800, color: "#E2E8F0" }}>%</span>
      </div>
      {gecerli.map((s) => {
        const d = yuzdeDegisim(s.yeni, s.eski);
        return (
          <div key={s.ad} className="bil-satir">
            <span style={{ fontSize: 12.5, color: "#CBD5E1", lineHeight: 1.35 }}>{s.ad}</span>
            <span className="bil-num" style={{ fontSize: 12.5, fontWeight: 700, color: "#F8FAFC", fontVariantNumeric: "tabular-nums" }}>{binTL(s.yeni)}</span>
            <span className="bil-num" style={{ fontSize: 12.5, fontWeight: 600, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{binTL(s.eski)}</span>
            <span className="bil-num" style={{ fontSize: 12.5, fontWeight: 800, color: d.renk, fontVariantNumeric: "tabular-nums" }}>{d.metin}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function HisseBilanco({ ticker }: { ticker: string }) {
  const [b, setB] = useState<Bilanco | null>(null);
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    let iptal = false;
    fetch(`/api/bilanco/${ticker}`)
      .then(r => r.json())
      .then(j => { if (!iptal) { setB(j.bilanco); setYuklendi(true); } })
      .catch(() => { if (!iptal) setYuklendi(true); });
    return () => { iptal = true; };
  }, [ticker]);

  if (yuklendi && !b) return null;
  if (!b) return null;

  const s = b.ceyrek_seri;
  const el = (arr: (number | null)[] | undefined, i: number) => (arr && arr.length > i ? arr[i] : null);

  // Gelir Tablosu — YIL ONCE ayni ceyrek (index 0 vs 4). Akis kalemi, yil-uzeri karsilastirma.
  const gelirSatirlar: Satir[] = [
    { ad: "Hasılat", yeni: el(s?.hasilat, 0), eski: el(s?.hasilat, 4) },
    { ad: "Brüt Kâr", yeni: el(s?.brut_kar, 0), eski: el(s?.brut_kar, 4) },
    { ad: "FAVÖK", yeni: el(s?.favok, 0), eski: el(s?.favok, 4) },
    { ad: "Net Dönem Kârı", yeni: el(s?.net_kar, 0), eski: el(s?.net_kar, 4) },
  ];

  // Bilanco — ONCEKI ceyrek (index 0 vs 1). Stok kalemi. Ozkaynak/yukumluluk gecmisi yok -> yalniz guncel.
  const bilancoSatirlar: Satir[] = [
    { ad: "Toplam Varlıklar", yeni: el(s?.toplam_varlik, 0), eski: el(s?.toplam_varlik, 1) },
    { ad: "Toplam Yükümlülükler", yeni: b.toplam_yukumluluk, eski: null },
    { ad: "Özkaynaklar", yeni: b.ozkaynak, eski: null },
    { ad: "Toplam Borç", yeni: el(s?.toplam_borc, 0), eski: el(s?.toplam_borc, 1) },
  ];

  const sonTarih = b.son_bildirim_tarihi
    ? new Date(b.son_bildirim_tarihi).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <section style={{ marginTop: 26 }}>
      <style>{`
        .bil-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .bil-satir { display: grid; grid-template-columns: minmax(0,1.5fr) 1fr 1fr 56px; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .bil-satir:last-child { border-bottom: none; }
        .bil-head { border-bottom: 1px solid rgba(255,255,255,0.08); padding-top: 14px; padding-bottom: 14px; }
        .bil-num { text-align: right; }
        @media (max-width: 800px) {
          .bil-grid { grid-template-columns: 1fr; }
          .bil-satir { grid-template-columns: minmax(0,1.4fr) 1fr 1fr 48px; gap: 6px; padding: 11px 13px; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#F1F5F9", margin: 0, letterSpacing: "-0.3px" }}>Özet Finansallar</h2>
        {sonTarih && <span style={{ fontSize: 11, color: "#64748B" }}>Son bildirim: {sonTarih}</span>}
      </div>

      <div className="bil-grid">
        <KartTablo baslik="Özet Gelir Tablosu" birim="Bin ₺" kolonlar={["Son Çeyrek", "Geçen Yıl"]} satirlar={gelirSatirlar} />
        <KartTablo baslik="Özet Bilanço" birim="Bin ₺" kolonlar={["Son Çeyrek", "Önceki"]} satirlar={bilancoSatirlar} />
      </div>

      <p style={{ fontSize: 11, color: "#475569", marginTop: 10, lineHeight: 1.6 }}>
        Kaynak: TradingView (finansal tablolar). Değerler Bin ₺ ve son açıklanan finansal rapora dayanır; fiyat verisinden bağımsızdır. Gelir tablosu geçen yıl aynı çeyrekle, bilanço önceki çeyrekle karşılaştırılır. Bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.
      </p>
    </section>
  );
}
