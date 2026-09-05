"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";
import { portfolioQuotes } from "@/lib/portfolio-quotes";
import { weightedRisk } from "@/lib/portfolio-math";

export interface PortfoyItem {
  id: string;
  ticker: string;
  adet: number;
  maliyet: number;
  tur?: "hisse" | "fon" | "maden" | "doviz";
}

export function enstrumanPozisyonMu(item: Pick<PortfoyItem, "tur">): boolean {
  return item.tur === "doviz" || item.tur === "maden";
}
export function fonPozisyonMu(item: Pick<PortfoyItem, "tur">): boolean {
  return item.tur === "fon";
}
// Risk skoru/senaryo/karne yalniz hisseye ozgu — fon+doviz+maden bunlarin disinda.
export function hisseHarici(item: Pick<PortfoyItem, "tur">): boolean {
  return enstrumanPozisyonMu(item) || fonPozisyonMu(item);
}

export interface FiyatMap {
  [ticker: string]: { fiyat: number; degisim: number };
}

export type PortfoyRiskSkor = { skor: number; seviye: string; yukleniyor: boolean } | null;

export function usePortfolioData() {
  const router = useRouter();
  const [portfoy, setPortfoy] = useState<PortfoyItem[]>([]);
  const [fiyatlar, setFiyatlar] = useState<FiyatMap>({});
  const [yükleniyor, setYükleniyor] = useState(true);
  const [sonFiyatGuncelleme, setSonFiyatGuncelleme] = useState<Date | null>(null);
  const [fiyatlarYenileniyor, setFiyatlarYenileniyor] = useState(false);
  const [portfoyRiskSkor, setPortfoyRiskSkor] = useState<PortfoyRiskSkor>(null);
  const [flashTickers, setFlashTickers] = useState<Record<string, "up" | "down">>({});
  const prevFiyatlarRef = useRef<FiyatMap>({});

  const fiyatlariYenile = useCallback(async (items: PortfoyItem[], sessiz = false): Promise<FiyatMap> => {
    if (!items.length) return {};
    if (!sessiz) setFiyatlarYenileniyor(true);
    try {
      const map = await portfolioQuotes(items);
      setFiyatlar(map);
      setSonFiyatGuncelleme(new Date());
      return map;
    } catch (e) {
      console.error("Portfoy fiyat yenileme HATA:", e);
      return {};
    } finally {
      if (!sessiz) setFiyatlarYenileniyor(false);
    }
  }, []);

  const portfoyuYukle = useCallback(async () => {
    setYükleniyor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("portfoy")
        .select("id, ticker, adet, maliyet, tur")
        .order("created_at", { ascending: true });
      if (error) { console.error("Portfoy yuklenemedi", error); return; }
      if (!data || data.length === 0) {
        setPortfoy([]);
        setFiyatlar({});
        setPortfoyRiskSkor(null);
        return;
      }
      setPortfoy(data);
      try {
        const map = await fiyatlariYenile(data, true);
        setPortfoyRiskSkor({ skor: 0, seviye: "", yukleniyor: true });
        // Portfoy risk skoru hisse risk motorundan gelir; doviz/maden pozisyonlari hesaba KATILMAZ.
        const riskSonuclari = await Promise.all(
          data.filter((p: PortfoyItem) => !hisseHarici(p)).map(async (p: { ticker: string; adet: number; maliyet: number }) => {
            try {
              const r = await fetch(`/api/risk?ticker=${p.ticker.trim()}`);
              if (!r.ok) throw new Error("Risk verisi alınamadı");
              const rj = await r.json();
              const fiyat = map[p.ticker.trim()]?.fiyat ?? 0;
              const deger = p.adet * fiyat;
              return { skor: typeof rj.skor === "number" ? rj.skor : null, deger };
            } catch { return { skor: null, deger: p.adet * p.maliyet }; }
          })
        );
        if (!riskSonuclari.length) { setPortfoyRiskSkor(null); return; }
        const risk = weightedRisk(riskSonuclari);
        setPortfoyRiskSkor(risk ? { ...risk, yukleniyor: false } : null);
      } catch (e) { console.error("Fiyat fetch HATA:", e); }
    } finally { setYükleniyor(false); }
  }, [fiyatlariYenile, router]);

  useEffect(() => { portfoyuYukle(); }, [portfoyuYukle]);

  useEffect(() => {
    if (portfoy.length === 0) return;
    const id = window.setInterval(() => {
      void fiyatlariYenile(portfoy, true);
    }, 15000);
    return () => window.clearInterval(id);
  }, [fiyatlariYenile, portfoy]);

  useEffect(() => {
    const prev = prevFiyatlarRef.current;
    const changed: Record<string, "up" | "down"> = {};
    Object.entries(fiyatlar).forEach(([ticker, { fiyat }]) => {
      const prevFiyat = prev[ticker]?.fiyat;
      if (prevFiyat !== undefined && prevFiyat !== fiyat) {
        changed[ticker] = fiyat > prevFiyat ? "up" : "down";
      }
    });
    prevFiyatlarRef.current = fiyatlar;
    if (Object.keys(changed).length === 0) return;
    setFlashTickers(changed);
    const t = setTimeout(() => setFlashTickers({}), 700);
    return () => clearTimeout(t);
  }, [fiyatlar]);

  return {
    portfoy,
    fiyatlar,
    yükleniyor,
    sonFiyatGuncelleme,
    fiyatlarYenileniyor,
    portfoyRiskSkor,
    flashTickers,
    fiyatlariYenile,
    portfoyuYukle,
  };
}
