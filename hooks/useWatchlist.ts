"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/components/lib/supabase";
import { LS } from "@/lib/storage-keys";

type WatchlistItem = {
  ticker: string;
};

type RecentAnalysis = {
  ticker: string;
  time: string;
};

type Fiyat = {
  fiyat: string;
  degisim: string;
  yukselis: boolean;
} | null;

const PRICE_POLL_INTERVAL_MS = 15000;

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [recent, setRecent] = useState<RecentAnalysis[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, Fiyat>>({});
  const [pricePollingActive, setPricePollingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const watchlistRef = useRef<WatchlistItem[]>([]);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 4000);
  }, []);

  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  }, []);

  const fetchFiyatlar = useCallback((extraList?: string[]) => {
    const wl = extraList ?? watchlistRef.current.map((w) => w.ticker);
    let recentTickers: string[] = [];
    try {
      const stored = localStorage.getItem(LS.RECENT);
      if (stored) recentTickers = (JSON.parse(stored) as { ticker: string }[]).map((r) => r.ticker);
    } catch { /* ignore */ }
    const allTickers = [...new Set([...wl, ...recentTickers])];
    const extra = allTickers.join(",");
    const url = extra ? `/api/fiyatlar?extra=${extra}` : "/api/fiyatlar";
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`fiyatlar ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setFiyatlar(data);
        setPriceError(null);
      })
      .catch(() => setPriceError("Fiyat verileri yenilenemedi."));
  }, []);

  const loadWatchlist = useCallback(async (userId: string) => {
    const { data, error: dbError } = await supabase
      .from("watchlist")
      .select("ticker")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });

    if (dbError) {
      flashError("İzleme listesi yüklenemedi.");
      return;
    }
    if (!data) return;
    setWatchlist(data);
    watchlistRef.current = data;
    fetchFiyatlar(data.map((w: WatchlistItem) => w.ticker));
    setPricePollingActive(true);
  }, [fetchFiyatlar, flashError]);

  useEffect(() => {
    if (!pricePollingActive) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchFiyatlar();
    }, PRICE_POLL_INTERVAL_MS);
    const refreshWhenVisible = () => {
      if (document.hidden) return;
      fetchFiyatlar();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [fetchFiyatlar, pricePollingActive]);

  useEffect(() => {
    const loadRecent = () => {
      const stored = localStorage.getItem(LS.RECENT);
      if (stored) setRecent(JSON.parse(stored));
    };

    loadRecent();
    window.addEventListener("focus", loadRecent);
    return () => window.removeEventListener("focus", loadRecent);
  }, []);

  const addToWatchlist = useCallback(async (ticker: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      flashError("Eklemek için giriş yapmalısın.");
      return;
    }
    if (watchlistRef.current.some((w) => w.ticker === ticker)) return;

    setWatchlist((prev) => {
      const next = [{ ticker }, ...prev];
      watchlistRef.current = next;
      return next;
    });

    const { error: dbError } = await supabase.from("watchlist").insert({ user_id: session.user.id, ticker });
    if (dbError) {
      setWatchlist((prev) => {
        const next = prev.filter((w) => w.ticker !== ticker);
        watchlistRef.current = next;
        return next;
      });
      flashError(`${ticker} izleme listesine eklenemedi.`);
    }
  }, [flashError]);

  const removeFromWatchlist = useCallback(async (ticker: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      flashError("Çıkarmak için giriş yapmalısın.");
      return;
    }

    const snapshot = watchlistRef.current;
    setWatchlist((prev) => {
      const next = prev.filter((w) => w.ticker !== ticker);
      watchlistRef.current = next;
      return next;
    });

    const { error: dbError } = await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("ticker", ticker);
    if (dbError) {
      setWatchlist(snapshot);
      watchlistRef.current = snapshot;
      flashError(`${ticker} izleme listesinden çıkarılamadı.`);
    }
  }, [flashError]);

  return {
    watchlist,
    recent,
    fiyatlar,
    error,
    priceError,
    clearError: () => setError(null),
    clearPriceError: () => setPriceError(null),
    setRecent,
    loadWatchlist,
    addToWatchlist,
    removeFromWatchlist,
  };
}
