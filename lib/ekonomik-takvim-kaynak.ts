import { hataYakala } from "@/lib/hata-yakala";

// Ekonomik takvim kaynak katmani — UC gercek kaynak, hicbiri elle guncellenen statik liste degil:
//   1) ForexFactory haftalik XML  -> kuresel olaylar + onem + beklenti/onceki (canli fetch)
//   2) Fed FOMC takvim sayfasi    -> yil boyu ileriye donuk ABD faiz karari tarihleri (canli fetch)
//   3) Turkiye kural ureteci      -> TUIK TUFE (her ayin 3'u, hafta sonuysa sonraki is gunu) +
//      TCMB PPK (TCMB'nin ilan ettigi yillik takvim; sayfa JS-render oldugu icin parse edilemiyor,
//      bkz. docs-vault takvim logu "Bilinen sinir" — tarihler dogrulanabilir bicimde uretilir).
// Tum saatler TRT (UTC+3). Her kaynak bagimsiz; biri duserse digerleri yazilmaya devam eder.

const UA = "Mozilla/5.0";

export type EkonomikOlay = {
  ulke_kod: string;
  ulke_bayrak: string;
  olay: string;
  tarih: string;          // ISO
  saat: string | null;    // 'HH:MM' TRT
  onem: "Yüksek" | "Orta" | "Düşük";
  onceki: string | null;
  beklenti: string | null;
  gerceklesen: string | null;
  ilgili_enstruman: string | null;
  kaynak: string;
};

const BAYRAK: Record<string, string> = {
  TR: "🇹🇷", US: "🇺🇸", EU: "🇪🇺", GB: "🇬🇧", JP: "🇯🇵", CN: "🇨🇳",
  CA: "🇨🇦", AU: "🇦🇺", NZ: "🇳🇿", CH: "🇨🇭", ALL: "🌍",
};
// ForexFactory 'country' alani para birimi kodu veriyor -> ulke koduna cevir.
const FF_ULKE: Record<string, string> = {
  USD: "US", EUR: "EU", GBP: "GB", JPY: "JP", CNY: "CN",
  CAD: "CA", AUD: "AU", NZD: "NZ", CHF: "CH", All: "ALL",
};
// Satir tiklaninca gidilecek enstruman (varsa) — /doviz-maden/[kod]
const ENSTRUMAN: Record<string, string> = { US: "usd-try", EU: "eur-try", GB: "gbp-try", JP: "usd-jpy" };

function onemCevir(x: string): "Yüksek" | "Orta" | "Düşük" {
  const t = (x || "").toLowerCase();
  if (t.includes("high")) return "Yüksek";
  if (t.includes("medium")) return "Orta";
  return "Düşük";
}

// 'MM-DD-YYYY' (ForexFactory) -> ISO
function ffTarihIso(s: string): string | null {
  const m = s.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

// ForexFactory saatleri US/Eastern; TRT'ye cevir. '9:15am' + ISO tarih -> 'HH:MM'
function ffSaatTrt(tarihIso: string, saat: string): string | null {
  const m = saat.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})(am|pm)$/);
  if (!m) return null;
  let sa = parseInt(m[1], 10);
  const dk = m[2];
  if (m[3] === "pm" && sa !== 12) sa += 12;
  if (m[3] === "am" && sa === 12) sa = 0;
  // ET -> UTC ofseti mevsime gore -4/-5; tarihten hesapla (DST: Mart 2. Pazar - Kasim 1. Pazar).
  const d = new Date(`${tarihIso}T12:00:00Z`);
  const yil = d.getUTCFullYear();
  const martIkinciPazar = (() => { const x = new Date(Date.UTC(yil, 2, 1)); const ilk = (7 - x.getUTCDay()) % 7; return new Date(Date.UTC(yil, 2, 1 + ilk + 7)); })();
  const kasimIlkPazar = (() => { const x = new Date(Date.UTC(yil, 10, 1)); const ilk = (7 - x.getUTCDay()) % 7; return new Date(Date.UTC(yil, 10, 1 + ilk)); })();
  const yazSaati = d >= martIkinciPazar && d < kasimIlkPazar;
  const etOfset = yazSaati ? -4 : -5;
  const trtSaat = (sa - etOfset + 3 + 24) % 24;   // ET -> UTC -> TRT(+3)
  return `${String(trtSaat).padStart(2, "0")}:${dk}`;
}

