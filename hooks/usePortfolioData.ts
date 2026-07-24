"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/components/lib/supabase";

export interface PortfoyItem {
  id: string;
  ticker: string;
  adet: number;
  maliyet: number;
  tur?: "hisse" | "fon" | "maden" | "doviz";
}

export function enstrumanPozisyonMu(item: Pick<PortfoyItem, "tur">): boolean {
  return item.tur === "doviz" || item.tur === "maden";
}
export function fonPozisyonMu(item: Pick<PortfoyItem, "tur">): boolean {
  return item.tur === "fon";
}
// Risk skoru/senaryo/karne yalniz hisseye ozgu — fon+doviz+maden bunlarin disinda.
export function hisseHarici(item: Pick<PortfoyItem, "tur">): boolean {
  return enstrumanPozisyonMu(item) || fonPozisyonMu(item);
}

export interface FiyatMap {
  [ticker: string]: { fiyat: number; degisim: number };
}

export type PortfoyRiskSkor = { skor: number; seviye: string; yukleniyor: boolean } | null;

function fiyatDegeriOku(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function usePortfolioData() {
  const router = useRouter();
  const [portfoy, setPortfoy] = useState<PortfoyItem[]>([]);
  const [fiyatlar, setFiyatlar] = useState<FiyatMap>({});
  const [yükleniyor, setYükleniyor] = useState(true);
  const [sonFiyatGuncelleme, setSonFiyatGuncelleme] = useState<Date | null>(null);
  const [fiyatlarYenileniyor, setFiyatlarYenileniyor] = useState(false);
  const [portfoyRiskSkor, setPortfoyRiskSkor] = useState<PortfoyRiskSkor>(null);
  const [flashTickers, setFlashTickers] = useState<Record<string, "up" | "down">>({});
  const prevFiyatlarRef = useRef<FiyatMap>({});

  const fiyatlariYenile = useCallback(async (items: PortfoyItem[], sessiz = false): Promise<FiyatMap> => {
    // 3 kaynak: hisse -> /api/fiyatlar, doviz/maden -> /api/doviz-maden, fon -> fon_snapshots.
    const hisseTickers = items.filter((p) => !hisseHarici(p)).map((p) => p.ticker.trim()).filter(Boolean).join(",");
    const fonKodlar = items.filter(fonPozisyonMu).map((p) => p.ticker.trim()).filter(Boolean);
    const enstrumanVar = items.some(enstrumanPozisyonMu);
    if (!hisseTickers && !enstrumanVar && !fonKodlar.length) return {};
    if (!sessiz) setFiyatlarYenileniyor(true);
    try {
      const map: FiyatMap = {};
      const [hisseJson, enstrumanJson, fonRes] = await Promise.all([
        hisseTickers ? fetch("/api/fiyatlar?extra=" + hisseTickers).then((r) => r.json()) : Promise.resolve({}),
        enstrumanVar ? fetch("/api/doviz-maden", { cache: "no-store" }).then((r) => r.json()) : Promise.resolve(null),
        fonKodlar.length ? supabase.from("fon_snapshots").select("kod, fiyat, gunluk_getiri").in("kod", fonKodlar) : Promise.resolve({ data: [] }),
      ]);
      Object.entries(hisseJson).forEach(([ticker, val]) => {
        if (!val) return;
        const v = val as { fiyat?: unknown; degisim?: unknown };
        const fiyat = fiyatDegeriOku(v.fiyat);
        const degisim = fiyatDegeriOku(v.degisim);
        if (fiyat === null) return;
        map[ticker] = { fiyat, degisim: degisim ?? 0 };
      });
      for (const item of enstrumanJson?.items || []) {
        if (typeof item.fiyat !== "number") continue;
        map[item.kod] = { fiyat: item.fiyat, degisim: typeof item.degisim_yuzde === "number" ? item.degisim_yuzde : 0 };
      }
      for (const f of ((fonRes as { data?: { kod: string; fiyat: number | null; gunluk_getiri: number | null }[] })?.data ?? [])) {
        if (typeof f.fiyat !== "number") continue;
        map[f.kod] = { fiyat: f.fiyat, degisim: typeof f.gunluk_getiri === "number" ? f.gunluk_getiri : 0 };
      }
      setFiyatlar((prev) => ({ ...prev, ...map }));
      setSonFiyatGuncelleme(new Date());
      return map;
    } catch (e) {
      console.error("Portfoy fiyat yenileme HATA:", e);
      return {};
    } finally {
      if (!sessiz) setFiyatlarYenileniyor(false);
    }
  }, []);

  const portfoyuYukle = useCallback(async () => {
    setYükleniyor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("portfoy")
        .select("id, ticker, adet, maliyet, tur")
        .order("created_at", { ascending: true });
      if (error) { console.error("Portfoy yuklenemedi", error); return; }
      if (!data || data.length === 0) {
        setPortfoy([]);
        setFiyatlar({});
        setPortfoyRiskSkor(null);
        return;
      }
      setPortfoy(data);
      try {
        const map = await fiyatlariYenile(data, true);
        setPortfoyRiskSkor({ skor: 0, seviye: "", yukleniyor: true });
        // Portfoy risk skoru hisse risk motorundan gelir; doviz/maden pozisyonlari hesaba KATILMAZ.
        const riskSonuclari = await Promise.all(
          data.filter((p: PortfoyItem) => !hisseHarici(p)).map(async (p: { ticker: string; adet: number; maliyet: number }) => {
            try {
              const r = await fetch(`/api/risk?ticker=${p.ticker.trim()}`);
              const rj = await r.json();
              const fiyat = map[p.ticker.trim()]?.fiyat || p.maliyet;
              const deger = p.adet * fiyat;
              return { skor: rj.skor || 0, deger };
            } catch { return { skor: 35, deger: p.adet * p.maliyet }; }
          })
        );
        if (!riskSonuclari.length) { setPortfoyRiskSkor(null); return; }
        const toplamDeger = riskSonuclari.reduce((a, b) => a + b.deger, 0);
        const agirlikliSkor = toplamDeger > 0
          ? riskSonuclari.reduce((a, b) => a + (b.skor * b.deger / toplamDeger), 0)
          : riskSonuclari.reduce((a, b) => a + b.skor, 0) / riskSonuclari.length;
        const seviye = agirlikliSkor >= 60 ? "Yüksek" : agirlikliSkor >= 35 ? "Orta" : "Düşük";
        setPortfoyRiskSkor({ skor: Math.round(agirlikliSkor), seviye, yukleniyor: false });
      } catch (e) { console.error("Fiyat fetch HATA:", e); }
    } finally { setYükleniyor(false); }
  }, [fiyatlariYenile, router]);

  useEffect(() => { portfoyuYukle(); }, [portfoyuYukle]);

  useEffect(() => {
    if (portfoy.length === 0) return;
    const id = window.setInterval(() => {
      void fiyatlariYenile(portfoy, true);
    }, 15000);
    return () => window.clearInterval(id);
  }, [fiyatlariYenile, portfoy]);

  useEffect(() => {
    const prev = prevFiyatlarRef.current;
    const changed: Record<string, "up" | "down"> = {};
    Object.entries(fiyatlar).forEach(([ticker, { fiyat }]) => {
      const prevFiyat = prev[ticker]?.fiyat;
      if (prevFiyat !== undefined && prevFiyat !== fiyat) {
        changed[ticker] = fiyat > prevFiyat ? "up" : "down";
      }
    });
    prevFiyatlarRef.current = fiyatlar;
    if (Object.keys(changed).length === 0) return;
    setFlashTickers(changed);
    const t = setTimeout(() => setFlashTickers({}), 700);
    return () => clearTimeout(t);
  }, [fiyatlar]);

  return {
    portfoy,
    fiyatlar,
    yükleniyor,
    sonFiyatGuncelleme,
    fiyatlarYenileniyor,
    portfoyRiskSkor,
    flashTickers,
    fiyatlariYenile,
    portfoyuYukle,
  };
}
