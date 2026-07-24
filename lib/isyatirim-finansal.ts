// Is Yatirim mali tablo kaynagi: BIST'in TUM hisselerini (yeni kotasyonlar dahil) + tum donemleri
// kapsar. TradingView yeni kotasyonlarda temel veri tutmadigi icin (F/K/PD/DD/bilanco None) hisse
// sayfasi bu kaynaga duser. Endpoint herkese acik JSON; her hata GUVENLE null doner.
// Ozet Finansallar formati (Is Yatirim "sirket-karti" ekrani) birebir bu kalem kodlariyla eslesir.

const ISY = "https://www.isyatirim.com.tr/_layouts/15/Isyatirim.Website/Common/Data.aspx/MaliTablo";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

// Deger cifti: yeni = guncel donem, eski = karsilastirma donemi (gelir icin gecen yil ayni ceyrek,
// bilanco icin onceki yil sonu).
export type DegerCifti = { yeni: number | null; eski: number | null };

export type IsyOzetFinansal = {
  donem: string;              // guncel donem etiketi, or. "2026/3"
  gelirGecenYil: string;      // gelir karsilastirma etiketi, or. "2025/3"
  bilancoOnceki: string;      // bilanco karsilastirma etiketi, or. "2025/12"
  gelir: {
    satislar: DegerCifti;
    brut_kar: DegerCifti;
    esas_faaliyet_kari: DegerCifti;
    favok: DegerCifti;
    net_donem_kari: DegerCifti;
  };
  bilanco: {
    donen_varlik: DegerCifti;
    duran_varlik: DegerCifti;
    toplam_varlik: DegerCifti;
    finansal_borc: DegerCifti;
    net_borc: DegerCifti;
    ozkaynak: DegerCifti;
  };
  net_kar_ttm: number | null; // F/K icin: FY(onceki) - YTD(gecen yil ayni ceyrek) + YTD(guncel)
  para_birimi: string;        // "TRY"
};

type IsyDeger = number | string | null;
type IsyRow = { itemCode: string; value1: IsyDeger; value2: IsyDeger; value3: IsyDeger; value4: IsyDeger };

