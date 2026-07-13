const TEFAS_ROOT = "https://www.tefas.gov.tr";
const PAGE_SIZE = 30000;

type TefasResponse<T> = {
  errorCode?: string | null;
  errorMessage?: string | null;
  resultList?: T[];
  toplamSayfa?: number;
  toplamSayi?: number;
};

export type TefasFundGeneral = {
  fonKodu: string;
  fonUnvan: string;
  tarih: string;
  fiyat: number | null;
  tedPaySayisi: number | null;
  kisiSayisi: number | null;
  portfoyBuyukluk: number | null;
};

export type TefasFundReturn = {
  fonKodu: string;
  fonUnvan: string;
  fonTurAciklama: string | null;
  tefasDurum: boolean | null;
  getiri1a: number | null;
  getiri3a: number | null;
  getiri6a: number | null;
  getiri1y: number | null;
  getiriyb: number | null;
  getiri3y: number | null;
  getiri5y: number | null;
  getiriOrani: number | null;
  riskDegeri: string | number | null;
};

export type TefasFundManagement = {
  fonKodu: string;
  altbaslik1: string | null;
  uygulananYu1Y: string | number | null;
  altbaslik2: string | null;
  fonIcTuzukYu1G: string | number | null;
  fonTopGiderKesoran: string | number | null;
};

export type TefasFundSize = {
  fonKodu: string;
  fonUnvan: string;
  fonTurAciklama: string | null;
  tefasDurum: boolean | null;
  sonPortfoyDegeri: number | null;
  sonPayAdedi: number | null;
  netGetiriOrani: number | null;
};

export type FonSnapshotRow = {
  kod: string;
  unvan: string;
  kategori: string | null;
  fiyat: number | null;
  gunluk_getiri: number | null;
  getiri_1h: number | null;
  getiri_1a: number | null;
  getiri_3a: number | null;
  getiri_6a: number | null;
  getiri_1y: number | null;
  getiri_yb: number | null;
  getiri_3y: number | null;
  getiri_5y: number | null;
  risk_degeri: number | null;
  portfoy_buyukluk: number | null;
  kisi_sayisi: number | null;
  tedavuldeki_pay: number | null;
  yonetim_ucreti_yillik: number | null;
  toplam_gider_orani: number | null;
  tefas_durum: boolean | null;
  veri_tarihi: string | null;
};

export type FonHistoryPoint = {
  tarih: string;
  tarih_iso: string;
  fiyat: number;
  portfoy_buyukluk: number | null;
  kisi_sayisi: number | null;
  tedavuldeki_pay: number | null;
};

type HistoricalReturnFallback = {
  gunluk_getiri: number | null;
  getiri_1h: number | null;
  getiri_1a: number | null;
  getiri_3a: number | null;
  getiri_6a: number | null;
  getiri_yb: number | null;
  getiri_1y: number | null;
};

