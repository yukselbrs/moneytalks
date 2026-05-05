"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/components/lib/supabase";

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
  const watchlistRef = useRef<WatchlistItem[]>([]);

  const fetchFiyatlar = useCallback((extraList?: string[]) => {
    const wl = extraList || watchlistRef.current.map((w) => w.ticker);
    const extra = wl.join(",");
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
  }, [fetchFiyatlar]);

  useEffect(() => {
    const interval = setInterval(() => fetchFiyatlar(), 5000);
    return () => clearInterval(interval);
  }, [fetchFiyatlar]);

  useEffect(() => {
    const loadRecent = () => {
      const stored = localStorage.getItem("pk_recent");
      if (stored) setRecent(JSON.parse(stored));
    };

    loadRecent();
    window.addEventListener("focus", loadRecent);
    return () => window.removeEventListener("focus", loadRecent);
  }, []);

  const addToWatchlist = useCallback(async (ticker: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (watchlistRef.current.some((w) => w.ticker === ticker)) return;

    await supabase.from("watchlist").insert({ user_id: session.user.id, ticker });
    setWatchlist((prev) => {
      const next = [{ ticker }, ...prev];
      watchlistRef.current = next;
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback(async (ticker: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("ticker", ticker);
    setWatchlist((prev) => {
      const next = prev.filter((w) => w.ticker !== ticker);
      watchlistRef.current = next;
      return next;
    });
  }, []);

  return {
    watchlist,
    recent,
    fiyatlar,
    setRecent,
    loadWatchlist,
    addToWatchlist,
    removeFromWatchlist,
  };
}
