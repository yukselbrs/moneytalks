"use client";

import { useCallback, useEffect, useState } from "react";
import { portfolioQuotes } from "@/lib/portfolio-quotes";
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
  tur?: string;
  adet: number;
  maliyet: number;
};

const PORTFOLIO_SUMMARY_POLL_MS = 30000;

export function usePortfolioSummary() {
  const [portfoyOzet, setPortfoyOzet] = useState<PortfolioSummary | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolioSummary = useCallback(async () => {
    try {
      const { data: portfoyData, error: dbError } = await supabase
        .from("portfoy")
        .select("ticker, adet, maliyet, tur");

      if (dbError) throw dbError;

      if (!portfoyData || portfoyData.length === 0) {
        setPortfoyOzet(null);
        setPollingActive(false);
        setError(null);
        return;
      }

      const fiyatJson = await portfolioQuotes(portfoyData);
      if (portfoyData.some((p: PortfolioRow) => !fiyatJson[p.ticker.trim()])) {
        setPortfoyOzet(null);
        setPollingActive(true);
        setError("Bazı pozisyonların fiyatı alınamadı. Toplam değer hesaplanamıyor.");
        return;
      }
      let toplamMaliyet = 0;
      let toplamGuncel = 0;
      let gunlukPL = 0;
      let oncekiToplam = 0;

      portfoyData.forEach((p: PortfolioRow) => {
        const maliyet = p.adet * p.maliyet;
        toplamMaliyet += maliyet;
        const fiyatStr = fiyatJson[p.ticker.trim()]?.fiyat;
        const degisimStr = fiyatJson[p.ticker.trim()]?.degisim;
        const fiyat = fiyatStr;
        const degisim = degisimStr;
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
          const fiyat = fiyatStr;
          return { ticker: p.ticker.trim(), deger: p.adet * fiyat, yuzde: 0, renk: renkler[idx % renkler.length] };
        })
        .sort((a: { deger: number }, b: { deger: number }) => b.deger - a.deger)
        .map((h: { ticker: string; deger: number; yuzde: number; renk: string }) => ({ ...h, yuzde: toplamGuncel > 0 ? (h.deger / toplamGuncel) * 100 : 0 }));

      setPortfoyOzet({ toplamMaliyet, toplamGuncel, toplamPL, toplamPLYuzde, gunlukPL, gunlukPLYuzde, hisseSayisi: portfoyData.length, hisseDagilim });
      setPollingActive(true);
      setError(null);
    } catch (error) {
      console.error("Portfoy ozet hatasi:", error);
      setPortfoyOzet(null);
      setError("Portföy özeti yenilenemedi.");
    }
  }, []);

  useEffect(() => {
    if (!pollingActive) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadPortfolioSummary();
    }, PORTFOLIO_SUMMARY_POLL_MS);
    const refreshWhenVisible = () => {
      if (document.hidden) return;
      loadPortfolioSummary();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadPortfolioSummary, pollingActive]);

  return { portfoyOzet, error, clearError: () => setError(null), loadPortfolioSummary };
}