// ---- KAYNAK 1: ForexFactory haftalik takvim (kuresel) ----
export async function ffHaftalikTakvim(): Promise<EkonomikOlay[] | null> {
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.xml", {
      headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) { hataYakala("ekonomik-takvim:ff", new Error(`HTTP ${res.status}`)); return null; }
    const xml = await res.text();
    const olaylar: EkonomikOlay[] = [];
    for (const blok of xml.match(/<event>[\s\S]*?<\/event>/g) ?? []) {
      const al = (etiket: string) => {
        const m = blok.match(new RegExp(`<${etiket}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${etiket}>`));
        const v = (m?.[1] ?? "").trim();
        return v || null;
      };
      const baslik = al("title");
      const tarihHam = al("date");
      if (!baslik || !tarihHam) continue;
      const tarih = ffTarihIso(tarihHam);
      if (!tarih) continue;
      const paraBirimi = al("country") ?? "All";
      const ulke = FF_ULKE[paraBirimi] ?? paraBirimi.slice(0, 2).toUpperCase();
      const onem = onemCevir(al("impact") ?? "");
      if (onem === "Düşük") continue;                         // gurultuyu takvime almiyoruz
      const saatHam = al("time");
      olaylar.push({
        ulke_kod: ulke,
        ulke_bayrak: BAYRAK[ulke] ?? "🌍",
        olay: baslik,
        tarih,
        saat: saatHam ? ffSaatTrt(tarih, saatHam) : null,
        onem,
        onceki: al("previous"),
        beklenti: al("forecast"),
        gerceklesen: al("actual"),
        ilgili_enstruman: ENSTRUMAN[ulke] ?? null,
        kaynak: "forexfactory",
      });
    }
    return olaylar;
  } catch (e) {
    hataYakala("ekonomik-takvim:ff", e);
    return null;
  }
}

