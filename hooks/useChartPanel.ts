"use client";

import React, { useCallback, useRef, useState } from "react";

export function useChartPanel() {
  const [buyukGrafik, setBuyukGrafik] = useState<{ tarih: string; fiyat: number }[]>([]);
  const [grafikRange, setGrafikRange] = useState("1d");
  const [grafikRangeDegisim, setGrafikRangeDegisim] = useState<Record<string, number>>({});
  const [grafikYukleniyor, setGrafikYukleniyor] = useState(false);
  const [grafikTicker, setGrafikTicker] = useState("XU100.IS");
  const [grafikTickerLabel, setGrafikTickerLabel] = useState("XU100");
  const [grafikArama, setGrafikArama] = useState("");
  const [grafikDropdown, setGrafikDropdown] = useState(false);
  const [grafikWidth, setGrafikWidth] = useState(0);

  const grafikRef = useRef<HTMLDivElement>(null);
  const grafikObserverRef = useRef<ResizeObserver | null>(null);
  const initialGrafikLoadedRef = useRef(false);

  const setGrafikContainerRef = useCallback((node: HTMLDivElement | null) => {
    grafikObserverRef.current?.disconnect();
    grafikRef.current = node;
    grafikObserverRef.current = null;
    if (!node) {
      setGrafikWidth(0);
      return;
    }
    setGrafikWidth(Math.floor(node.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => {
      setGrafikWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(node);
    grafikObserverRef.current = observer;
  }, []);

  const fetchBuyukGrafik = useCallback(async (range: string, ticker?: string) => {
    setGrafikYukleniyor(true);
    try {
      const t = ticker || grafikTicker;
      const r = await fetch(`/api/grafik?ticker=${t}&range=${range}`);
      const d = await r.json();
      if (d.points) {
        setBuyukGrafik(d.points);
        const pts = d.points.map((p: { fiyat: number }) => p.fiyat);
        if (pts.length > 1) {
          const pct = ((pts[pts.length - 1] - pts[0]) / pts[0]) * 100;
          setGrafikRangeDegisim(prev => ({ ...prev, [range]: pct }));
        }
      }
    } catch {
      setBuyukGrafik([]);
    } finally {
      setGrafikYukleniyor(false);
    }
  }, [grafikTicker]);

  return {
    buyukGrafik,
    grafikRange,
    grafikRangeDegisim,
    grafikYukleniyor,
    grafikTicker,
    grafikTickerLabel,
    grafikArama,
    grafikDropdown,
    grafikWidth,
    initialGrafikLoadedRef,
    setGrafikContainerRef,
    fetchBuyukGrafik,
    setGrafikRange,
    setGrafikTicker,
    setGrafikTickerLabel,
    setGrafikArama,
    setGrafikDropdown,
  };
}
