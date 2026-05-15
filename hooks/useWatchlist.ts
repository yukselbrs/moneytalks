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

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [recent, setRecent] = useState<RecentAnalysis[]>([]);
  const [fiyatlar, setFiyatlar] = useState<Record<string, Fiyat>>({});
  const [pricePollingActive, setPricePollingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      .then((r) => r.json())
      .then((data) => setFiyatlar(data))
      .catch(() => {});
  }, []);

  const loadWatchlist = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("watchlist")
      .select("ticker")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });

    if (!data) return;
    setWatchlist(data);
    watchlistRef.current = data;
    fetchFiyatlar(data.map((w: WatchlistItem) => w.ticker));
    setPricePollingActive(true);
  }, [fetchFiyatlar]);

  useEffect(() => {
    if (!pricePollingActive) return;
    const interval = setInterval(() => fetchFiyatlar(), 5000);
    return () => clearInterval(interval);
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
    clearError: () => setError(null),
    setRecent,
    loadWatchlist,
    addToWatchlist,
    removeFromWatchlist,
  };
}
