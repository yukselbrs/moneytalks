"use client";

import { useEffect, useState } from "react";
import type { PortfoyItem } from "@/hooks/usePortfolioData";
import { portfolioHistory } from "@/lib/portfolio-math";

export type GrafikAralik = "1d" | "1mo" | "3mo" | "1y";
export type GrafikPoint = { tarih: string; degisim: number };

type SourcePoint = { timestamp?: number; tarih_iso?: string; tarih: string; fiyat: number };

export function usePortfolioGrafik(portfoy: PortfoyItem[]) {
  const [grafik, setGrafik] = useState<GrafikPoint[]>([]);
  const [grafikAralik, setGrafikAralik] = useState<GrafikAralik>("1d");
  const [grafikYukleniyor, setGrafikYukleniyor] = useState(false);
  const [grafikHata, setGrafikHata] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      setGrafikYukleniyor(true);
      setGrafikHata(null);
      setGrafik([]);
      try {
        if (!portfoy.length) return;
        if (grafikAralik === "1d" && portfoy.some(p => p.tur === "fon")) {
          setGrafikHata("Fon fiyatları günlük açıklanır. Bu portföyü 1A, 3A veya 1Y döneminde inceleyin.");
          return;
        }
        const positions = await Promise.all(portfoy.map(async p => {
          const instrument = p.tur === "doviz" || p.tur === "maden";
          const path = p.tur === "fon" ? `/api/fon/${encodeURIComponent(p.ticker)}?range=${grafikAralik}`
            : instrument ? `/api/doviz-maden/${encodeURIComponent(p.ticker)}?range=${grafikAralik}`
            : `/api/grafik?ticker=${encodeURIComponent(p.ticker)}&range=${grafikAralik}`;
          const res = await fetch(path, { signal: controller.signal });
          if (!res.ok) throw new Error("Grafik kaynağına erişilemiyor");
          const json = await res.json();
          const rows: SourcePoint[] = p.tur === "fon" ? json.history : instrument ? json.grafik : json.points;
          return { adet: p.adet, points: (rows ?? []).filter(row => row.tarih !== "Önceki Kapanış").map(row => {
            const raw = row.timestamp ?? Date.parse(row.tarih_iso ?? "");
            // Günlük serileri, piyasa açılış saatlerinden bağımsız aynı takvim gününde birleştir.
            const timestamp = grafikAralik === "1d" ? raw : Math.floor(raw / 86400000) * 86400000;
            return { timestamp, fiyat: row.fiyat };
          }) };
        }));
        if (!active) return;
        const points = portfolioHistory(positions);
        if (points.length < 2) setGrafikHata("Tüm pozisyonlar için ortak tarihli yeterli veri bulunamadı. Başka bir dönem seçin.");
        setGrafik(points.map(p => ({
          tarih: new Date(p.timestamp).toLocaleString("tr-TR", grafikAralik === "1d"
            ? { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }
            : { day: "2-digit", month: "short", year: "2-digit", timeZone: "Europe/Istanbul" }),
          degisim: p.degisim,
        })));
      } catch {
        if (active) setGrafikHata("Grafik verileri alınamadı. Lütfen biraz sonra tekrar deneyin.");
      } finally {
        if (active) setGrafikYukleniyor(false);
      }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [portfoy, grafikAralik]);

  return { grafik, grafikAralik, grafikYukleniyor, grafikHata, setGrafikAralik };
}
