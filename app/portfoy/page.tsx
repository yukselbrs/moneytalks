"use client";
import { useEffect, useState, useCallback } from "react";
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

interface RiskMap {
  [ticker: string]: { skor: string; ozet: string; yukleniyor: boolean; acik: boolean };
}

type Sekme = "portfoy" | "ekle";

export default function PortfoyPage() {
  const router = useRouter();
  const [portfoy, setPortfoy] = useState<PortfoyItem[]>([]);
  const [fiyatlar, setFiyatlar] = useState<FiyatMap>({});
  const [riskler, setRiskler] = useState<RiskMap>({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sekme, setSekme] = useState<Sekme>("portfoy");
  const [form, setForm] = useState({ ticker: "", adet: "", maliyet: "" });
  const [formHata, setFormHata] = useState("");
  const [formYukleniyor, setFormYukleniyor] = useState(false);

  const portfoyuYukle = useCallback(async () => {
    setYukleniyor(true);
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

      const tickers = data.map((p: { ticker: string }) => p.ticker).join(",");
      const res = await fetch("/api/fiyatlar?extra=" + tickers);
      const json = await res.json();
      const map = {};
      Object.entries(json).forEach(([ticker, val]) => {
        if (!val) return;
        const v = val;
        map[ticker] = {
          fiyat: parseFloat(v.fiyat.replace(/\./g, "").replace(",", ".")),
          degisim: parseFloat(v.degisim.replace(",", ".")),
        };
      });
      setFiyatlar(map);
    } finally {
      setYukleniyor(false);
    }
  }, [router]);

  useEffect(() => {
    portfoyuYukle();
  }, [portfoyuYukle]);

  const riskSkoru = useCallback(async (ticker) => {
    if (riskler[ticker]?.skor) return;
<<<<<<< HEAD
    setRiskler((prev) => ({ ...prev, [ticker]: { skor: "", ozet: "", yukleniyor: true, acik: false } }));
=======
    setRiskler((prev) => ({ ...prev, [ticker]: { skor: "", ozet: "", yukleniyor: true, acik: true } }));
>>>>>>> 27ccde9 (portfoy: direkt supabase client, token kaldirildi)
    try {
      const res = await fetch("/api/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, veriOnly: false }),
      });
      const json = await res.json();
      const analiz = json.analiz || "";
      const lower = analiz.toLowerCase();
      let skor = "Orta";
      if (lower.includes("yuksek risk") || lower.includes("dikkatli")) skor = "Yuksek";
      else if (lower.includes("dusuk risk") || lower.includes("guvenli") || lower.includes("olumlu")) skor = "Dusuk";
      const ozet = analiz.slice(0, 220).replace(/#+/g, "").trim() + "...";
      setRiskler((prev) => ({ ...prev, [ticker]: { skor, ozet, yukleniyor: false, acik: true } }));
    } catch {
<<<<<<< HEAD
      setRiskler((prev) => ({ ...prev, [ticker]: { skor: "?", ozet: "Analiz alınamadı.", yukleniyor: false, acik: false } }));
=======
      setRiskler((prev) => ({ ...prev, [ticker]: { skor: "?", ozet: "Analiz alinamadi.", yukleniyor: false, acik: true } }));
>>>>>>> 27ccde9 (portfoy: direkt supabase client, token kaldirildi)
    }
  }, [riskler]);

  const riskKapat = (ticker) => {
    setRiskler((prev) => ({ ...prev, [ticker]: { ...prev[ticker], acik: false } }));
  };

  const hisseEkle = async () => {
    setFormHata("");
    if (!form.ticker || !form.adet || !form.maliyet) { setFormHata("Tum alanlari doldurun."); return; }
    setFormYukleniyor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { error } = await supabase.from("portfoy").upsert(
        { user_id: session.user.id, ticker: form.ticker.toUpperCase(), adet: parseFloat(form.adet), maliyet: parseFloat(form.maliyet) },
        { onConflict: "user_id,ticker" }
      );
      if (error) { setFormHata(error.message); return; }
      setForm({ ticker: "", adet: "", maliyet: "" });
      setSekme("portfoy");
      await portfoyuYukle();
    } finally {
      setFormYukleniyor(false);
    }
  };

  const hisseSil = async (ticker) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("portfoy").delete().eq("user_id", session.user.id).eq("ticker", ticker);
    setPortfoy((prev) => prev.filter((p) => p.ticker !== ticker));
  };

  const plHesapla = (item) => {
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

  const portfoyRisk = (() => {
    if (portfoy.length === 0) return null;
    let puan = 0;
    if (portfoy.length === 1) puan += 40;
    else if (portfoy.length === 2) puan += 20;
    else if (portfoy.length >= 5) puan -= 10;
    const toplamDeger = portfoy.reduce((acc, p) => {
      const f = fiyatlar[p.ticker]?.fiyat || p.maliyet;
      return acc + p.adet * f;
    }, 0);
    if (toplamDeger > 0) {
      const maxPay = Math.max(...portfoy.map((p) => {
        const f = fiyatlar[p.ticker]?.fiyat || p.maliyet;
        return (p.adet * f) / toplamDeger;
      }));
      if (maxPay > 0.6) puan += 30;
      else if (maxPay > 0.4) puan += 15;
    }
    const degisimler = portfoy.map((p) => Math.abs(fiyatlar[p.ticker]?.degisim || 0)).filter((d) => d > 0);
    if (degisimler.length > 0) {
      const ort = degisimler.reduce((a, b) => a + b, 0) / degisimler.length;
      if (ort > 3) puan += 25;
      else if (ort > 1.5) puan += 10;
    }
    if (toplamPLYuzde < -10) puan += 20;
    else if (toplamPLYuzde < 0) puan += 10;
    if (puan >= 50) return { skor: "Yuksek", renk: "text-red-400", bg: "bg-red-900/20 border-red-800/40", emoji: "X" };
    if (puan >= 25) return { skor: "Orta", renk: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/40", emoji: "!" };
    return { skor: "Dusuk", renk: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/40", emoji: "OK" };
  })();

  const riskRenk = (skor) => {
    if (skor === "Dusuk") return "text-emerald-400 bg-emerald-400/10";
    if (skor === "Yuksek") return "text-red-400 bg-red-400/10";
    return "text-yellow-400 bg-yellow-400/10";
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Portfoy Takibi</h1>
            <p className="text-slate-400 text-sm mt-1">BIST pozisyonlarinizi takip edin, her hisse icin AI risk skoru alin</p>
          </div>
          <button
            onClick={() => setSekme(sekme === "ekle" ? "portfoy" : "ekle")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {sekme === "ekle" ? "Geri" : "+ Hisse Ekle"}
          </button>
        </div>

        {sekme === "ekle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-white font-semibold mb-4">Hisse Ekle / Guncelle</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Hisse Kodu</label>
                <input
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 uppercase"
                  placeholder="THYAO"
                  value={form.ticker}
                  onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Adet (lot)</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="100"
                  value={form.adet}
                  onChange={(e) => setForm({ ...form, adet: e.target.value })}
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Ortalama Maliyet</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="245.50"
                  value={form.maliyet}
                  onChange={(e) => setForm({ ...form, maliyet: e.target.value })}
                />
              </div>
            </div>
            {formHata && <p className="text-red-400 text-xs mt-3">{formHata}</p>}
            <button
              onClick={hisseEkle}
              disabled={formYukleniyor}
              className="mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {formYukleniyor ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        )}

        {portfoy.length > 0 && sekme === "portfoy" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">Toplam Maliyet</p>
              <p className="text-white font-bold text-lg">{toplamMaliyet.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">Guncel Deger</p>
              <p className="text-white font-bold text-lg">{toplamGuncel.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL</p>
            </div>
            <div className={"border rounded-xl p-4 " + (toplamPL >= 0 ? "bg-emerald-900/20 border-emerald-800/40" : "bg-red-900/20 border-red-800/40")}>
              <p className="text-slate-400 text-xs mb-1">Toplam K/Z</p>
              <p className={"font-bold text-lg " + (toplamPL >= 0 ? "text-emerald-400" : "text-red-400")}>
                {toplamPL >= 0 ? "+" : ""}{toplamPL.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL
              </p>
              <p className={"text-xs " + (toplamPL >= 0 ? "text-emerald-500" : "text-red-500")}>
                {toplamPLYuzde >= 0 ? "+" : ""}{toplamPLYuzde.toFixed(2)}%
              </p>
            </div>
            {portfoyRisk && (
              <div className={"border rounded-xl p-4 " + portfoyRisk.bg}>
                <p className="text-slate-400 text-xs mb-1">Portfoy Riski</p>
                <p className={"font-bold text-lg " + portfoyRisk.renk}>
                  {portfoyRisk.skor}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {portfoy.length} hisse
                </p>
              </div>
            )}
          </div>
        )}

        {sekme === "portfoy" && (
          <>
            {yukleniyor ? (
              <div className="text-slate-400 text-sm text-center py-12">Yukleniyor...</div>
            ) : portfoy.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-3">💼</p>
                <p className="text-sm">Henuz portfoyunuzde hisse yok.</p>
                <button onClick={() => setSekme("ekle")} className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline">
                  Ilk hissenizi ekleyin
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {portfoy.map((item) => {
                  const pl = plHesapla(item);
                  const risk = riskler[item.ticker];
                  const fiyat = fiyatlar[item.ticker];
                  return (
                    <div key={item.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={"/hisse/" + item.ticker} className="text-white font-bold hover:text-blue-400 transition-colors">
                              {item.ticker}
                            </Link>
                            {fiyat && (
                              <span className={"text-xs font-medium " + (fiyat.degisim >= 0 ? "text-emerald-400" : "text-red-400")}>
                                {fiyat.degisim >= 0 ? "+" : ""}{Math.abs(fiyat.degisim).toFixed(2)}%
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs">
                            {item.adet} lot - Maliyet: {item.maliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {fiyat ? (
                            <>
                              <p className="text-white font-semibold">{fiyat.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</p>
                              {pl && (
                                <p className={"text-xs font-medium " + (pl.pl >= 0 ? "text-emerald-400" : "text-red-400")}>
                                  {pl.pl >= 0 ? "+" : ""}{pl.pl.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL ({pl.plYuzde >= 0 ? "+" : ""}{pl.plYuzde.toFixed(2)}%)
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-slate-500 text-xs">Fiyat bekleniyor...</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {risk && risk.acik ? (
                            risk.yukleniyor ? (
                              <span className="text-slate-400 text-xs animate-pulse">AI analiz yapiliyor...</span>
                            ) : (
                              <>
                                <span className={"text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 " + riskRenk(risk.skor)}>
                                  {risk.skor} Risk
                                </span>
                                <p className="text-slate-400 text-xs truncate flex-1">{risk.ozet}</p>
                                <button onClick={() => riskKapat(item.ticker)} className="text-slate-500 hover:text-slate-300 text-xs">x</button>
                              </>
                            )
                          ) : risk && !risk.acik ? (
                            <button onClick={() => setRiskler((prev) => ({ ...prev, [item.ticker]: { ...prev[item.ticker], acik: true } }))} className="text-xs text-blue-400 hover:text-blue-300 underline">
                              Risk Skorunu Goster
                            </button>
                          ) : (
                            <button onClick={() => riskSkoru(item.ticker)} className="text-xs text-blue-400 hover:text-blue-300 underline">
                              AI Risk Skoru Al
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Link href={"/hisse/" + item.ticker} className="text-xs text-slate-400 hover:text-white transition-colors">
                            Analiz
                          </Link>
                          <button onClick={() => hisseSil(item.ticker)} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
