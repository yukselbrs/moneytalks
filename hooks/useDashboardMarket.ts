"use client";

import { useEffect, useRef, useState } from "react";
import { LS } from "@/lib/storage-keys";

type PiyasaKey = "xu100" | "xu030" | "usd" | "eur" | "gram";
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

const BIST_DAILY_LIMIT = 10.01;
const PIYASA_SUMMARY_POLL_MS = 15000;
const PIYASA_SUMMARY_HIDDEN_POLL_MS = 60000;
const PIYASA_LIST_POLL_MS = 300000;
const SPARKLINE_POLL_MS = 120000;

const EMPTY_PIYASA: Record<PiyasaKey, PiyasaItem> = {
  usd: { value: "-", change: "-" },
  eur: { value: "-", change: "-" },
  xu100: { value: "-", change: "-" },
  xu030: { value: "-", change: "-" },
  gram: { value: "-", change: "-" },
};

function parsePiyasaDeger(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCachedPiyasa() {
  try {
    const cached = localStorage.getItem(LS.PIYASA);
    return cached ? JSON.parse(cached) : EMPTY_PIYASA;
  } catch {
    return EMPTY_PIYASA;
  }
}

export function useDashboardMarket(enabled = true) {
  const [piyasa, setPiyasa] = useState<Record<PiyasaKey, PiyasaItem>>(getCachedPiyasa);
  const [piyasaFlash, setPiyasaFlash] = useState<Partial<Record<PiyasaKey, PiyasaYon>>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [topMovers, setTopMovers] = useState<TopMovers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const piyasaRef = useRef(piyasa);
  const flashTimeoutRef = useRef<Record<PiyasaKey, ReturnType<typeof setTimeout> | null>>({ xu100: null, xu030: null, usd: null, eur: null, gram: null });

  useEffect(() => {
    if (!enabled) return;
    const flashTimeouts = flashTimeoutRef.current;
    let canceled = false;

    const fetchPiyasaOzeti = async () => {
      const response = await fetch("/api/piyasa", { cache: "no-store" });
      if (!response.ok) throw new Error(`piyasa ${response.status}`);
      const data = await response.json();
      if (canceled) return;

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
      setError(null);
      try { localStorage.setItem(LS.PIYASA, JSON.stringify(data)); } catch {}
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
        const [topRes, hacimRes] = await Promise.all([
          fetch("/api/top-movers", { cache: "no-store" }),
          fetch("/api/hisseler?sort=hacim&page=1"),
        ]);
        const topJson = await topRes.json();
        const hacimJson = await hacimRes.json();
        const mapH = (h: { ticker: string; fiyat: string | number; degisim: string | number }) => ({
          ticker: h.ticker,
          fiyat: typeof h.fiyat === "number" ? h.fiyat.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : String(h.fiyat),
          degisim: parseFloat(String(h.degisim)),
        });
        const validDailyMove = (h: { degisim: number }) => Number.isFinite(h.degisim) && Math.abs(h.degisim) <= BIST_DAILY_LIMIT;

        setTopMovers({
          yukselenler: (topJson.yukselenler || []).filter(validDailyMove),
          dusenler: (topJson.dusenler || []).filter(validDailyMove),
          hacimliler: (hacimJson.items || []).map(mapH).filter(validDailyMove).slice(0, 5),
        });
        setError(null);
      } catch (error) {
        console.error("fetchPiyasa err:", error);
        setError("Piyasa verileri yenilenemedi.");
      }
    };

    const BASE_DELAY = PIYASA_SUMMARY_POLL_MS;
    const MAX_DELAY = 120000;
    let failures = 0;
    let nextTick: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = (delay: number) => {
      if (canceled) return;
      const hiddenDelay = typeof document !== "undefined" && document.hidden
        ? Math.max(delay, PIYASA_SUMMARY_HIDDEN_POLL_MS)
        : delay;
      nextTick = setTimeout(runPiyasaOzeti, hiddenDelay);
    };

    const runPiyasaOzeti = async () => {
      try {
        await fetchPiyasaOzeti();
        failures = 0;
        scheduleNext(BASE_DELAY);
      } catch {
        failures += 1;
        setError("Piyasa özeti yenilenemedi.");
        const delay = Math.min(BASE_DELAY * 2 ** failures, MAX_DELAY);
        scheduleNext(delay);
      }
    };

    runPiyasaOzeti();
    fetchPiyasa();
    fetchSparklines();

    const piyasaInterval = setInterval(fetchPiyasa, PIYASA_LIST_POLL_MS);
    const sparklineInterval = setInterval(fetchSparklines, SPARKLINE_POLL_MS);
    const refreshWhenVisible = () => {
      if (document.hidden) return;
      void fetchPiyasaOzeti().catch(() => setError("Piyasa özeti yenilenemedi."));
      fetchPiyasa();
      fetchSparklines();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      canceled = true;
      if (nextTick) clearTimeout(nextTick);
      clearInterval(piyasaInterval);
      clearInterval(sparklineInterval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      (["xu100", "xu030", "usd", "eur"] as PiyasaKey[]).forEach((key) => {
        if (flashTimeouts[key]) clearTimeout(flashTimeouts[key]!);
      });
    };
  }, [enabled]);

  return { piyasa, piyasaFlash, sparklines, topMovers, error, clearError: () => setError(null) };
}
