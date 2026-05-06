"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/components/lib/supabase";

type PortfolioSummary = {
  toplamMaliyet: number;
  toplamGuncel: number;
  toplamPL: number;
  toplamPLYuzde: number;
  gunlukPL: number;
  gunlukPLYuzde: number;
  hisseSayisi: number;
  hisseDagilim?: { ticker: string; deger: number; yuzde: number; renk: string }[];
};

type PortfolioRow = {
  ticker: string;
  adet: number;
  maliyet: number;
};

function piyasaSayisiOku(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace("%", "").trim();
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function usePortfolioSummary() {
  const [portfoyOzet, setPortfoyOzet] = useState<PortfolioSummary | null>(null);
  const [pollingActive, setPollingActive] = useState(false);

  const loadPortfolioSummary = useCallback(async () => {
    try {
      const { data: portfoyData } = await supabase
        .from("portfoy")
        .select("ticker, adet, maliyet");

      if (!portfoyData || portfoyData.length === 0) {
        setPortfoyOzet(null);
        setPollingActive(false);
        return;
      }

      const tickers = portfoyData.map((p: PortfolioRow) => p.ticker.trim()).join(",");
      const fiyatResponse = await fetch("/api/fiyatlar?extra=" + tickers);
      const fiyatJson = await fiyatResponse.json();
      let toplamMaliyet = 0;
      let toplamGuncel = 0;
      let gunlukPL = 0;
      let oncekiToplam = 0;

      portfoyData.forEach((p: PortfolioRow) => {
        const maliyet = p.adet * p.maliyet;
        toplamMaliyet += maliyet;
        const fiyatStr = fiyatJson[p.ticker.trim()]?.fiyat;
        const degisimStr = fiyatJson[p.ticker.trim()]?.degisim;
        const fiyat = piyasaSayisiOku(fiyatStr) ?? p.maliyet;
        const degisim = piyasaSayisiOku(degisimStr) ?? 0;
        const oncekiFiyat = degisim !== -100 ? fiyat / (1 + degisim / 100) : fiyat;
        toplamGuncel += p.adet * fiyat;
        oncekiToplam += p.adet * oncekiFiyat;
        gunlukPL += p.adet * (fiyat - oncekiFiyat);
      });

      const toplamPL = toplamGuncel - toplamMaliyet;
      const toplamPLYuzde = toplamMaliyet > 0 ? (toplamPL / toplamMaliyet) * 100 : 0;
      const gunlukPLYuzde = oncekiToplam > 0 ? (gunlukPL / oncekiToplam) * 100 : 0;
      const renkler = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#F97316"];
      const hisseDagilim = portfoyData
        .map((p: PortfolioRow, idx: number) => {
          const fiyatStr = fiyatJson[p.ticker.trim()]?.fiyat;
          const fiyat = piyasaSayisiOku(fiyatStr) ?? p.maliyet;
          return { ticker: p.ticker.trim(), deger: p.adet * fiyat, yuzde: 0, renk: renkler[idx % renkler.length] };
        })
        .sort((a: { deger: number }, b: { deger: number }) => b.deger - a.deger)
        .map((h: { ticker: string; deger: number; yuzde: number; renk: string }) => ({ ...h, yuzde: toplamGuncel > 0 ? (h.deger / toplamGuncel) * 100 : 0 }));

      setPortfoyOzet({ toplamMaliyet, toplamGuncel, toplamPL, toplamPLYuzde, gunlukPL, gunlukPLYuzde, hisseSayisi: portfoyData.length, hisseDagilim });
      setPollingActive(true);
    } catch (error) {
      console.error("Portfoy ozet hatasi:", error);
    }
  }, []);

  useEffect(() => {
    if (!pollingActive) return;
    const interval = setInterval(() => {
      loadPortfolioSummary();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadPortfolioSummary, pollingActive]);

  return { portfoyOzet, loadPortfolioSummary };
}