// Is Yatirim degerleri STRING gelir ("18701984892"); parse et. Bos/gecersiz -> null.
function say(v: IsyDeger | undefined): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function maliTablo(
  ticker: string,
  donemler: [number, number][],
  grup: string
): Promise<Map<string, IsyRow> | null> {
  const qp = new URLSearchParams({ companyCode: ticker.toUpperCase(), exchange: "TRY", financialGroup: grup });
  donemler.slice(0, 4).forEach(([y, p], i) => {
    qp.set(`year${i + 1}`, String(y));
    qp.set(`period${i + 1}`, String(p));
  });
  try {
    const res = await fetch(`${ISY}?${qp.toString()}`, {
      headers: { "User-Agent": UA, Referer: "https://www.isyatirim.com.tr/", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const rows = (j?.value ?? []) as IsyRow[];
    if (!Array.isArray(rows) || !rows.length) return null;
    return new Map(rows.filter((r) => r?.itemCode).map((r) => [r.itemCode, r]));
  } catch {
    return null;
  }
}

// Son yayinlanmis ceyregi tespit et: guncel tarihten geriye ceyrek-sonlari dener, Toplam Varlik dolu olani sec.
function ceyrekAdaylari(bugun: { yil: number; ay: number }): [number, number][] {
  // Ceyrek-sonu donemleri: 3(Q1),6(Q2),9(Q3),12(Q4). Raporlama gecikmesi ~2 ay -> guncel aydan 1 ceyrek geri baslar.
  const adaylar: [number, number][] = [];
  let y = bugun.yil;
  let ceyrek = Math.floor((bugun.ay - 1) / 3) + 1; // 1..4
  // guncel ceyregi henuz raporlanmamis olabilir; bir geri git
  ceyrek -= 1;
  if (ceyrek < 1) { ceyrek = 4; y -= 1; }
  for (let i = 0; i < 5; i++) {
    adaylar.push([y, ceyrek * 3]);
    ceyrek -= 1;
    if (ceyrek < 1) { ceyrek = 4; y -= 1; }
  }
  return adaylar;
}

// Ana giris: bir hissenin Is Yatirim ozet finansali. bugunAy/bugunYil disaridan verilir (Date yasak degil
// ama saf tutmak icin cagiran verir). grup: non-financial "XI_29" varsayilan; banka/finans "UFRS_K".
export async function isyOzetFinansal(
  ticker: string,
  bugun: { yil: number; ay: number },
  grup: string = "XI_29"
): Promise<IsyOzetFinansal | null> {
  const adaylar = ceyrekAdaylari(bugun);
  // 1. Adim: son yayinlanmis ceyregi bul (Toplam Varlik 1BL dolu olan en yeni).
  const probe = await maliTablo(ticker, adaylar.slice(0, 4), grup);
  if (!probe) return null;
  const tv = probe.get("1BL");
  const kolonDeger = (r: IsyRow | undefined, k: 1 | 2 | 3 | 4) => say(r?.[`value${k}` as keyof IsyRow] as IsyDeger);
  let guncelIdx = -1;
  for (let k = 1 as 1 | 2 | 3 | 4; k <= 4; k = (k + 1) as 1 | 2 | 3 | 4) {
    if (kolonDeger(tv, k) !== null) { guncelIdx = k - 1; break; }
  }
  if (guncelIdx < 0) return null;
  const [gY, gP] = adaylar[guncelIdx];

  // Gerekli donemler: guncel(gY/gP), onceki-yil-sonu(gY-1/12), gecen-yil-ayni-ceyrek(gY-1/gP), onceki-yil-once-sonu(gY-2/12 — TTM icin)
  const donemler: [number, number][] = [
    [gY, gP],
    [gY - 1, 12],
    [gY - 1, gP],
    [gY - 2, 12],
  ];
  const m = await maliTablo(ticker, donemler, grup);
  if (!m) return null;

  const gelirCifti = (code: string): DegerCifti => {
    const r = m.get(code);
    return { yeni: say(r?.value1), eski: say(r?.value3) }; // v1=guncel YTD, v3=gecen yil ayni ceyrek YTD
  };
  const bilancoCifti = (code: string): DegerCifti => {
    const r = m.get(code);
    return { yeni: say(r?.value1), eski: say(r?.value2) }; // v1=guncel, v2=onceki yil sonu
  };
  const iki = (a: string, b: string, sel: 1 | 2 | 3): number | null => {
    const av = say(m.get(a)?.[`value${sel}` as keyof IsyRow] as IsyDeger);
    const bv = say(m.get(b)?.[`value${sel}` as keyof IsyRow] as IsyDeger);
    if (av === null && bv === null) return null;
    return (av ?? 0) + (bv ?? 0);
  };

  // FAVOK = Net Faaliyet Kar (3H) + Amortisman (4B). Net Borc = Finansal Borc (2AA+2BA) - Nakit(1AA) - Fin.Yatirim(1AB).
  const favok = (sel: 1 | 3): number | null => {
    const nf = say(m.get("3H")?.[`value${sel}` as keyof IsyRow] as IsyDeger);
    const am = say(m.get("4B")?.[`value${sel}` as keyof IsyRow] as IsyDeger);
    if (nf === null && am === null) return null;
    return (nf ?? 0) + (am ?? 0);
  };
  const finansalBorc = (sel: 1 | 2): number | null => iki("2AA", "2BA", sel);
  const netBorc = (sel: 1 | 2): number | null => {
    const fb = finansalBorc(sel);
    if (fb === null) return null;
    const nakit = say(m.get("1AA")?.[`value${sel}` as keyof IsyRow] as IsyDeger) ?? 0;
    const finYat = say(m.get("1AB")?.[`value${sel}` as keyof IsyRow] as IsyDeger) ?? 0;
    return fb - nakit - finYat;
  };

  // TTM net kar = FY(onceki, v2) - YTD gecen yil ayni ceyrek (v3) + YTD guncel (v1). Biri eksikse null.
  const nk = m.get("3L");
  const ttm = nk && say(nk.value1) !== null && say(nk.value2) !== null && say(nk.value3) !== null
    ? (say(nk.value2) as number) - (say(nk.value3) as number) + (say(nk.value1) as number)
    : null;

  return {
    donem: `${gY}/${gP}`,
    gelirGecenYil: `${gY - 1}/${gP}`,
    bilancoOnceki: `${gY - 1}/12`,
    gelir: {
      satislar: gelirCifti("3C"),
      brut_kar: gelirCifti("3D"),
      esas_faaliyet_kari: gelirCifti("3DF"),
      favok: { yeni: favok(1), eski: favok(3) },
      net_donem_kari: gelirCifti("3L"),
    },
    bilanco: {
      donen_varlik: bilancoCifti("1A"),
      duran_varlik: bilancoCifti("1AK"),
      toplam_varlik: bilancoCifti("1BL"),
      finansal_borc: { yeni: finansalBorc(1), eski: finansalBorc(2) },
      net_borc: { yeni: netBorc(1), eski: netBorc(2) },
      ozkaynak: bilancoCifti("2N"),
    },
    net_kar_ttm: ttm,
    para_birimi: "TRY",
  };
}

// F/K & PD/DD: guncel piyasa degeri (disaridan) / TTM net kar & ozkaynak. Girdi eksikse null.
export function isyCarpanlar(ozet: IsyOzetFinansal, piyasaDegeri: number | null): { fk: number | null; pddd: number | null } {
  const ozkaynak = ozet.bilanco.ozkaynak.yeni;
  const fk = piyasaDegeri && ozet.net_kar_ttm && ozet.net_kar_ttm > 0
    ? Math.round((piyasaDegeri / ozet.net_kar_ttm) * 100) / 100
    : null;
  const pddd = piyasaDegeri && ozkaynak && ozkaynak > 0
    ? Math.round((piyasaDegeri / ozkaynak) * 100) / 100
    : null;
  return { fk, pddd };
}