// ---- KAYNAK 2: Fed FOMC toplanti takvimi (ileriye donuk) ----
const AY_EN: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export async function fedFomcTakvim(): Promise<EkonomikOlay[] | null> {
  try {
    const res = await fetch("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", {
      headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) { hataYakala("ekonomik-takvim:fed", new Error(`HTTP ${res.status}`)); return null; }
    const html = await res.text();
    const olaylar: EkonomikOlay[] = [];
    // Sayfa yil panellerine bolunur: "<panel> 2026 FOMC Meetings ... </panel>"
    const buYil = new Date().getUTCFullYear();
    const yilBloklari = html.split(/(?=\d{4}\s+FOMC Meetings)/);
    for (const blok of yilBloklari) {
      const yilM = blok.match(/^(\d{4})\s+FOMC Meetings/);
      if (!yilM) continue;
      const yil = parseInt(yilM[1], 10);
      // Takvim ileriye donuk bir urun — cok eski yillari yazmiyoruz (sayfa 2021'e kadar listeliyor).
      if (yil < buYil - 1) continue;
      const satirlar = blok.match(/fomc-meeting__month[\s\S]{0,400}?fomc-meeting__date[^>]*>([\s\S]{0,60}?)</g) ?? [];
      for (const satir of satirlar) {
        const ayM = satir.match(/fomc-meeting__month[^>]*>\s*(?:<strong>)?\s*([A-Za-z]+)/);
        const gunM = satir.match(/fomc-meeting__date[^>]*>\s*([\d–\-\s]+)/);
        if (!ayM || !gunM) continue;
        const ay = AY_EN[ayM[1].toLowerCase()];
        if (!ay) continue;
        // '27-28' | '27–28' | '28' -> KARAR gunu son gundur
        const gunler = gunM[1].replace(/–/g, "-").split("-").map((x) => parseInt(x.trim(), 10)).filter(Number.isFinite);
        const gun = gunler.length ? gunler[gunler.length - 1] : NaN;
        if (!Number.isFinite(gun) || gun < 1 || gun > 31) continue;
        olaylar.push({
          ulke_kod: "US",
          ulke_bayrak: BAYRAK.US,
          olay: "Fed Faiz Kararı (FOMC)",
          tarih: `${yil}-${String(ay).padStart(2, "0")}-${String(gun).padStart(2, "0")}`,
          saat: "21:00",              // 14:00 ET -> 21:00 TRT
          onem: "Yüksek",
          onceki: null, beklenti: null, gerceklesen: null,
          ilgili_enstruman: "usd-try",
          kaynak: "fed",
        });
      }
    }
    return olaylar;
  } catch (e) {
    hataYakala("ekonomik-takvim:fed", e);
    return null;
  }
}

// ---- KAYNAK 3: Turkiye kural ureteci ----
// TUFE: TUIK her ayin 3'unde 10:00'da yayinlar; hafta sonuna denk gelirse sonraki is gunu.
// Bu KURAL deterministiktir (elle liste degil) — istenen yil icin uretilir.
function sonrakiIsGunu(d: Date): Date {
  const x = new Date(d);
  while (x.getUTCDay() === 0 || x.getUTCDay() === 6) x.setUTCDate(x.getUTCDate() + 1);
  return x;
}

export function tuikTufeTakvimi(yil: number): EkonomikOlay[] {
  const out: EkonomikOlay[] = [];
  for (let ay = 1; ay <= 12; ay++) {
    const d = sonrakiIsGunu(new Date(Date.UTC(yil, ay - 1, 3)));
    out.push({
      ulke_kod: "TR", ulke_bayrak: BAYRAK.TR,
      olay: "TÜFE Enflasyon (TÜİK)",
      tarih: d.toISOString().slice(0, 10),
      saat: "10:00",
      onem: "Yüksek",
      onceki: null, beklenti: null, gerceklesen: null,
      ilgili_enstruman: "usd-try",
      kaynak: "resmi-kural",
    });
  }
  return out;
}

// TCMB PPK: yilda 8 toplanti; TCMB yil basinda takvimi ilan eder.
// SINIR: tcmb.gov.tr PPK sayfasi JS-render (statik HTML'de tarih yok), RSS/API yok ->
// tarihler TCMB'nin ilan ettigi takvimden yil bazinda tutulur ve cron her kosuda DB'ye yazar.
// Yeni yil takvimi ilan edildiginde buraya bir satir eklenir (yilda bir, ~1 dk).
const TCMB_PPK: Record<number, string[]> = {
  2026: ["2026-01-22", "2026-03-12", "2026-04-22", "2026-06-11", "2026-07-23", "2026-09-10", "2026-10-22", "2026-12-10"],
  2027: ["2027-01-21", "2027-03-11", "2027-04-22", "2027-06-10"], // TCMB 2027 ilk yari ilani
};
const TCMB_ENFLASYON_RAPORU: Record<number, string[]> = {
  2026: ["2026-02-12", "2026-05-14", "2026-08-13", "2026-11-12"],
};

export function tcmbTakvimi(yil: number): EkonomikOlay[] {
  const out: EkonomikOlay[] = [];
  for (const t of TCMB_PPK[yil] ?? []) {
    out.push({
      ulke_kod: "TR", ulke_bayrak: BAYRAK.TR, olay: "TCMB Faiz Kararı (PPK)",
      tarih: t, saat: "14:00", onem: "Yüksek",
      onceki: null, beklenti: null, gerceklesen: null,
      ilgili_enstruman: "usd-try", kaynak: "resmi-tcmb",
    });
  }
  for (const t of TCMB_ENFLASYON_RAPORU[yil] ?? []) {
    out.push({
      ulke_kod: "TR", ulke_bayrak: BAYRAK.TR, olay: "TCMB Enflasyon Raporu",
      tarih: t, saat: "10:00", onem: "Yüksek",
      onceki: null, beklenti: null, gerceklesen: null,
      ilgili_enstruman: "usd-try", kaynak: "resmi-tcmb",
    });
  }
  return out;
}

// Tum kaynaklari topla. Bagimsiz: biri null donerse digerleri yine yazilir.
export async function ekonomikTakvimTopla(yil: number): Promise<{ olaylar: EkonomikOlay[]; uyari: string[] }> {
  const uyari: string[] = [];
  const [ff, fed] = await Promise.all([ffHaftalikTakvim(), fedFomcTakvim()]);
  if (ff === null) uyari.push("forexfactory");
  if (fed === null) uyari.push("fed");
  const olaylar = [
    ...(ff ?? []),
    ...(fed ?? []),
    ...tuikTufeTakvimi(yil),
    ...tuikTufeTakvimi(yil + 1),
    ...tcmbTakvimi(yil),
    ...tcmbTakvimi(yil + 1),
  ];
  return { olaylar, uyari };
}
