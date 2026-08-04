import { hataYakala } from "@/lib/hata-yakala";

// Sirket takvimi kaynak katmani (KAP konu-bazli cekim).
// Kesif: kap.org.tr/tr/bildirim-sorgu flight payload'inda 199 konu -> subjectOid haritasi var;
// byCriteria API'si subjectList ile filtreleyebiliyor (bkz. docs-vault takvim logu K-TK2/K-TK3).
// ONEMLI: byCriteria genis tarih araliginda HTTP 500 doner -> pencere <=90 gun tutulur.

const SITE = "https://www.kap.org.tr";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const LISTE_HEADERS = { "User-Agent": UA, "Content-Type": "application/json", Referer: `${SITE}/tr/bildirim-sorgu` };

export const KONU_OID = {
  finansalTakvim: "4028328c69a8545e0169ceb480335e5c", // DG — sirket-beyanli bilanco aciklama tarihleri
  karPayi: "4028328d5988e2630159d5fb51c81fe6",        // ODA — Kar Payi Dagitimi
  finansalRapor: "4028328c594bfdca01594c0af9aa0057",  // FR — fiili finansal rapor aciklamasi
} as const;

const PENCERE_GUN = 80; // byCriteria 500 limitine karsi guvenli dilim (<=90)

export type KapListeOgesi = {
  disclosureIndex: number;
  stockCodes: string | null;
  publishDate?: string;
  disclosureType?: string;
  year?: string | number | null;      // finansal rapor donemi
  period?: string | null;             // '3'|'6'|'9'|'12' veya 'MT'|'HZ'|'EY'|'YS'
  donem?: string | null;
};

// Kaynak akisinin nerede koptugunu gorunur kilar. `tabloluGovde` kritik: sirketlerin
// cogu Finansal Takvim tablosunu bos birakip yalniz aciklama metni yaziyor — tablolu
// bildirim sayisi sifira duserse KAP sablonu degismis demektir.
export type CekimTeshis = { liste: number; tickerli: number; govde: number; tabloluGovde: number; eslesme: number };

export type BilancoTakvimKaydi = {
  ticker: string;
  donem: string;          // '2026/Q2'
  donem_bitis: string;    // ISO
  tarih: string;          // beyan edilen aciklama tarihi (ISO)
  kap_disclosure_index: number;
};

export type TemettuKaydi = {
  ticker: string;
  tarih: string;                 // nakit odeme tarihi (ISO)
  brut_tutar: number | null;     // 1 TL nominal paya
  net_tutar: number | null;
  stopaj_orani: number | null;
  para_birimi: string;
  odeme_sekli: string | null;
  genel_kurul_tarihi: string | null;
  karar_tarihi: string | null;
  kap_disclosure_index: number;
  ham_alanlar: Record<string, string>;
};

function htmlTemizle(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// 'DD.MM.YYYY' | 'DD/MM/YYYY' -> ISO 'YYYY-MM-DD'
export function trTarihIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!m) return null;
  const [, g, a, y] = m;
  const gg = g.padStart(2, "0"), aa = a.padStart(2, "0");
  if (+aa < 1 || +aa > 12 || +gg < 1 || +gg > 31) return null;
  return `${y}-${aa}-${gg}`;
}

// '1.234,56' -> 1234.56 | '' -> null
export function trSayi(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = s.replace(/[^\d.,-]/g, "");
  if (!t) return null;
  const n = parseFloat(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
}

// Donem sonu tarihinden '2026/Q2' uret. Ceyrek sonu olmayan tarihler atlanir.
export function donemEtiketi(iso: string): string | null {
  const [y, a] = iso.split("-");
  const ceyrek: Record<string, string> = { "03": "Q1", "06": "Q2", "09": "Q3", "12": "Q4" };
  return ceyrek[a] ? `${y}/${ceyrek[a]}` : null;
}

async function isindir(): Promise<void> {
  try {
    await fetch(`${SITE}/tr/bildirim-sorgu`, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(6000) });
  } catch { /* WAF isinma en iyi cabayla */ }
}

