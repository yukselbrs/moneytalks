"use client";
import React, { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/components/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PortfoyItem {
  id: string;
  ticker: string;
  adet: number;
  maliyet: number;
}

interface FiyatMap {
  [ticker: string]: { fiyat: number; degisim: number };
}

interface RiskBilesen {
  ad: string; deger: string; risk: number; agirlik: number;
}
interface RiskEntry {
  skor: string; ozet: string; yukleniyor: boolean; acik: boolean; skor100?: number; bilesenler?: RiskBilesen[]; detay?: boolean;
}
interface RiskMap {
  [ticker: string]: RiskEntry;
}

interface LotModal {
  open: boolean;
  ticker: string;
  mevcutAdet: number;
  mevcutMaliyet: number;
  islem: "ekle" | "cikar";
  adet: string;
  fiyat: string;
}

interface EkleModal {
  open: boolean;
  ticker: string;
  adet: string;
  maliyet: string;
  hata: string;
  yükleniyor: boolean;
}

interface SilModal {
  open: boolean;
  ticker: string;
}

export default function PortfoyPage() {
  const router = useRouter();
  const [portfoy, setPortfoy] = useState<PortfoyItem[]>([]);
  const [fiyatlar, setFiyatlar] = useState<FiyatMap>({});
  const [riskler, setRiskler] = useState<RiskMap>({});
  const [yükleniyor, setYükleniyor] = useState(true);

  const [lotModal, setLotModal] = useState<LotModal>({
    open: false, ticker: "", mevcutAdet: 0, mevcutMaliyet: 0,
    islem: "ekle", adet: "", fiyat: "",
  });
  const [lotHata, setLotHata] = useState("");
  const [lotYükleniyor, setLotYükleniyor] = useState(false);

  const [ekleModal, setEkleModal] = useState<EkleModal>({
    open: false, ticker: "", adet: "", maliyet: "", hata: "", yukleniyor: false,
  });

  const [silModal, setSilModal] = useState<SilModal>({ open: false, ticker: "" });
  const [portfoyRiskSkor, setPortfoyRiskSkor] = useState<{ skor: number; seviye: string; yukleniyor: boolean } | null>(null);

  const portfoyuYukle = useCallback(async () => {
    setYükleniyor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("portfoy")
        .select("id, ticker, adet, maliyet")
        .order("created_at", { ascending: true });
      if (error) { console.error("Portfoy yuklenemedi", error); return; }
      if (!data || data.length === 0) { setPortfoy([]); return; }
      setPortfoy(data);
      const tickers = data.map((p: { ticker: string }) => p.ticker.trim()).join(",");
      try {
        const res = await fetch("/api/fiyatlar?extra=" + tickers);
        const json = await res.json();
        const map: FiyatMap = {};
        Object.entries(json).forEach(([ticker, val]) => {
          if (!val) return;
          const v = val as { fiyat: string; degisim: string };
          map[ticker] = {
            fiyat: parseFloat(v.fiyat.replace(/\./g, "").replace(",", ".")),
            degisim: parseFloat(v.degisim.replace(",", ".")),
          };
        });
        setFiyatlar(map);

        // Portföy ortalama risk — tüm hisselerin skorlarını paralel çek
        setPortfoyRiskSkor({ skor: 0, seviye: "", yukleniyor: true });
        const riskSonuclari = await Promise.all(
          data.map(async (p: { ticker: string; adet: number; maliyet: number }) => {
            try {
              const r = await fetch(`/api/risk?ticker=${p.ticker.trim()}`);
              const rj = await r.json();
              const fiyat = map[p.ticker.trim()]?.fiyat || p.maliyet;
              const deger = p.adet * fiyat;
              return { skor: rj.skor || 0, deger };
            } catch { return { skor: 35, deger: p.adet * p.maliyet }; }
          })
        );
        const toplamDeger = riskSonuclari.reduce((a, b) => a + b.deger, 0);
        const agirlikliSkor = toplamDeger > 0
          ? riskSonuclari.reduce((a, b) => a + (b.skor * b.deger / toplamDeger), 0)
          : riskSonuclari.reduce((a, b) => a + b.skor, 0) / riskSonuclari.length;
        const seviye = agirlikliSkor >= 60 ? "Yüksek" : agirlikliSkor >= 35 ? "Orta" : "Düşük";
        setPortfoyRiskSkor({ skor: Math.round(agirlikliSkor), seviye, yukleniyor: false });
      } catch (e) { console.error("Fiyat fetch HATA:", e); }
    } finally { setYükleniyor(false); }
  }, [router]);

  useEffect(() => { portfoyuYukle(); }, [portfoyuYukle]);

  const riskSkoru = useCallback(async (ticker: string) => {
    if (riskler[ticker]?.skor) return;
    setRiskler((prev) => ({ ...prev, [ticker]: { skor: "", ozet: "", yukleniyor: true, acik: true } }));
    try {
      const res = await fetch(`/api/risk?ticker=${ticker}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const skor = json.seviyeTR || "Orta";
      const ozet = `Beta: ${json.meta?.beta} · Volatilite: %${json.meta?.volatilite} · RSI: ${json.meta?.rsi}`;
      setRiskler((prev) => ({ ...prev, [ticker]: { skor, ozet, yukleniyor: false, acik: true, skor100: json.skor, bilesenler: json.bilesenler } }));
    } catch {
      setRiskler((prev) => ({ ...prev, [ticker]: { skor: "?", ozet: "Hesaplama hatasi.", yukleniyor: false, acik: true } }));
    }
  }, [riskler]);

  const hisseEkle = async () => {
    setEkleModal((m) => ({ ...m, hata: "" }));
    if (!ekleModal.ticker || !ekleModal.adet || !ekleModal.maliyet) {
      setEkleModal((m) => ({ ...m, hata: "Tum alanlari doldurun." })); return;
    }
    setEkleModal((m) => ({ ...m, yukleniyor: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { error } = await supabase.from("portfoy").upsert(
        {
          user_id: session.user.id,
          ticker: ekleModal.ticker.toUpperCase().replace(/\x00/g, "").trim(),
          adet: parseFloat(ekleModal.adet),
          maliyet: parseFloat(ekleModal.maliyet),
        },
        { onConflict: "user_id,ticker" }
      );
      if (error) { setEkleModal((m) => ({ ...m, hata: error.message, yukleniyor: false })); return; }
      setEkleModal({ open: false, ticker: "", adet: "", maliyet: "", hata: "", yukleniyor: false });
      await portfoyuYukle();
    } catch { setEkleModal((m) => ({ ...m, yukleniyor: false })); }
  };

  const lotGüncelle = async () => {
    setLotHata("");
    const adet = parseFloat(lotModal.adet);
    const fiyat = parseFloat(lotModal.fiyat);
    if (!adet || adet <= 0 || !fiyat || fiyat <= 0) { setLotHata("Gecerli adet ve fiyat girin."); return; }
    if (lotModal.islem === "cikar" && adet > lotModal.mevcutAdet) { setLotHata("Mevcut adetten fazla cikarilamaz."); return; }
    setLotYükleniyor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let yeniAdet: number;
      let yeniMaliyet: number;
      if (lotModal.islem === "ekle") {
        yeniAdet = lotModal.mevcutAdet + adet;
        yeniMaliyet = ((lotModal.mevcutAdet * lotModal.mevcutMaliyet) + (adet * fiyat)) / yeniAdet;
      } else {
        yeniAdet = lotModal.mevcutAdet - adet;
        yeniMaliyet = lotModal.mevcutMaliyet;
      }
      if (yeniAdet <= 0) {
        await supabase.from("portfoy").delete().eq("user_id", session.user.id).eq("ticker", lotModal.ticker);
      } else {
        await supabase.from("portfoy").update({ adet: yeniAdet, maliyet: parseFloat(yeniMaliyet.toFixed(4)) })
          .eq("user_id", session.user.id).eq("ticker", lotModal.ticker);
      }
      setLotModal({ open: false, ticker: "", mevcutAdet: 0, mevcutMaliyet: 0, islem: "ekle", adet: "", fiyat: "" });
      await portfoyuYukle();
    } finally { setLotYükleniyor(false); }
  };

  const hisseSil = async (ticker: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("portfoy").delete().eq("user_id", session.user.id).eq("ticker", ticker);
    setPortfoy((prev) => prev.filter((p) => p.ticker !== ticker));
    setSilModal({ open: false, ticker: "" });
  };

  const plHesapla = (item: PortfoyItem) => {
    const guncel = fiyatlar[item.ticker]?.fiyat;
    if (!guncel) return null;
    const maliyet_toplam = item.adet * item.maliyet;
    const guncel_toplam = item.adet * guncel;
    const pl = guncel_toplam - maliyet_toplam;
    const plYuzde = (pl / maliyet_toplam) * 100;
    return { maliyet_toplam, guncel_toplam, pl, plYuzde };
  };

  const toplamMaliyet = portfoy.reduce((acc, p) => acc + p.adet * p.maliyet, 0);
  const toplamGuncel = portfoy.reduce((acc, p) => {
    const f = fiyatlar[p.ticker]?.fiyat;
    return acc + (f ? p.adet * f : p.adet * p.maliyet);
  }, 0);
  const toplamPL = toplamGuncel - toplamMaliyet;
  const toplamPLYuzde = toplamMaliyet > 0 ? (toplamPL / toplamMaliyet) * 100 : 0;



  const riskRenk = (skor: string) => {
    if (skor === "Düşük") return "text-emerald-400 bg-emerald-400/10";
    if (skor === "Yüksek") return "text-red-400 bg-red-400/10";
    return "text-yellow-400 bg-yellow-400/10";
  };

  const inputCls = "w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500";

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8">

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Portföy Takibi</h1>
            <p className="text-slate-400 text-sm mt-1">BIST pozisyonlarınızı takip edin, her hisse için AI risk skoru alın</p>
          </div>
          <button
            onClick={() => setEkleModal({ open: true, ticker: "", adet: "", maliyet: "", hata: "", yukleniyor: false })}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Hisse Ekle
          </button>
        </div>

        {portfoy.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">Toplam Maliyet</p>
              <p className="text-white font-bold text-lg">{toplamMaliyet.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">Güncel Değer</p>
              <p className="text-white font-bold text-lg">{toplamGuncel.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</p>
            </div>
            <div className={`border rounded-xl p-4 ${toplamPL >= 0 ? "bg-emerald-900/20 border-emerald-800/40" : "bg-red-900/20 border-red-800/40"}`}>
              <p className="text-slate-400 text-xs mb-1">Toplam K/Z</p>
              <p className={`font-bold text-lg ${toplamPL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {toplamPL >= 0 ? "+" : ""}{toplamPL.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
              </p>
              <p className={`text-xs ${toplamPL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {toplamPLYuzde >= 0 ? "+" : ""}{toplamPLYuzde.toFixed(2)}%
              </p>
            </div>
            {portfoyRiskSkor && (
              <div className={`border rounded-xl p-4 ${
                portfoyRiskSkor.yukleniyor ? "bg-slate-800/60 border-slate-700" :
                portfoyRiskSkor.seviye === "Yüksek" ? "bg-red-900/20 border-red-800/40" :
                portfoyRiskSkor.seviye === "Orta" ? "bg-yellow-900/20 border-yellow-800/40" :
                "bg-emerald-900/20 border-emerald-800/40"
              }`}>
                <p className="text-slate-400 text-xs mb-1">Portföy Riski</p>
                {portfoyRiskSkor.yukleniyor ? (
                  <p className="text-slate-500 text-sm animate-pulse">Hesaplanıyor...</p>
                ) : (
                  <>
                    <p className={`font-bold text-lg ${
                      portfoyRiskSkor.seviye === "Yüksek" ? "text-red-400" :
                      portfoyRiskSkor.seviye === "Orta" ? "text-yellow-400" : "text-emerald-400"
                    }`}>
                      {portfoyRiskSkor.seviye === "Yüksek" ? "🔴" : portfoyRiskSkor.seviye === "Orta" ? "🟡" : "🟢"} {portfoyRiskSkor.seviye}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">{portfoy.length} hisse · Ort. {portfoyRiskSkor.skor}/100</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {yükleniyor ? (
          <div className="text-slate-400 text-sm text-center py-12">Yükleniyor...</div>
        ) : portfoy.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">💼</p>
            <p className="text-sm">Henüz portföyünüzde hisse yok.</p>
            <button
              onClick={() => setEkleModal({ open: true, ticker: "", adet: "", maliyet: "", hata: "", yukleniyor: false })}
              className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline"
            >
              İlk hissenizi ekleyin
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Hisse</th>
                  <th className="text-right px-4 py-3 font-medium">Lot</th>
                  <th className="text-right px-4 py-3 font-medium">Ort. Maliyet</th>
                  <th className="text-right px-4 py-3 font-medium">Güncel Fiyat</th>
                  <th className="text-right px-4 py-3 font-medium">Ana Para</th>
                  <th className="text-right px-4 py-3 font-medium">Güncel Değer</th>
                  <th className="text-right px-4 py-3 font-medium">K/Z ₺</th>
                  <th className="text-right px-4 py-3 font-medium">K/Z %</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {portfoy.map((item, idx) => {
                  const pl = plHesapla(item);
                  const fiyat = fiyatlar[item.ticker];
                  const risk = riskler[item.ticker];
                  const isPos = pl ? pl.pl >= 0 : null;
                  return (
                    <React.Fragment key={item.id}>
                    <tr className={`hover:bg-slate-700/20 transition-colors ${!risk?.detay && idx !== portfoy.length - 1 ? "border-b border-slate-700/50" : ""}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/hisse/${item.ticker}`} className="text-white font-bold hover:text-blue-400 transition-colors">
                            {item.ticker}
                          </Link>
                          {fiyat && (
                            <span className={`text-xs font-medium ${fiyat.degisim >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {fiyat.degisim >= 0 ? "▲" : "▼"} {Math.abs(fiyat.degisim).toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          {risk && risk.acik ? (
                            risk.yukleniyor ? (
                              <span className="text-slate-500 text-xs animate-pulse">Hesaplanıyor...</span>
                            ) : (
                              <div>
                                <button
                                  onClick={() => setRiskler((prev) => ({ ...prev, [item.ticker]: { ...prev[item.ticker], detay: !prev[item.ticker]?.detay } }))}
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskRenk(risk.skor)} cursor-pointer`}
                                >
                                  {risk.skor} Risk {risk.skor100 !== undefined ? `(${risk.skor100}/100)` : ""} {risk.detay ? "▲" : "▼"}
                                </button>

                              </div>
                            )
                          ) : (
                            <button onClick={() => riskSkoru(item.ticker)} className="text-xs text-slate-500 hover:text-blue-400 transition-colors">
                              AI Risk Al
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-white">{item.adet.toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-4 text-right text-slate-300">{item.maliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
                      <td className="px-4 py-4 text-right text-white">
                        {fiyat ? `${fiyat.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺` : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-300">
                        {(item.adet * item.maliyet).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                      </td>
                      <td className="px-4 py-4 text-right text-white">
                        {pl ? `${pl.guncel_toplam.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺` : <span className="text-slate-500">—</span>}
                      </td>
                      <td className={`px-4 py-4 text-right font-medium ${isPos === null ? "text-slate-500" : isPos ? "text-emerald-400" : "text-red-400"}`}>
                        {pl ? `${pl.pl >= 0 ? "+" : ""}${pl.pl.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺` : "—"}
                      </td>
                      <td className={`px-4 py-4 text-right font-medium ${isPos === null ? "text-slate-500" : isPos ? "text-emerald-400" : "text-red-400"}`}>
                        {pl ? `${pl.plYuzde >= 0 ? "+" : ""}${pl.plYuzde.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setLotModal({ open: true, ticker: item.ticker, mevcutAdet: item.adet, mevcutMaliyet: item.maliyet, islem: "ekle", adet: "", fiyat: "" })}
                            title="Lot Ekle/Cikar"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition-colors font-bold"
                          >
                            ±
                          </button>
                          <Link href={`/hisse/${item.ticker}`} title="Analiz" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition-colors">
                            →
                          </Link>
                          <button
                            onClick={() => setSilModal({ open: true, ticker: item.ticker })}
                            title="Sil"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                    {risk?.detay && risk?.bilesenler && (
                      <tr key={item.id + "_detay"} className="border-b border-slate-700/50 bg-slate-900/30">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="grid grid-cols-7 gap-3">
                            {risk.bilesenler.map((b, i) => {
                              const aciklama: Record<string, string> = {
                                "Beta (Sistematik Risk)": "Piyasa duyarlılığı (CAPM). >1 daha oynak.",
                                "Volatilite (Yillik)": "Yıllık oynaklık. Yüksekse belirsizlik artar.",
                                "52H Pozisyonu": "%90+ aşırı alım, %15- dip riski.",
                                "Momentum (20g)": "20 günlük fiyat trendi.",
                                "Hacim Anomalisi": ">2x anormal aktivite sinyali.",
                                "RSI (14)": ">70 aşırı alım, <30 aşırı satım.",
                                "Gunluk Range": "Intraday volatilite göstergesi.",
                              };
                              const barRenk = b.risk >= 55 ? "bg-red-500" : b.risk >= 35 ? "bg-yellow-500" : "bg-emerald-500";
                              const textRenk = b.risk >= 55 ? "text-red-400" : b.risk >= 35 ? "text-yellow-400" : "text-emerald-400";
                              return (
                                <div key={i} className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-xs">{b.ad}</span>
                                    <span className={`text-xs font-semibold ${textRenk}`}>{b.deger}</span>
                                  </div>
                                  <div className="w-full bg-slate-700/60 rounded-full h-1">
                                    <div className={`h-1 rounded-full transition-all ${barRenk}`} style={{ width: `${Math.min(Math.round((b.risk / 80) * 100), 100)}%` }} />
                                  </div>
                                  <p className="text-slate-600 text-xs leading-tight">{aciklama[b.ad] || ""}</p>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ekleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">Hisse Ekle</h2>
              <button onClick={() => setEkleModal((m) => ({ ...m, open: false }))} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Hisse Kodu</label>
                <input className={inputCls + " uppercase"} placeholder="THYAO" value={ekleModal.ticker}
                  onChange={(e) => setEkleModal((m) => ({ ...m, ticker: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Adet (lot)</label>
                <input type="number" className={inputCls} placeholder="100" value={ekleModal.adet}
                  onChange={(e) => setEkleModal((m) => ({ ...m, adet: e.target.value }))} />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Ortalama Maliyet (₺)</label>
                <input type="number" className={inputCls} placeholder="245.50" value={ekleModal.maliyet}
                  onChange={(e) => setEkleModal((m) => ({ ...m, maliyet: e.target.value }))} />
              </div>
            </div>
            {ekleModal.hata && <p className="text-red-400 text-xs mt-3">{ekleModal.hata}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEkleModal((m) => ({ ...m, open: false }))}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors">
                İptal
              </button>
              <button onClick={hisseEkle} disabled={ekleModal.yükleniyor}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                {ekleModal.yükleniyor ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {lotModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold text-lg">{lotModal.ticker} — Lot Güncelle</h2>
              <button onClick={() => setLotModal((m) => ({ ...m, open: false }))} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-slate-400 text-xs mb-5">
              Mevcut: {lotModal.mevcutAdet} lot · Ort. maliyet: {lotModal.mevcutMaliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
            </p>
            <div className="flex bg-slate-900 rounded-lg p-1 mb-5">
              {(["ekle", "cikar"] as const).map((i) => (
                <button key={i} onClick={() => setLotModal((m) => ({ ...m, islem: i, adet: "", fiyat: "" }))}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${lotModal.islem === i ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
                  {i === "ekle" ? "+ Lot Ekle" : "- Lot Çıkar"}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Adet</label>
                <input type="number" className={inputCls} placeholder="50" value={lotModal.adet}
                  onChange={(e) => setLotModal((m) => ({ ...m, adet: e.target.value }))} />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">
                  {lotModal.islem === "ekle" ? "Alış Fiyatı (₺) — ortalama maliyet güncellenir" : "Satış Fiyatı (₺)"}
                </label>
                <input type="number" className={inputCls} placeholder="320.00" value={lotModal.fiyat}
                  onChange={(e) => setLotModal((m) => ({ ...m, fiyat: e.target.value }))} />
              </div>
              {lotModal.islem === "ekle" && lotModal.adet && lotModal.fiyat && !isNaN(parseFloat(lotModal.adet)) && !isNaN(parseFloat(lotModal.fiyat)) && (
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400">
                  Yeni ort. maliyet:{" "}
                  <span className="text-white font-medium">
                    {(((lotModal.mevcutAdet * lotModal.mevcutMaliyet) + (parseFloat(lotModal.adet) * parseFloat(lotModal.fiyat))) / (lotModal.mevcutAdet + parseFloat(lotModal.adet))).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                  </span>
                  {" · Toplam lot: "}
                  <span className="text-white font-medium">{(lotModal.mevcutAdet + parseFloat(lotModal.adet)).toLocaleString("tr-TR")}</span>
                </div>
              )}
              {lotModal.islem === "cikar" && lotModal.adet && lotModal.fiyat && !isNaN(parseFloat(lotModal.adet)) && !isNaN(parseFloat(lotModal.fiyat)) && (() => {
                const satisFiyati = parseFloat(lotModal.fiyat);
                const satisAdet = parseFloat(lotModal.adet);
                const kazanc = (satisFiyati - lotModal.mevcutMaliyet) * satisAdet;
                const kazancYuzde = ((satisFiyati - lotModal.mevcutMaliyet) / lotModal.mevcutMaliyet) * 100;
                const kalanAdet = lotModal.mevcutAdet - satisAdet;
                return (
                  <div className={`border rounded-lg px-3 py-2 text-xs ${kazanc >= 0 ? "bg-emerald-900/20 border-emerald-800/40" : "bg-red-900/20 border-red-800/40"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400">Bu satıştan gerçekleşen K/Z:</span>
                      <span className={`font-bold ${kazanc >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {kazanc >= 0 ? "+" : ""}{kazanc.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Getiri oranı · Kalan lot</span>
                      <span className={`${kazanc >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {kazanc >= 0 ? "+" : ""}{kazancYuzde.toFixed(2)}% · {kalanAdet} lot
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            {lotHata && <p className="text-red-400 text-xs mt-3">{lotHata}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setLotModal((m) => ({ ...m, open: false })); setLotHata(""); }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors">
                İptal
              </button>
              <button onClick={lotGüncelle} disabled={lotYükleniyor}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                {lotYükleniyor ? "Kaydediliyor..." : "Güncelle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {silModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-white font-semibold text-lg mb-2">Hisseyi Sil</h2>
            <p className="text-slate-400 text-sm mb-6">
              <span className="text-white font-bold">{silModal.ticker}</span> portföyden kalıcı olarak silinecek. Emin misiniz?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSilModal({ open: false, ticker: "" })}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors">
                Vazgeç
              </button>
              <button onClick={() => hisseSil(silModal.ticker)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
