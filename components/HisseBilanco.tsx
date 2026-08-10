"use client";

import { useEffect, useState } from "react";

type DegerCifti = { yeni: number | null; eski: number | null };
type IsyOzet = {
  donem: string;
  gelirGecenYil: string;
  bilancoOnceki: string;
  gelir: { satislar: DegerCifti; brut_kar: DegerCifti; esas_faaliyet_kari: DegerCifti; favok: DegerCifti; net_donem_kari: DegerCifti };
  bilanco: { donen_varlik: DegerCifti; duran_varlik: DegerCifti; toplam_varlik: DegerCifti; finansal_borc: DegerCifti; net_borc: DegerCifti; ozkaynak: DegerCifti };
  para_birimi: string;
};

// Eski TradingView bilanco (banka fallback'i icin korunur).
type CeyrekSeri = { toplam_varlik: (number | null)[]; hasilat: (number | null)[]; brut_kar: (number | null)[]; net_kar: (number | null)[]; favok: (number | null)[]; toplam_borc: (number | null)[] };
type TvBilanco = { toplam_varlik: number | null; toplam_yukumluluk: number | null; ozkaynak: number | null; ceyrek_seri: CeyrekSeri | null; son_bildirim_tarihi: string | null };

// "Bin ₺": ham deger / 1000, binlik ayracli, ondaliksiz (Is Yatirim "Ozet Finansallar" birimi).
function binTL(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return Math.round(v / 1000).toLocaleString("tr-TR");
}

function yuzdeDegisim(yeni: number | null, eski: number | null): { metin: string; renk: string } {
  if (yeni === null || eski === null || eski === 0) return { metin: "—", renk: "#475569" };
  const d = ((yeni - eski) / Math.abs(eski)) * 100;
  const yuvarli = Math.round(d);
  return { metin: `%${yuvarli}`, renk: yuvarli >= 0 ? "#22C55E" : "#EF4444" };
}

type Satir = { ad: string; yeni: number | null; eski: number | null };