function tefasHeaders() {
  return {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Content-Type": "application/json",
    "Origin": TEFAS_ROOT,
    "Referer": `${TEFAS_ROOT}/tr/fon-verileri`,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
}

async function tefasPost<T>(endpoint: string, payload: Record<string, unknown>): Promise<TefasResponse<T>> {
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${TEFAS_ROOT}${endpoint}`, {
      method: "POST",
      headers: tefasHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (res.ok || (res.status !== 429 && res.status !== 503)) break;
    await new Promise((resolve) => setTimeout(resolve, 650 * (attempt + 1)));
  }
  if (!res) throw new Error(`TEFAS ${endpoint} HTTP error`);
  if (!res.ok) throw new Error(`TEFAS ${endpoint} HTTP ${res.status}`);
  const body = await res.json() as TefasResponse<T>;
  if (body.errorCode || body.errorMessage) {
    throw new Error(body.errorMessage || body.errorCode || "TEFAS API error");
  }
  return body;
}

function yyyymmdd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function previousBusinessDay(date: Date) {
  let cursor = addDays(date, -1);
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor = addDays(cursor, -1);
  }
  return cursor;
}

function latestBusinessDay(date = new Date()) {
  let cursor = new Date(date);
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor = addDays(cursor, -1);
  }
  return cursor;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentChange(latest: number | null, previous: number | null) {
  if (latest === null || previous === null || previous === 0) return null;
  return ((latest - previous) / previous) * 100;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function managementFee(fee: TefasFundManagement | undefined) {
  if (!fee) return null;
  const applied = fee.altbaslik1 ? toNumber(fee.uygulananYu1Y) : null;
  return applied ?? toNumber(fee.fonIcTuzukYu1G);
}

function returnsPayload() {
  return {
    dil: "TR",
    fonTipi: "YAT",
    kurucuKodu: null,
    sfonTurKod: null,
    fonTurAciklama: null,
    islem: 1,
    fonTurKod: null,
    fonGrubu: null,
    donemGetiri1a: "1",
    donemGetiri3a: "1",
    donemGetiri6a: "1",
    donemGetiri1y: "1",
    donemGetiriyb: "1",
    donemGetiri3y: "1",
    donemGetiri5y: "1",
    basTarih: null,
    bitTarih: null,
    calismaTipi: 2,
    getiriOrani: "1",
  };
}

export async function fetchTefasReturns() {
  const body = await tefasPost<TefasFundReturn>("/api/funds/fonGetiriBazliBilgiGetir", returnsPayload());
  return body.resultList ?? [];
}

export async function fetchTefasDailyReturns() {
  const end = latestBusinessDay();
  const start = previousBusinessDay(end);
  const payload = {
    ...returnsPayload(),
    donemGetiri1a: "0",
    donemGetiri3a: "0",
    donemGetiri6a: "0",
    donemGetiri1y: "0",
    donemGetiriyb: "0",
    donemGetiri3y: "0",
    donemGetiri5y: "0",
    basTarih: yyyymmdd(start),
    bitTarih: yyyymmdd(end),
    calismaTipi: 1,
  };
  const body = await tefasPost<TefasFundReturn>("/api/funds/fonGetiriBazliBilgiGetir", payload);
  return body.resultList ?? [];
}

export async function fetchTefasManagementFees() {
  const body = await tefasPost<TefasFundManagement>("/api/funds/fonYonetimBazliBilgiGetir", returnsPayload());
  return body.resultList ?? [];
}

export async function fetchTefasSizeRows() {
  const date = latestBusinessDay();
  const body = await tefasPost<TefasFundSize>("/api/funds/fonBuyuklukBazliBilgiGetir", {
    fonTipi: "YAT",
    fonKodu: null,
    aramaMetni: null,
    fonTurKod: null,
    fonGrubu: null,
    sfonTurKod: null,
    basTarih: yyyymmdd(date),
    bitTarih: yyyymmdd(date),
    basSira: 1,
    bitSira: 3000,
    fonTurAciklama: null,
    dil: "TR",
    kurucuKod: null,
  });
  return body.resultList ?? [];
}

async function fetchGeneralPage(startDate: Date, endDate: Date, page: number) {
  const start = 1 + (page - 1) * PAGE_SIZE;
  const end = page * PAGE_SIZE;
  return tefasPost<TefasFundGeneral>("/api/funds/fonGnlBlgSiraliGetir", {
    fonTipi: "YAT",
    fonKodu: null,
    aramaMetni: null,
    fonTurKod: null,
    fonGrubu: null,
    sfonTurKod: null,
    basTarih: yyyymmdd(startDate),
    bitTarih: yyyymmdd(endDate),
    basSira: start,
    bitSira: end,
    fonTurAciklama: null,
    dil: "TR",
    kurucuKod: null,
  });
}

async function fetchFundGeneralRows(kod: string, startDate: Date, endDate: Date) {
  const body = await tefasPost<TefasFundGeneral>("/api/funds/fonGnlBlgSiraliGetir", {
    fonTipi: "YAT",
    fonKodu: null,
    aramaMetni: kod,
    fonTurKod: null,
    fonGrubu: null,
    sfonTurKod: null,
    basTarih: yyyymmdd(startDate),
    bitTarih: yyyymmdd(endDate),
    basSira: 1,
    bitSira: 3000,
    fonTurAciklama: null,
    dil: "TR",
    kurucuKod: null,
  });
  return (body.resultList ?? []).filter((row) => row.fonKodu === kod);
}

async function fetchFundGeneralRowsChunked(kod: string, startDate: Date, endDate: Date) {
  const rows: TefasFundGeneral[] = [];
  let cursorEnd = new Date(endDate);
  while (cursorEnd >= startDate) {
    const chunkStart = addDays(cursorEnd, -30);
    const boundedStart = chunkStart < startDate ? startDate : chunkStart;
    try {
      rows.push(...await fetchFundGeneralRows(kod, boundedStart, cursorEnd));
    } catch {
      // TEFAS bazen tek araligi reddediyor; diger parcalari kacirmayalim.
    }
    cursorEnd = addDays(boundedStart, -1);
    if (cursorEnd >= startDate) {
      await new Promise((resolve) => setTimeout(resolve, 420));
    }
  }
  return rows;
}

export async function fetchTefasGeneralRange(startDate: Date, endDate: Date) {
  const first = await fetchGeneralPage(startDate, endDate, 1);
  const rows = [...(first.resultList ?? [])];
  const totalPages = first.toplamSayfa ?? 1;
  for (let page = 2; page <= totalPages; page++) {
    try {
      const body = await fetchGeneralPage(startDate, endDate, page);
      rows.push(...(body.resultList ?? []));
    } catch {
      // TEFAS bazen ara sayfada 429/503 donuyor; gelen sayfalari yine de kullan.
    }
  }
  return rows;
}

export async function fetchLatestTefasGeneral(maxLookbackDays = 10) {
  const today = latestBusinessDay();
  for (let i = 0; i <= maxLookbackDays; i++) {
    const date = addDays(today, -i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    let rows: TefasFundGeneral[] = [];
    try {
      rows = await fetchTefasGeneralRange(date, date);
    } catch {
      continue;
    }
    const availableDates = [...new Set(rows.map((row) => row.tarih).filter(Boolean))].sort();
    const latestDate = availableDates[availableDates.length - 1];
    if (latestDate) return { date: latestDate, rows: rows.filter((row) => row.tarih === latestDate) };
  }
  return { date: null, rows: [] };
}

function pickRowsByDate(rows: TefasFundGeneral[], target: Date, mode: "before" | "after") {
  const targetIso = isoDate(target);
  const picked = new Map<string, TefasFundGeneral>();

  rows.forEach((row) => {
    if (!row.fonKodu || toNumber(row.fiyat) === null || !row.tarih) return;
    if (mode === "before" && row.tarih >= targetIso) return;
    if (mode === "after" && row.tarih < targetIso) return;

    const current = picked.get(row.fonKodu);
    if (!current) {
      picked.set(row.fonKodu, row);
      return;
    }
    if (mode === "before" && row.tarih > current.tarih) picked.set(row.fonKodu, row);
    if (mode === "after" && row.tarih < current.tarih) picked.set(row.fonKodu, row);
  });

  return picked;
}

async function fetchAnchorRows(target: Date, mode: "before" | "after") {
  const start = mode === "before" ? addDays(target, -4) : target;
  const end = mode === "before" ? target : addDays(target, 3);
  const rows = await fetchTefasGeneralRange(start, end);
  return pickRowsByDate(rows, target, mode);
}

export async function fetchHistoricalReturnFallbacks(currentDate: string | null, currentRows: TefasFundGeneral[]) {
  if (!currentDate || currentRows.length === 0) return new Map<string, HistoricalReturnFallback>();

  const end = new Date(`${currentDate}T12:00:00`);
  const currentMap = new Map<string, TefasFundGeneral>();
  currentRows.forEach((row) => {
    if (row.fonKodu && toNumber(row.fiyat) !== null) currentMap.set(row.fonKodu, row);
  });

  const firstDayOfYear = new Date(end.getFullYear(), 0, 1, 12);
  const anchorRequests: Array<[Date, "before" | "after"]> = [
    [end, "before"],
    [addDays(end, -7), "after"],
    [addMonths(end, -1), "after"],
    [addMonths(end, -3), "after"],
    [addMonths(end, -6), "after"],
    [firstDayOfYear, "after"],
    [addMonths(end, -12), "after"],
  ];
  const anchors: Array<Map<string, TefasFundGeneral>> = [];
  for (const [target, mode] of anchorRequests) {
    anchors.push(await fetchAnchorRows(target, mode).catch(() => new Map<string, TefasFundGeneral>()));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const [daily, week, month, quarter, half, ytd, year] = anchors;

  const result = new Map<string, HistoricalReturnFallback>();
  currentMap.forEach((current, kod) => {
    const currentPrice = toNumber(current.fiyat);
    result.set(kod, {
      gunluk_getiri: percentChange(currentPrice, toNumber(daily.get(kod)?.fiyat)),
      getiri_1h: percentChange(currentPrice, toNumber(week.get(kod)?.fiyat)),
      getiri_1a: percentChange(currentPrice, toNumber(month.get(kod)?.fiyat)),
      getiri_3a: percentChange(currentPrice, toNumber(quarter.get(kod)?.fiyat)),
      getiri_6a: percentChange(currentPrice, toNumber(half.get(kod)?.fiyat)),
      getiri_yb: percentChange(currentPrice, toNumber(ytd.get(kod)?.fiyat)),
      getiri_1y: percentChange(currentPrice, toNumber(year.get(kod)?.fiyat)),
    });
  });

  return result;
}

export function mergeTefasSnapshot(
  generalRows: TefasFundGeneral[],
  returnRows: TefasFundReturn[],
  managementRows: TefasFundManagement[],
  sizeRows: TefasFundSize[] = [],
  dailyRows: TefasFundReturn[] = [],
  historicalReturns = new Map<string, HistoricalReturnFallback>(),
): FonSnapshotRow[] {
  const returnMap = new Map(returnRows.map((row) => [row.fonKodu, row]));
  const managementMap = new Map(managementRows.map((row) => [row.fonKodu, row]));
  const sizeMap = new Map(sizeRows.map((row) => [row.fonKodu, row]));
  const dailyMap = new Map(dailyRows.map((row) => [row.fonKodu, row]));
  const byCode = new Map<string, TefasFundGeneral[]>();

  generalRows.forEach((row) => {
    if (!row.fonKodu) return;
    const current = byCode.get(row.fonKodu) ?? [];
    current.push(row);
    byCode.set(row.fonKodu, current);
  });

  const codes = new Set<string>([
    ...generalRows.map((row) => row.fonKodu).filter(Boolean),
    ...returnRows.map((row) => row.fonKodu).filter(Boolean),
    ...sizeRows.map((row) => row.fonKodu).filter(Boolean),
  ]);

  return [...codes].map((kod) => {
    const rows = byCode.get(kod) ?? [];
    const sorted = [...rows].sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));
    const latest = sorted[sorted.length - 1] ?? null;
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const ret = returnMap.get(kod);
    const fee = managementMap.get(kod);
    const size = sizeMap.get(kod);
    const daily = dailyMap.get(kod);
    const sizeValue = toNumber(size?.sonPortfoyDegeri);
    const shareCount = toNumber(size?.sonPayAdedi);
    const inferredPrice = sizeValue !== null && shareCount !== null && shareCount > 0 ? sizeValue / shareCount : null;
    const tefasDurum = ret?.tefasDurum ?? size?.tefasDurum ?? null;
    const isClosedTefas = tefasDurum === false;
    const hist = historicalReturns.get(kod);
    const dailyReturn = toNumber(daily?.getiriOrani) ?? toNumber(size?.netGetiriOrani) ?? percentChange(toNumber(latest?.fiyat), toNumber(previous?.fiyat));

    return {
      kod,
      unvan: latest?.fonUnvan || ret?.fonUnvan || size?.fonUnvan || kod,
      kategori: ret?.fonTurAciklama ?? size?.fonTurAciklama ?? null,
      fiyat: toNumber(latest?.fiyat) ?? inferredPrice,
      gunluk_getiri: isClosedTefas ? (hist?.gunluk_getiri ?? dailyReturn) : (dailyReturn ?? hist?.gunluk_getiri ?? null),
      getiri_1h: hist?.getiri_1h ?? null,
      getiri_1a: toNumber(ret?.getiri1a) ?? hist?.getiri_1a ?? null,
      getiri_3a: toNumber(ret?.getiri3a) ?? hist?.getiri_3a ?? null,
      getiri_6a: toNumber(ret?.getiri6a) ?? hist?.getiri_6a ?? null,
      getiri_1y: toNumber(ret?.getiri1y) ?? hist?.getiri_1y ?? null,
      getiri_yb: toNumber(ret?.getiriyb) ?? hist?.getiri_yb ?? null,
      getiri_3y: toNumber(ret?.getiri3y),
      getiri_5y: toNumber(ret?.getiri5y),
      risk_degeri: toNumber(ret?.riskDegeri),
      portfoy_buyukluk: toNumber(latest?.portfoyBuyukluk) ?? sizeValue,
      kisi_sayisi: toNumber(latest?.kisiSayisi),
      tedavuldeki_pay: toNumber(latest?.tedPaySayisi) ?? shareCount,
      yonetim_ucreti_yillik: managementFee(fee),
      toplam_gider_orani: toNumber(fee?.fonTopGiderKesoran),
      tefas_durum: tefasDurum,
      veri_tarihi: latest?.tarih ?? null,
    };
  });
}

export async function fetchLiveTefasSnapshot() {
  const general = await fetchLatestTefasGeneral(10).catch(() => ({ date: null, rows: [] as TefasFundGeneral[] }));
  const [returns, management, sizeRows, dailyRows, historicalReturns] = await Promise.all([
    fetchTefasReturns(),
    fetchTefasManagementFees().catch(() => [] as TefasFundManagement[]),
    fetchTefasSizeRows().catch(() => [] as TefasFundSize[]),
    fetchTefasDailyReturns().catch(() => [] as TefasFundReturn[]),
    fetchHistoricalReturnFallbacks(general.date, general.rows).catch(() => new Map<string, HistoricalReturnFallback>()),
  ]);
  return mergeTefasSnapshot(general.rows, returns, management, sizeRows, dailyRows, historicalReturns);
}

export async function fetchTefasFundHistory(kod: string, range = "1mo"): Promise<FonHistoryPoint[]> {
  const end = latestBusinessDay();
  const start = (() => {
    if (range === "1wk") return addDays(end, -10);
    if (range === "3mo") return addDays(end, -105);
    if (range === "6mo") return addDays(end, -200);
    if (range === "1y") return addDays(end, -380);
    if (range === "ytd") return new Date(end.getFullYear(), 0, 1);
    return addDays(end, -30);
  })();

  const rows = await fetchFundGeneralRowsChunked(kod.toLocaleUpperCase("tr-TR"), start, end);
  const byDate = new Map<string, TefasFundGeneral>();
  rows.forEach((row) => {
    if (!row.tarih || toNumber(row.fiyat) === null) return;
    byDate.set(row.tarih, row);
  });

  return [...byDate.values()]
    .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)))
    .map((row) => ({
      tarih: new Date(row.tarih).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "2-digit" }),
      tarih_iso: row.tarih,
      fiyat: toNumber(row.fiyat) ?? 0,
      portfoy_buyukluk: toNumber(row.portfoyBuyukluk),
      kisi_sayisi: toNumber(row.kisiSayisi),
      tedavuldeki_pay: toNumber(row.tedPaySayisi),
    }));
}
