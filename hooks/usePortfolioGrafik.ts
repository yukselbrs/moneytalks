"use client";

import { useCallback, useEffect, useState } from "react";
import type { PortfoyItem } from "@/hooks/usePortfolioData";

export type GrafikAralik = "1d" | "1mo" | "3mo" | "1y";
export type GrafikPoint = { tarih: string; degisim: number };

function piyasaAcikMi() {
  const now = new Date();
  const istanbul = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const gun = istanbul.getUTCDay();
  const dk = istanbul.getUTCHours() * 60 + istanbul.getUTCMinutes();
  return gun >= 1 && gun <= 5 && dk >= 600 && dk <= 1090;
}

export function usePortfolioGrafik(portfoy: PortfoyItem[]) {
  const [grafik, setGrafik] = useState<GrafikPoint[]>([]);
  const [grafikAralik, setGrafikAralik] = useState<GrafikAralik>("1d");
  const [grafikYukleniyor, setGrafikYukleniyor] = useState(false);

  const grafikCek = useCallback(async (aralik: GrafikAralik, items: PortfoyItem[], sessiz = false) => {
    if (items.length === 0) return;
    if (!sessiz) setGrafikYukleniyor(true);
    try {
      const sonuclar = await Promise.all(
        items.map(async (p) => {
          const res = await fetch(`/api/grafik?ticker=${p.ticker}.IS&range=${aralik}`);
          const json = await res.json();
          const fiyatMap: Record<string, number> = {};
          (json.points || []).forEach((pt: { tarih: string; fiyat: number }) => {
            if (pt.fiyat) fiyatMap[pt.tarih] = pt.fiyat;
          });
          return { adet: p.adet, fiyatMap, tarihler: Object.keys(fiyatMap) };
        })
      );
      const tarihler = sonuclar[0]?.tarihler || [];
      const degerler = tarihler.map((tarih) => {
        let deger = 0;
        let tamam = true;
        for (const s of sonuclar) {
          if (!s.fiyatMap[tarih]) { tamam = false; break; }
          deger += s.adet * s.fiyatMap[tarih];
        }
        return tamam ? { tarih, deger } : null;
      }).filter((n): n is { tarih: string; deger: number } => n !== null);

      if (degerler.length < 2) { setGrafik([]); return; }
      const ilk = degerler[0].deger;
      setGrafik(degerler.map((n) => ({ tarih: n.tarih, degisim: parseFloat(((n.deger - ilk) / ilk * 100).toFixed(2)) })));
    } catch (e) {
      console.error("Portföy grafik hatası:", e);
    } finally {
      setGrafikYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    if (portfoy.length > 0) void grafikCek(grafikAralik, portfoy);
  }, [portfoy, grafikAralik, grafikCek]);

  useEffect(() => {
    if (grafikAralik !== "1d" || portfoy.length === 0) return;
    const id = window.setInterval(() => {
      if (piyasaAcikMi()) void grafikCek("1d", portfoy, true);
    }, 15000);
    return () => window.clearInterval(id);
  }, [grafikAralik, portfoy, grafikCek]);

  return {
    grafik,
    grafikAralik,
    grafikYukleniyor,
    setGrafikAralik,
  };
}