function gunEkle(d: Date, n: number): Date {
  const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Konu bazli bildirim listesi — tarih araligi PENCERE_GUN dilimlerine bolunur (500 limiti).
export async function kapKonuListesi(
  subjectOid: string, gunGeri: number, gunIleri = 1, pencereGun = PENCERE_GUN,
): Promise<KapListeOgesi[] | null> {
  await isindir();
  const bugun = new Date();
  const enEski = gunEkle(bugun, -gunGeri);
  const enYeni = gunEkle(bugun, gunIleri);
  const hepsi: KapListeOgesi[] = [];
  let herhangiBasarili = false;

  for (let bas = new Date(enEski); bas < enYeni; bas = gunEkle(bas, pencereGun)) {
    const bit = gunEkle(bas, pencereGun) < enYeni ? gunEkle(bas, pencereGun) : enYeni;
    try {
      const res = await fetch(`${SITE}/tr/api/disclosure/members/byCriteria`, {
        method: "POST",
        headers: LISTE_HEADERS,
        body: JSON.stringify({ fromDate: iso(bas), toDate: iso(bit), mkkMemberOidList: [], subjectList: subjectOid ? [subjectOid] : [] }),
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        hataYakala("takvim-kaynak:liste", new Error(`byCriteria ${res.status} (${iso(bas)}..${iso(bit)})`));
        continue;
      }
      const d = await res.json();
      if (Array.isArray(d)) { hepsi.push(...d); herhangiBasarili = true; }
    } catch (e) {
      hataYakala("takvim-kaynak:liste", e, { pencere: `${iso(bas)}..${iso(bit)}` });
    }
  }
  // Hicbir pencere basarili degilse "kaynak erisilemedi" (null) — cagiran yumusak uyari uretir.
  return herhangiBasarili ? hepsi : null;
}

// KAP WAF'i hizli ardisik detay isteklerinde 429 veriyor -> istekler arasi bekleme + geri cekilme.
const DETAY_BEKLEME_MS = 180;
let sonDetayZamani = 0;
async function bekle(ms: number) { await new Promise((r) => setTimeout(r, ms)); }

async function bildirimGovdesi(index: number): Promise<string | null> {
  const gecen = Date.now() - sonDetayZamani;
  if (gecen < DETAY_BEKLEME_MS) await bekle(DETAY_BEKLEME_MS - gecen);
  sonDetayZamani = Date.now();
  try {
    const res = await fetch(`${SITE}/tr/api/notification/attachment-detail/${index}`, {
      headers: { "User-Agent": UA, Referer: `${SITE}/tr/Bildirim/${index}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429) { await bekle(2000); return null; }   // WAF: bu turu atla, sonraki kosuda gelir
    if (!res.ok) return null;
    const d = await res.json();
    const d0 = Array.isArray(d) ? d[0] : d;
    // disclosureBody bir DIZI — sablonun parcalari ayri elemanlarda gelebiliyor;
    // yalniz [0] okumak tablonun deger bolumunu disarida birakiyordu.
    const govde = d0?.disclosureBody;
    if (Array.isArray(govde)) return govde.filter((x: unknown) => typeof x === "string").join("\n");
    return typeof govde === "string" ? govde : null;
  } catch {
    return null;
  }
}

// Bildirim govdesi etiketli HTML tablo — ardisik <td> ciftlerinin TAMAMI (sirasiyla).
// Hucre icerigi ic ice div'ler barindirdigi icin once etiket temizligi yapilir; dar
// "tarih yakinligi" regex'leri bu yuzden calismaz (bkz. takvim logu FAZ 5 notu).
function tdCiftleri(html: string): [string, string][] {
  const out: [string, string][] = [];
  for (const m of html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)) {
    const a = htmlTemizle(m[1]);
    const b = htmlTemizle(m[2]);
    if (a && b) out.push([a, b]);
  }
  return out;
}

// Etiket->deger haritasi (ilk gorulen kazanir). YALNIZ duz "etiket | deger" tablolari icin;
// matris tablolarda (bkz. matrisSatirlar) yanlis eslesme uretir.
function alanCiftleri(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [etiket, deger] of tdCiftleri(html)) {
    if (etiket.length < 90 && etiket !== deger && !(etiket in out)) out[etiket] = deger;
  }
  return out;
}

// Satir-hucre matrisi: her <tr> icin <td>/<th> hucreleri sirasiyla.
// (KAP bazi basliklarda <th> kullaniyor — Ahlatci parserindaki ayni tuzak.)
function tabloSatirlari(html: string): string[][] {
  const satirlar: string[][] = [];
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const hucreler: string[] = [];
    for (const c of tr[1].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/g)) hucreler.push(htmlTemizle(c[1]));
    if (hucreler.length) satirlar.push(hucreler);
  }
  return satirlar;
}

// KAP'in "Nakit Kar Payi Odeme Tutar ve Oranlari" / "Kar Payi Odeme Tarihleri" tablolari
// MATRIS: tek baslik satiri + pay grubu basina bir veri satiri. Basligi bulup sonraki
// satirlari sutun adlarina gore okur. Ardisik <td> ciftleme bu yapida basligi degerle
// eslestiriyordu (or. brut tutar olarak "1 TL Nominal..." etiketinden "1" cikiyordu).
function matrisSatirlar(satirlar: string[][], baslikIsareti: RegExp): Record<string, string>[] {
  const i = satirlar.findIndex((s) => s.some((h) => baslikIsareti.test(h)));
  if (i < 0) return [];
  const baslik = satirlar[i];
  const out: Record<string, string>[] = [];
  for (const s of satirlar.slice(i + 1)) {
    if (s.length < 2) break;
    if (s.some((h) => baslikIsareti.test(h))) break;   // sonraki tablonun basligina geldik
    const kayit: Record<string, string> = {};
    baslik.forEach((b, j) => { if (b && s[j]) kayit[b] = s[j]; });
    if (Object.keys(kayit).length) out.push(kayit);
  }
  return out;
}

function ilkTicker(stockCodes: string | null | undefined): string | null {
  if (!stockCodes) return null;
  const k = stockCodes.split(",")[0].trim().toUpperCase();
  return /^[A-Z0-9]{3,6}$/.test(k) ? k : null;
}

// ---- BILANCO TAKVIMI: KAP "Finansal Takvim" ----
// Govdede donem-sonu -> aciklanma tarihi cift(ler)i bulunur (or. 30/06/2026 -> 13/08/2026).
export async function bilancoTakvimiCek(
  gunGeri = 120, enFazlaDetay = 120, teshis?: CekimTeshis,
): Promise<BilancoTakvimKaydi[] | null> {
  const liste = await kapKonuListesi(KONU_OID.finansalTakvim, gunGeri);
  if (liste === null) return null;
  if (teshis) teshis.liste = liste.length;
  const kayitlar: BilancoTakvimKaydi[] = [];
  // Ayni sirketin birden cok bildirimi olabilir; en YENI bildirim kazanir (liste yeniden eskiye).
  const gorulen = new Set<string>();
  let detaySayaci = 0;
  for (const item of liste) {
    if (detaySayaci >= enFazlaDetay) break;   // tur basi tavan — kalanlar sonraki kosuda
    const ticker = ilkTicker(item.stockCodes);
    if (!ticker) continue;
    if (teshis) teshis.tickerli++;
    detaySayaci++;
    const govde = await bildirimGovdesi(item.disclosureIndex);
    if (!govde) continue;
    if (teshis) teshis.govde++;
    // "Finansal Takvim" govde yapisi (canli dogrulandi, 83 bildirim):
    //   <tr> ... Dönem Başlangıç Tarihi | Dönem Bitiş Tarihi | Planlanan KAP'ta İlan Tarihi
    //   <tr> oda_FirstQuarter ... 1. Çeyrek     (2./3. Çeyrek ve Yıllık ayni sekilde)
    // ONEMLI: tarih degerleri hucre METNINDE cikmiyor — KAP sablonu degerleri gizli
    // dugum/oznitelikte tasiyor (htmlTemizle sonrasi hucreler bos, ham HTML'de tarih var).
    // Bu yuzden basliktan sonraki satirlarin HAM HTML'inden tarih cikariyoruz; son iki
    // tarih (donem bitisi, ilan tarihi) alinir. Asagidaki uc kosul — ceyrek sonu olma,
    // ilan > donem sonu, ticker+donem tekrari — yanlis eslesmeyi eliyor.
    const hamSatirlar = [...govde.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
    const baslikIdx = hamSatirlar.findIndex((r) => /Planlanan KAP/i.test(r));
    const tarihler: [string, string][] = [];
    const tara = (satirlar: string[]) => {
      for (const ham of satirlar) {
        const gunler = [...ham.matchAll(/\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/g)].map((m) => m[0]);
        if (gunler.length >= 2) tarihler.push([gunler[gunler.length - 2], gunler[gunler.length - 1]]);
      }
    };
    if (baslikIdx >= 0) tara(hamSatirlar.slice(baslikIdx + 1));
    else tara(hamSatirlar);          // sablon degisirse sessizce sifira dusme
    if (teshis) {
      teshis.eslesme += tarihler.length;
      if (baslikIdx >= 0) teshis.tabloluGovde++;
    }
    for (const t of tarihler) {
      const donemBitis = trTarihIso(t[0]);
      const aciklama = trTarihIso(t[1]);
      if (!donemBitis || !aciklama) continue;
      const donem = donemEtiketi(donemBitis);
      if (!donem) continue;                       // ceyrek sonu degilse takvim satiri degildir
      if (aciklama <= donemBitis) continue;        // aciklama donem sonundan sonra olmali
      const anahtar = `${ticker}|${donem}`;
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      kayitlar.push({ ticker, donem, donem_bitis: donemBitis, tarih: aciklama, kap_disclosure_index: item.disclosureIndex });
    }
  }
  return kayitlar;
}

// ---- TEMETTU: KAP "Kar Payi Dagitimi" ----
// YALNIZ odeme yapanlar takvime girer ("Odenmeyecek" kararlari gurultu olur, atlanir).
export async function temettuCek(gunGeri = 45, enFazlaDetay = 120): Promise<TemettuKaydi[] | null> {
  const liste = await kapKonuListesi(KONU_OID.karPayi, gunGeri);
  if (liste === null) return null;
  const kayitlar: TemettuKaydi[] = [];
  const gorulen = new Set<string>();
  let detaySayaci = 0;
  for (const item of liste) {
    if (detaySayaci >= enFazlaDetay) break;   // tur basi tavan — kalanlar sonraki kosuda
    const ticker = ilkTicker(item.stockCodes);
    if (!ticker) continue;
    detaySayaci++;
    const govde = await bildirimGovdesi(item.disclosureIndex);
    if (!govde) continue;
    const alan = alanCiftleri(govde);
    const satirlar = tabloSatirlari(govde);

    const odemeSekli = alan["Nakit Kar Payı Ödeme Şekli"] ?? null;
    if (odemeSekli && /ödenmeyecek/i.test(odemeSekli)) continue;  // kar dagitilmiyor

    // Odeme tarihi — "Kar Payi Odeme Tarihleri" matrisinden.
    // Oncelik: kesinlesen odeme tarihi > kesinlesen hak kullanim > teklif edilen.
    const tarihSatirlari = matrisSatirlar(satirlar, /Hak Kullanım Tarihi/i);
    let odemeTarihi: string | null = null;
    for (const kalip of [/^Ödeme Tarihi/i, /^Kesinleşen/i, /^Teklif Edilen/i]) {
      for (const s of tarihSatirlari) {
        const k = Object.keys(s).find((x) => kalip.test(x));
        const t = k ? trTarihIso(s[k]) : null;
        if (t) { odemeTarihi = t; break; }
      }
      if (odemeTarihi) break;
    }
    if (!odemeTarihi) continue;   // tarihi olmayan kayit takvime giremez

    const anahtar = `${ticker}|${odemeTarihi}`;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);

    // Tutarlar — "Nakit Kar Payi Odeme Tutar ve Oranlari" matrisinden.
    // Sutunlar: ...Brut(TL) | ...Brut(%) | Stopaj Orani(%) | ...Net(TL) | ...Net(%)
    // (TL) suzgeci yuzdelik sutunlari eler; pay gruplari ayni TL tutarini alir,
    // tutari dolu ilk grup yeterlidir.
    let brut: number | null = null, net: number | null = null, stopaj: number | null = null;
    for (const s of matrisSatirlar(satirlar, /Pay Grup Bilgileri/i)) {
      for (const [k, v] of Object.entries(s)) {
        if (/stopaj/i.test(k) && stopaj === null) stopaj = trSayi(v);
        if (!/kar\s*pay/i.test(k) || !/\(TL\)/i.test(k)) continue;
        if (/brüt/i.test(k) && brut === null) brut = trSayi(v);
        else if (/\bnet\b/i.test(k) && net === null) net = trSayi(v);
      }
      if (brut !== null || net !== null) break;
    }

    kayitlar.push({
      ticker,
      tarih: odemeTarihi,
      brut_tutar: brut,
      net_tutar: net,
      stopaj_orani: stopaj,
      para_birimi: alan["Para Birimi"] ?? "TRY",
      odeme_sekli: odemeSekli,
      genel_kurul_tarihi: trTarihIso(alan["Konunun Gündemde Yer Aldığı Genel Kurul Tarihi"] ?? null),
      karar_tarihi: trTarihIso(alan["Karar Tarihi"] ?? null),
      kap_disclosure_index: item.disclosureIndex,
      ham_alanlar: { govde_satir_sayisi: String(satirlar.length), odeme_sekli: odemeSekli ?? "" },
    });
  }
  return kayitlar;
}

// ---- FIILEN ACIKLANAN BILANCOLAR: KAP "Finansal Rapor" ----
// Bilanco takviminin BIRINCIL kaynagi. Neden: KAP'in "Finansal Takvim" bildirimlerinde
// sirketin BEYAN ETTIGI planlanan ilan tarihleri attachment-detail yanitinda HIC gelmiyor —
// tablo iskeleti var, deger hucreleri bos (83/83 bildirimde dogrulandi, uretim kosusu dahil).
// Bu yuzden takvim "fiilen aciklanan raporlar"dan kuruluyor: her FR bildirimi = bir sirketin
// bir donem raporunu KAP'ta yayinladigi kesin tarih. Uydurma/tahmini tarih uretilmiyor.
export type AciklananRapor = { ticker: string; tarih: string; donem: string | null; donemBitis: string | null; index: number };

// disclosureBasic.period -> ceyrek sonu ayi. KAP kodlari: 3/6/9/12 ay numarasi veya
// MT(mart) HZ(haziran) EY(eylul) YS(yil sonu) kisaltmasi olarak gelebiliyor.
const DONEM_AY: Record<string, string> = {
  "3": "03", MT: "03", "6": "06", HZ: "06", "9": "09", EY: "09", "12": "12", YS: "12", AR: "12",
};

export async function aciklananBilancolar(gunGeri = 8): Promise<AciklananRapor[] | null> {
  // FR icin KONU FILTRESI KULLANILMIYOR: finansalRapor subjectOid'i byCriteria'da her
  // pencere boyunda 500 donduruyor (15 gunluk dilimlerde bile). Bunun yerine projede
  // zaten calisan desen uygulaniyor (bkz. lib/kap-kaynak.ts): konu filtresiz cekip
  // disclosureType === "FR" ile istemci tarafinda suzmek.
  // Pencere 4 gun: konu filtresiz sorgu tum KAP bildirimlerini dondurdugu icin daha
  // genis aralikta 500 aliniyor (lib/kap-kaynak.ts de 4 gun kullaniyor). Cron gunde
  // 3 kez kostugundan 8 gunluk geriye bakis yeni raporlari kacirmaya yetmez; gecmis
  // zaten DB'de birikiyor.
  const liste = await kapKonuListesi("", gunGeri, 1, 4);
  if (liste === null) return null;
  const out: AciklananRapor[] = [];
  for (const item of liste) {
    if ((item.disclosureType ?? "").toUpperCase() !== "FR") continue;
    const ticker = ilkTicker(item.stockCodes);
    const pd = item.publishDate;   // 'DD.MM.YYYY HH:MM:SS' veya 'YYYY.MM.DD ...'
    if (!ticker || !pd) continue;
    const parca = pd.split(" ")[0];
    const t = trTarihIso(parca) ?? (/^\d{4}\./.test(parca) ? parca.replace(/\./g, "-") : null);
    if (!t) continue;
    const ay = DONEM_AY[String(item.period ?? item.donem ?? "").trim().toUpperCase()];
    const yil = item.year ? String(item.year) : null;
    const donemBitis = ay && yil ? `${yil}-${ay}-${ay === "02" ? "28" : ["04", "06", "09", "11"].includes(ay) ? "30" : "31"}` : null;
    out.push({ ticker, tarih: t, donem: donemBitis ? donemEtiketi(donemBitis) : null, donemBitis, index: item.disclosureIndex });
  }
  return out;
}
