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
  donen_varlik: number | null; duran_varlik: number | null; toplam_varlik: number | null;
  kv_yukumluluk: number | null; uv_yukumluluk: number | null; toplam_yukumluluk: number | null; ozkaynak: number | null;
  hasilat: number | null; brut_kar: number | null; faaliyet_kari: number | null; favok: number | null; net_kar: number | null;
  fk: number | null; pddd: number | null; roe: number | null; roa: number | null; borc_ozkaynak: number | null; hbk: number | null;
  ceyrek_seri: CeyrekSeri | null;
  son_bildirim_tarihi: string | null;
  updated_at: string;
};

// Buyuk TL degerini kompakt: Tn (trilyon) / Mr (milyar) / Mn (milyon).
function kompaktTL(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const mutlak = Math.abs(v);
  const isaret = v < 0 ? "−" : "";
  const fmt = (x: number) => x.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (mutlak >= 1e12) return `${isaret}${fmt(mutlak / 1e12)} Tn ₺`;
  if (mutlak >= 1e9) return `${isaret}${fmt(mutlak / 1e9)} Mr ₺`;
  if (mutlak >= 1e6) return `${isaret}${fmt(mutlak / 1e6)} Mn ₺`;
  return `${isaret}${mutlak.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;
}

function oran(v: number | null | undefined, ondalik = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("tr-TR", { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik });
}
function yuzde(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `%${v.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

// 4-ceyrek mini bar grafik (SVG). En yeni SOLDA olacak sekilde ters cevrilir (soldan saga eskiden yeniye).
function MiniBar({ seri, renk }: { seri: (number | null)[]; renk: string }) {
  const veri = seri.slice(0, 4).reverse(); // eskiden yeniye
  const gecerli = veri.filter((x): x is number => x !== null);
  if (gecerli.length < 2) return null;
  const max = Math.max(...gecerli.map(Math.abs));
  const w = 100, h = 40, bar = 18, gap = (w - bar * veri.length) / (veri.length + 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="44" preserveAspectRatio="none" aria-hidden="true">
      {veri.map((v, i) => {
        if (v === null) return null;
        const yuk = max > 0 ? (Math.abs(v) / max) * (h - 6) : 0;
        const x = gap + i * (bar + gap);
        const neg = v < 0;
        return <rect key={i} x={x} y={h - yuk} width={bar} height={Math.max(2, yuk)} rx="2" fill={neg ? "#EF4444" : renk} opacity={0.35 + 0.65 * (i + 1) / veri.length} />;
      })}
    </svg>
  );
}

export default function HisseBilanco({ ticker }: { ticker: string }) {
  const [b, setB] = useState<Bilanco | null>(null);
  const [yuklendi, setYuklendi] = useState(false);
  const [acik, setAcik] = useState(false);

  useEffect(() => {
    let iptal = false;
    fetch(`/api/bilanco/${ticker}`)
      .then(r => r.json())
      .then(j => { if (!iptal) { setB(j.bilanco); setYuklendi(true); } })
      .catch(() => { if (!iptal) setYuklendi(true); });
    return () => { iptal = true; };
  }, [ticker]);

  if (yuklendi && !b) return null; // veri yoksa bolumu hic gosterme

  const kartlar = [
    { l: "Toplam Varlık", v: kompaktTL(b?.toplam_varlik), c: "#60A5FA" },
    { l: "Özkaynak", v: kompaktTL(b?.ozkaynak), c: "#34D399" },
    { l: "Net Kâr (12A)", v: kompaktTL(b?.net_kar), c: b && (b.net_kar ?? 0) >= 0 ? "#34D399" : "#F87171" },
    { l: "F/K", v: oran(b?.fk), c: "#A78BFA" },
    { l: "PD/DD", v: oran(b?.pddd), c: "#A78BFA" },
    { l: "Özkaynak Kârlılığı", v: yuzde(b?.roe), c: "#FBBF24" },
  ];

  // Tam tablo: (etiket, deger, trend-serisi?) — trend'i olan kalemlerde MiniBar gosterilir.
  const seri = b?.ceyrek_seri;
  const tamSatirlar: { l: string; v: string; seri?: (number | null)[]; renk?: string }[] = [
    { l: "Dönen Varlıklar", v: kompaktTL(b?.donen_varlik) },
    { l: "Duran Varlıklar", v: kompaktTL(b?.duran_varlik) },
    { l: "Toplam Varlıklar", v: kompaktTL(b?.toplam_varlik), seri: seri?.toplam_varlik, renk: "#60A5FA" },
    { l: "Kısa Vadeli Yükümlülükler", v: kompaktTL(b?.kv_yukumluluk) },
    { l: "Uzun Vadeli Yükümlülükler", v: kompaktTL(b?.uv_yukumluluk) },
    { l: "Toplam Yükümlülükler", v: kompaktTL(b?.toplam_yukumluluk) },
    { l: "Özkaynaklar", v: kompaktTL(b?.ozkaynak) },
    { l: "Hasılat (12A)", v: kompaktTL(b?.hasilat), seri: seri?.hasilat, renk: "#34D399" },
    { l: "Brüt Kâr (12A)", v: kompaktTL(b?.brut_kar), seri: seri?.brut_kar, renk: "#34D399" },
    { l: "Faaliyet Kârı (12A)", v: kompaktTL(b?.faaliyet_kari) },
    { l: "FAVÖK (12A)", v: kompaktTL(b?.favok), seri: seri?.favok, renk: "#22D3EE" },
    { l: "Net Kâr (12A)", v: kompaktTL(b?.net_kar), seri: seri?.net_kar, renk: "#34D399" },
    { l: "Toplam Borç", v: kompaktTL(b && (b.ceyrek_seri?.toplam_borc?.[0] ?? null)), seri: seri?.toplam_borc, renk: "#FB923C" },
  ];

  const rasyolar = [
    { l: "F/K", v: oran(b?.fk) }, { l: "PD/DD", v: oran(b?.pddd) },
    { l: "ROE", v: yuzde(b?.roe) }, { l: "ROA", v: yuzde(b?.roa) },
    { l: "Borç/Özkaynak", v: oran(b?.borc_ozkaynak) }, { l: "Hisse Başı Kâr", v: oran(b?.hbk) },
  ];

  const sonTarih = b?.son_bildirim_tarihi
    ? new Date(b.son_bildirim_tarihi).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <section style={{ marginTop: 26 }}>
      <style>{`
        .bilanco-kartlar { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
        .bilanco-tablo { display: grid; grid-template-columns: 1fr 130px 108px; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .bilanco-tablo:last-child { border-bottom: none; }
        @media (max-width: 720px) {
          .bilanco-kartlar { grid-template-columns: repeat(3, 1fr); }
          .bilanco-tablo { grid-template-columns: 1fr 96px 70px; gap: 6px; padding: 9px 12px; }
        }
        @media (max-width: 420px) { .bilanco-kartlar { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#F1F5F9", margin: 0, letterSpacing: "-0.3px" }}>Bilanço & Temel Veriler</h2>
        {sonTarih && <span style={{ fontSize: 11, color: "#64748B" }}>Son bildirim: {sonTarih}</span>}
      </div>

      <div className="bilanco-kartlar">
        {kartlar.map(k => (
          <div key={k.l} className="card-glass" style={{ borderRadius: 11, padding: "12px 13px" }}>
            <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 5, lineHeight: 1.3 }}>{k.l}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: k.c, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.2px" }}>{k.v}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setAcik(a => !a)} style={{ marginTop: 12, width: "100%", padding: "11px 14px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.16)", borderRadius: 10, color: "#93C5FD", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {acik ? "Detaylı bilançoyu gizle ▲" : "Detaylı bilanço & rasyolar ▼"}
      </button>

      {acik && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card-glass" style={{ borderRadius: 12, overflow: "hidden" }}>
            <div className="bilanco-tablo" style={{ borderBottom: "1px solid rgba(59,130,246,0.12)", background: "rgba(59,130,246,0.04)" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Kalem</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>Son Çeyrek</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>4Ç Trend</span>
            </div>
            {tamSatirlar.map(r => (
              <div key={r.l} className="bilanco-tablo">
                <span style={{ fontSize: 12.5, color: "#CBD5E1" }}>{r.l}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#F1F5F9", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.v}</span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>{r.seri && r.renk ? <MiniBar seri={r.seri} renk={r.renk} /> : <span style={{ color: "#334155", fontSize: 11 }}>—</span>}</span>
              </div>
            ))}
          </div>

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Rasyolar</p>
            <div className="bilanco-kartlar">
              {rasyolar.map(r => (
                <div key={r.l} className="card-glass" style={{ borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>{r.l}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#E2E8F0", fontVariantNumeric: "tabular-nums" }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: "#475569", marginTop: 10, lineHeight: 1.6 }}>
        Kaynak: TradingView (finansal tablolar). Değerler son açıklanan finansal rapora dayanır; fiyat verisinden bağımsızdır. Trend çubukları son 4 çeyrektir (soldan sağa eskiden yeniye). Bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.
      </p>
    </section>
  );
}
