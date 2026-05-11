"use client";

import { useEffect, useState } from "react";

export function usePollingFetch<T>(
  url: string,
  intervalMs = 0,
): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as T;
        if (alive) setData(json);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    if (intervalMs > 0) {
      const id = window.setInterval(load, intervalMs);
      return () => { alive = false; window.clearInterval(id); };
    }
    return () => { alive = false; };
  }, [url, intervalMs]);

  return { data, loading };
}
