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
  const [token, setToken] = useState<string | null>(null);
  const [portfoy, setPortfoy] = useState<PortfoyItem[]>([]);
  const [fiyatlar, setFiyatlar] = useState<FiyatMap>({});
  const [riskler, setRiskler] = useState<RiskMap>({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sekme, setSekme] = useState<Sekme>("portfoy");
  const [form, setForm] = useState({ ticker: "", adet: "", maliyet: "" });
  const [formHata, setFormHata] = useState("");
  const [formYukleniyor, setFormYukleniyor] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
    });
  }, [router]);

  const portfoyuYukle = useCallback(async (t: string) => {
    setYukleniyor(true);
    try {
      const res = await fetch("/api/portfoy", {
        headers: { authorization: `Bearer ${t}` },
      });
      const json = await res.json();
      if (json.portfoy) setPortfoy(json.portfoy);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    if (token) portfoyuYukle(token);
  }, [token, portfoyuYukle]);

  useEffect(() => {
    if (portfoy.length === 0) return;
    const tickers = portfoy.map((p) => p.ticker).join(",");
    fetch(`/api/fiyatlar?extra=${tickers}`)
      .then((r) => r.json())
      .then((json) => {
        const map: FiyatMap = {};
        Object.entries(json).forEach(([ticker, val]: [string, unknown]) => {
          const v = val as { fiyat: string; degisim: string };
          map[ticker] = {
            fiyat: parseFloat(v.fiyat.replace(",", ".")),
            degisim: parseFloat(v.degisim),
          };
        });
        setFiyatlar(map);
      });
  }, [portfoy]);

  const riskSkoru = useCallback(async (ticker: string) => {
    if (riskler[ticker]?.skor) return;
    setRiskler((prev) => ({ ...prev, [ticker]: { skor: "", ozet: "", yukleniyor: true } }));
    try {
      const res = await fetch("/api/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, veriOnly: false }),
      });
      const json = await res.json();
      const analiz: string = json.analiz || "";
      const lower = analiz.toLowerCase();
      let skor = "Orta";
      if (lower.includes("yuksek risk") || lower.includes("dikkatli")) skor = "Yüksek";
      else if (lower.includes("dusuk risk") || lower.includes("guvenli") || lower.includes("olumlu")) skor = "Düşük";
      const ozet = analiz.slice(0, 220).replace(/#+/g, "").trim() + "...";
      setRiskler((prev) => ({ ...prev, [ticker]: { skor, ozet, yukleniyor: false, acik: true } }));
    } catch {
      setRiskler((prev) => ({ ...prev, [ticker]: { skor: "?", ozet: "Analiz alınamadı.", yukleniyor: false } }));
    }
  }, [riskler]);

  const riskKapat = (ticker: string) => {
    setRiskler((prev) => ({ ...prev, [ticker]: { ...prev[ticker], acik: false } }));
  };

  const hisseEkle = async () => {
    setFormHata("");
    if (!form.ticker || !form.adet || !form.maliyet) { setFormHata("Tüm alanları doldurun."); return; }
    if (!token) return;
    setFormYukleniyor(true);
    try {
      const res = await fetch("/api/portfoy", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticker: form.ticker.toUpperCase(), adet: parseFloat(form.adet), maliyet: parseFloat(form.maliyet) }),
      });
      const json = await res.json();
      if (json.error) { setFormHata(json.error); return; }
      setForm({ ticker: "", adet: "", maliyet: "" });
      setSekme("portfoy");
      await portfoyuYukle(token);
    } finally {
      setFormYukleniyor(false);
    }
  };

  const hisseSil = async (ticker: string) => {
    if (!token) return;
    await fetch("/api/portfoy", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticker }),
    });
    setPortfoy((prev) => prev.filter((p) => p.ticker !== ticker));
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

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Portföy Takibi</h1>
            <p className="text-slate-400 text-sm mt-1">BIST pozisyonlarınızı takip edin, her hisse için AI risk skoru alın</p>
          </div>
          <button
            onClick={() => setSekme(sekme === "ekle" ? "portfoy" : "ekle")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {sekme === "ekle" ? "← Geri" : "+ Hisse Ekle"}
          </button>
        </div>

        {sekme === "ekle" && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-white font-semibold mb-4">Hisse Ekle / Güncelle</h2>
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
                <label className="text-slate-400 text-xs mb-1 block">Ortalama Maliyet (₺)</label>
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
              {formYukleniyor ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        )}

        {portfoy.length > 0 && sekme === "portfoy" && (
          <div className="grid grid-cols-3 gap-4 mb-6">
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
          </div>
        )}

        {sekme === "portfoy" && (
          <>
            {yukleniyor ? (
              <div className="text-slate-400 text-sm text-center py-12">Yükleniyor…</div>
            ) : portfoy.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-3">💼</p>
                <p className="text-sm">Henüz portföyünüzde hisse yok.</p>
                <button onClick={() => setSekme("ekle")} className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline">
                  İlk hissenizi ekleyin
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
                        <div className="flex items-center gap-3 min-w-0">
                          <div>
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
                            <p className="text-slate-400 text-xs">
                              {item.adet} lot · Maliyet: {item.maliyet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {fiyat ? (
                            <>
                              <p className="text-white font-semibold">{fiyat.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p>
                              {pl && (
                                <p className={`text-xs font-medium ${pl.pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {pl.pl >= 0 ? "+" : ""}{pl.pl.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺ ({pl.plYuzde >= 0 ? "+" : ""}{pl.plYuzde.toFixed(2)}%)
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-slate-500 text-xs">Fiyat bekleniyor…</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {risk && risk.acik ? (
                            risk.yukleniyor ? (
                              <span className="text-slate-400 text-xs animate-pulse">AI analiz yapılıyor…</span>
                            ) : (
                              <>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${riskRenk(risk.skor)}`}>
                                  {risk.skor} Risk
                                </span>
                                <p className="text-slate-400 text-xs truncate flex-1">{risk.ozet}</p>
                                <button onClick={() => riskKapat(item.ticker)} className="text-slate-500 hover:text-slate-300 text-xs flex-shrink-0" title="Kapat">✕</button>
                              </>
                            )
                          ) : risk && !risk.acik ? (
                            <button onClick={() => setRiskler((prev) => ({ ...prev, [item.ticker]: { ...prev[item.ticker], acik: true } }))} className="text-xs text-blue-400 hover:text-blue-300 underline">
                              Risk Skorunu Göster
                            </button>
                          ) : (
                            <button onClick={() => riskSkoru(item.ticker)} className="text-xs text-blue-400 hover:text-blue-300 underline">
                              AI Risk Skoru Al
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Link href={`/hisse/${item.ticker}`} className="text-xs text-slate-400 hover:text-white transition-colors">
                            Analiz →
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
