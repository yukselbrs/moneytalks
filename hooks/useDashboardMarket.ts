"use client";

import { useEffect, useRef, useState } from "react";

type PiyasaKey = "xu100" | "xu030" | "usd" | "eur";
type PiyasaYon = "up" | "down";

type PiyasaItem = {
  value: string;
  change: string;
};

type TopMovers = {
  yukselenler: { ticker: string; fiyat: string; degisim: number }[];
  dusenler: { ticker: string; fiyat: string; degisim: number }[];
  hacimliler: { ticker: string; fiyat: string; degisim: number }[];
};

const EMPTY_PIYASA: Record<PiyasaKey, PiyasaItem> = {
  usd: { value: "-", change: "-" },
  eur: { value: "-", change: "-" },
  xu100: { value: "-", change: "-" },
  xu030: { value: "-", change: "-" },
};

function parsePiyasaDeger(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCachedPiyasa() {
  try {
    const cached = localStorage.getItem("pk_piyasa");
    return cached ? JSON.parse(cached) : EMPTY_PIYASA;
  } catch {
    return EMPTY_PIYASA;
  }
}

export function useDashboardMarket() {
  const [piyasa, setPiyasa] = useState<Record<PiyasaKey, PiyasaItem>>(getCachedPiyasa);
  const [piyasaFlash, setPiyasaFlash] = useState<Partial<Record<PiyasaKey, PiyasaYon>>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [topMovers, setTopMovers] = useState<TopMovers | null>(null);
  const piyasaRef = useRef(piyasa);
  const flashTimeoutRef = useRef<Record<PiyasaKey, ReturnType<typeof setTimeout> | null>>({ xu100: null, xu030: null, usd: null, eur: null });

  useEffect(() => {
    const flashTimeouts = flashTimeoutRef.current;

    const fetchPiyasaOzeti = async () => {
      try {
        const response = await fetch("/api/piyasa", { cache: "no-store" });
        const data = await response.json();

        (["xu100", "xu030", "usd", "eur"] as PiyasaKey[]).forEach((key) => {
          const onceki = parsePiyasaDeger(piyasaRef.current[key]?.value || "-");
          const yeni = parsePiyasaDeger(data[key]?.value || "-");
          if (onceki === null || yeni === null || onceki === yeni) return;

          if (flashTimeouts[key]) clearTimeout(flashTimeouts[key]!);
          setPiyasaFlash((prev) => ({ ...prev, [key]: yeni > onceki ? "up" : "down" }));
          flashTimeouts[key] = setTimeout(() => {
            setPiyasaFlash((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
            flashTimeouts[key] = null;
          }, 550);
        });

        piyasaRef.current = data;
        setPiyasa(data);
        try { localStorage.setItem("pk_piyasa", JSON.stringify(data)); } catch {}
      } catch {}
    };

    const fetchSparklines = () => {
      [
        { sym: "XU100.IS", key: "XU100" },
        { sym: "XU030.IS", key: "XU030" },
        { sym: "USDTRY=X", key: "USD/TRY" },
        { sym: "EURTRY=X", key: "EUR/TRY" },
      ].forEach(({ sym, key }) => {
        fetch(`/api/grafik?ticker=${sym}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.points) {
              setSparklines((prev) => ({ ...prev, [key]: data.points.map((p: { fiyat: number }) => p.fiyat) }));
            }
          })
          .catch(() => {});
      });
    };

    const fetchPiyasa = async () => {
      try {
        const [yukRes, dusRes, hacimRes] = await Promise.all([
          fetch("/api/hisseler?sort=yukselis&page=1"),
          fetch("/api/hisseler?sort=dusus&page=1"),
          fetch("/api/hisseler?sort=hacim&page=1"),
        ]);
        const yukJson = await yukRes.json();
        const dusJson = await dusRes.json();
        const hacimJson = await hacimRes.json();
        const mapH = (h: { ticker: string; fiyat: string | number; degisim: string | number }) => ({
          ticker: h.ticker,
          fiyat: typeof h.fiyat === "number" ? h.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : String(h.fiyat),
          degisim: parseFloat(String(h.degisim)),
        });

        setTopMovers({
          yukselenler: (yukJson.items || []).slice(0, 5).map(mapH),
          dusenler: (dusJson.items || []).slice(0, 5).map(mapH),
          hacimliler: (hacimJson.items || []).slice(0, 5).map(mapH),
        });
      } catch (error) {
        console.error("fetchPiyasa err:", error);
      }
    };

    fetchPiyasaOzeti();
    fetchPiyasa();
    fetchSparklines();

    const piyasaOzetiInterval = setInterval(fetchPiyasaOzeti, 3000);
    const piyasaInterval = setInterval(fetchPiyasa, 300000);
    const sparklineInterval = setInterval(fetchSparklines, 60000);

    return () => {
      clearInterval(piyasaOzetiInterval);
      clearInterval(piyasaInterval);
      clearInterval(sparklineInterval);
      (["xu100", "xu030", "usd", "eur"] as PiyasaKey[]).forEach((key) => {
        if (flashTimeouts[key]) clearTimeout(flashTimeouts[key]!);
      });
    };
  }, []);

  return { piyasa, piyasaFlash, sparklines, topMovers };
}