function KartTablo({ baslik, birim, kolonlar, satirlar }: { baslik: string; birim: string; kolonlar: [string, string]; satirlar: Satir[] }) {
  const gecerli = satirlar.filter((s) => s.yeni !== null || s.eski !== null);
  if (!gecerli.length) return null;
  return (
    <div className="card-glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      <div className="bil-satir bil-head">
        <span style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.2px", whiteSpace: "nowrap" }}>{baslik}</span>
          <span style={{ fontSize: 10.5, color: "#64748B", fontWeight: 600 }}>{birim}</span>
        </span>
        <span className="bil-num" style={{ fontSize: 12, fontWeight: 800, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>{kolonlar[0]}</span>
        <span className="bil-num" style={{ fontSize: 12, fontWeight: 800, color: "#64748B", fontVariantNumeric: "tabular-nums" }}>{kolonlar[1]}</span>
        <span className="bil-num" style={{ fontSize: 12, fontWeight: 800, color: "#64748B" }}>%</span>
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

function Cerceve({ sag, children, kaynak }: { sag: string; children: React.ReactNode; kaynak: string }) {
  return (
    <section style={{ marginTop: 26 }}>
      <style>{`
        .bil-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .bil-satir { display: grid; grid-template-columns: minmax(0,1.5fr) 1fr 1fr 52px; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .bil-satir:last-child { border-bottom: none; }
        .bil-head { border-bottom: 1px solid rgba(255,255,255,0.08); padding-top: 14px; padding-bottom: 14px; }
        .bil-num { text-align: right; }
        @media (max-width: 800px) { .bil-grid { grid-template-columns: 1fr; } .bil-satir { grid-template-columns: minmax(0,1.4fr) 1fr 1fr 46px; gap: 6px; padding: 11px 13px; } }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#F1F5F9", margin: 0, letterSpacing: "-0.3px" }}>Özet Finansallar</h2>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", background: "rgba(148,163,184,0.1)", borderRadius: 7, padding: "4px 10px" }}>{sag}</span>
      </div>
      <div className="bil-grid">{children}</div>
      <p style={{ fontSize: 11, color: "#475569", marginTop: 10, lineHeight: 1.6 }}>{kaynak}</p>
    </section>
  );
}

export default function HisseBilanco({ ticker }: { ticker: string }) {
  const [isy, setIsy] = useState<IsyOzet | null>(null);
  const [tv, setTv] = useState<TvBilanco | null>(null);
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    let iptal = false;
    void Promise.resolve().then(async () => {
      if (iptal) return;
      setYuklendi(false); setIsy(null); setTv(null);
      try {
        const j = await fetch(`/api/finansal/${ticker}`).then((r) => r.json());
        if (iptal) return;
        if (j?.veri?.ozet) { setIsy(j.veri.ozet); setYuklendi(true); return; }
      } catch { /* Is Yatirim yoksa TradingView'e dus */ }
      // Fallback: banka/eksik hisseler icin TradingView bilanco_snapshots.
      try {
        const j2 = await fetch(`/api/bilanco/${ticker}`).then((r) => r.json());
        if (!iptal) { setTv(j2?.bilanco ?? null); setYuklendi(true); }
      } catch { if (!iptal) setYuklendi(true); }
    });
    return () => { iptal = true; };
  }, [ticker]);

  if (!yuklendi) return null;

  // Birincil: Is Yatirim ozet finansal (ekran goruntusu 3 formati; onceki donem tam).
  if (isy) {
    const gelirSatirlar: Satir[] = [
      { ad: "Satışlar", yeni: isy.gelir.satislar.yeni, eski: isy.gelir.satislar.eski },
      { ad: "Brüt Kâr", yeni: isy.gelir.brut_kar.yeni, eski: isy.gelir.brut_kar.eski },
      { ad: "Esas Faaliyet Kârı", yeni: isy.gelir.esas_faaliyet_kari.yeni, eski: isy.gelir.esas_faaliyet_kari.eski },
      { ad: "FAVÖK", yeni: isy.gelir.favok.yeni, eski: isy.gelir.favok.eski },
      { ad: "Net Dönem Kârı", yeni: isy.gelir.net_donem_kari.yeni, eski: isy.gelir.net_donem_kari.eski },
    ];
    const bilancoSatirlar: Satir[] = [
      { ad: "Dönen Varlıklar", yeni: isy.bilanco.donen_varlik.yeni, eski: isy.bilanco.donen_varlik.eski },
      { ad: "Duran Varlıklar", yeni: isy.bilanco.duran_varlik.yeni, eski: isy.bilanco.duran_varlik.eski },
      { ad: "Toplam Varlıklar", yeni: isy.bilanco.toplam_varlik.yeni, eski: isy.bilanco.toplam_varlik.eski },
      { ad: "Finansal Borçlar", yeni: isy.bilanco.finansal_borc.yeni, eski: isy.bilanco.finansal_borc.eski },
      { ad: "Net Borç", yeni: isy.bilanco.net_borc.yeni, eski: isy.bilanco.net_borc.eski },
      { ad: "Özkaynaklar", yeni: isy.bilanco.ozkaynak.yeni, eski: isy.bilanco.ozkaynak.eski },
    ];
    if (![...gelirSatirlar, ...bilancoSatirlar].some((s) => s.yeni !== null || s.eski !== null)) return null;
    return (
      <Cerceve sag={isy.para_birimi}
        kaynak="Kaynak: İş Yatırım (finansal tablolar). Değerler Bin ₺ ve son açıklanan finansal rapora dayanır; fiyat verisinden bağımsızdır. Gelir tablosu geçen yıl aynı dönemle, bilanço önceki yıl sonuyla karşılaştırılır. Bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.">
        <KartTablo baslik="Özet Gelir Tablosu" birim="Bin ₺" kolonlar={[isy.donem, isy.gelirGecenYil]} satirlar={gelirSatirlar} />
        <KartTablo baslik="Özet Bilanço" birim="Bin ₺" kolonlar={[isy.donem, isy.bilancoOnceki]} satirlar={bilancoSatirlar} />
      </Cerceve>
    );
  }

  // Fallback: TradingView (banka vb.). Ozkaynak/yukumluluk gecmisi TradingView'de yok -> Onceki bos kalabilir.
  if (tv) {
    const s = tv.ceyrek_seri;
    const el = (arr: (number | null)[] | undefined, i: number) => (arr && arr.length > i ? arr[i] : null);
    const gelirSatirlar: Satir[] = [
      { ad: "Hasılat", yeni: el(s?.hasilat, 0), eski: el(s?.hasilat, 4) },
      { ad: "Brüt Kâr", yeni: el(s?.brut_kar, 0), eski: el(s?.brut_kar, 4) },
      { ad: "FAVÖK", yeni: el(s?.favok, 0), eski: el(s?.favok, 4) },
      { ad: "Net Dönem Kârı", yeni: el(s?.net_kar, 0), eski: el(s?.net_kar, 4) },
    ];
    const bilancoSatirlar: Satir[] = [
      { ad: "Toplam Varlıklar", yeni: el(s?.toplam_varlik, 0), eski: el(s?.toplam_varlik, 1) },
      { ad: "Toplam Yükümlülükler", yeni: tv.toplam_yukumluluk, eski: null },
      { ad: "Özkaynaklar", yeni: tv.ozkaynak, eski: null },
      { ad: "Toplam Borç", yeni: el(s?.toplam_borc, 0), eski: el(s?.toplam_borc, 1) },
    ];
    if (![...gelirSatirlar, ...bilancoSatirlar].some((sat) => sat.yeni !== null || sat.eski !== null)) return null;
    return (
    <Cerceve sag="TRY"
        kaynak="Kaynak: TradingView (finansal tablolar). Değerler Bin ₺ ve son açıklanan finansal rapora dayanır. Gelir tablosu geçen yıl aynı çeyrekle, bilanço önceki çeyrekle karşılaştırılır. Bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.">
        <KartTablo baslik="Özet Gelir Tablosu" birim="Bin ₺" kolonlar={["Son Çeyrek", "Geçen Yıl"]} satirlar={gelirSatirlar} />
        <KartTablo baslik="Özet Bilanço" birim="Bin ₺" kolonlar={["Son Çeyrek", "Önceki"]} satirlar={bilancoSatirlar} />
      </Cerceve>
    );
  }

  return null;
}
