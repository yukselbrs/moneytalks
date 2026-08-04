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
};

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
export async function kapKonuListesi(subjectOid: string, gunGeri: number, gunIleri = 1): Promise<KapListeOgesi[] | null> {
  await isindir();
  const bugun = new Date();
  const enEski = gunEkle(bugun, -gunGeri);
  const enYeni = gunEkle(bugun, gunIleri);
  const hepsi: KapListeOgesi[] = [];
  let herhangiBasarili = false;

  for (let bas = new Date(enEski); bas < enYeni; bas = gunEkle(bas, PENCERE_GUN)) {
    const bit = gunEkle(bas, PENCERE_GUN) < enYeni ? gunEkle(bas, PENCERE_GUN) : enYeni;
    try {
      const res = await fetch(`${SITE}/tr/api/disclosure/members/byCriteria`, {
        method: "POST",
        headers: LISTE_HEADERS,
        body: JSON.stringify({ fromDate: iso(bas), toDate: iso(bit), mkkMemberOidList: [], subjectList: [subjectOid] }),
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
    const govde = d0?.disclosureBody;
    return Array.isArray(govde) && typeof govde[0] === "string" ? govde[0] : null;
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

// Etiket->deger haritasi (ilk gorulen kazanir).
function alanCiftleri(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [etiket, deger] of tdCiftleri(html)) {
    if (etiket.length < 90 && etiket !== deger && !(etiket in out)) out[etiket] = deger;
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
export async function bilancoTakvimiCek(gunGeri = 120, enFazlaDetay = 120): Promise<BilancoTakvimKaydi[] | null> {
  const liste = await kapKonuListesi(KONU_OID.finansalTakvim, gunGeri);
  if (liste === null) return null;
  const kayitlar: BilancoTakvimKaydi[] = [];
  // Ayni sirketin birden cok bildirimi olabilir; en YENI bildirim kazanir (liste yeniden eskiye).
  const gorulen = new Set<string>();
  let detaySayaci = 0;
  for (const item of liste) {
    if (detaySayaci >= enFazlaDetay) break;   // tur basi tavan — kalanlar sonraki kosuda
    const ticker = ilkTicker(item.stockCodes);
    if (!ticker) continue;
    detaySayaci++;
    const govde = await bildirimGovdesi(item.disclosureIndex);
    if (!govde) continue;
    // "Finansal Tablo Dönemleri" tablosu: her satir  <donem sonu> | <aciklanma tarihi>.
    // Iki tarafi da DD/MM/YYYY olan td ciftlerini al.
    const tarihler = tdCiftleri(govde).filter(
      ([a, b]) => /^\d{2}\/\d{2}\/\d{4}$/.test(a) && /^\d{2}\/\d{2}\/\d{4}$/.test(b),
    );
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

    const odemeSekli = alan["Nakit Kar Payı Ödeme Şekli"] ?? null;
    if (odemeSekli && /ödenmeyecek/i.test(odemeSekli)) continue;  // kar dagitilmiyor

    // Odeme tarihi: etiketi "... Nakit Kar Payı Ödeme Tarihi" varyasyonlari
    let odemeTarihi: string | null = null;
    for (const [k, v] of Object.entries(alan)) {
      if (/ödeme tarihi/i.test(k)) {
        const t = trTarihIso(v);
        if (t) { odemeTarihi = t; break; }
      }
    }
    if (!odemeTarihi) {
      // Tabloda etiketsiz olabilir: "Ödeme Tarihi" basligindan sonraki ilk tarih
      const m = govde.match(/Ödeme Tarihi[\s\S]{0,400}?(\d{2}\.\d{2}\.\d{4})/);
      odemeTarihi = m ? trTarihIso(m[1]) : null;
    }
    if (!odemeTarihi) continue;   // tarihi olmayan kayit takvime giremez

    const anahtar = `${ticker}|${odemeTarihi}`;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);

    // Brut/net: "1 TL Nominal Değerli Paya Ödenecek Nakit Kar Payı - Brüt/Net (TL)"
    // Etiket HEM "kar payi" HEM brut/net icermeli — gevsek /net/ eslesmesi
    // "Net Donem Kari" gibi alanlari yakalayip yanlis tutar yaziyordu.
    let brut: number | null = null, net: number | null = null;
    for (const [k, v] of Object.entries(alan)) {
      if (!/kar\s*pay/i.test(k)) continue;
      if (/brüt/i.test(k) && brut === null) brut = trSayi(v);
      else if (/\bnet\b/i.test(k) && net === null) net = trSayi(v);
    }
    kayitlar.push({
      ticker,
      tarih: odemeTarihi,
      brut_tutar: brut,
      net_tutar: net,
      stopaj_orani: trSayi(alan["Stopaj Oranı(%)"] ?? null),
      para_birimi: alan["Para Birimi"] ?? "TRY",
      odeme_sekli: odemeSekli,
      genel_kurul_tarihi: trTarihIso(alan["Konunun Gündemde Yer Aldığı Genel Kurul Tarihi"] ?? null),
      karar_tarihi: trTarihIso(alan["Karar Tarihi"] ?? null),
      kap_disclosure_index: item.disclosureIndex,
      ham_alanlar: Object.fromEntries(Object.entries(alan).slice(0, 25)),
    });
  }
  return kayitlar;
}

// ---- FIILEN ACIKLANAN BILANCOLAR: KAP "Finansal Rapor" ----
// Takvimdeki 'bekleniyor' satirini 'aciklandi' + tarih_kesin=true yapmak icin.
export async function aciklananBilancolar(gunGeri = 80): Promise<{ ticker: string; tarih: string }[] | null> {
  const liste = await kapKonuListesi(KONU_OID.finansalRapor, gunGeri);
  if (liste === null) return null;
  const out: { ticker: string; tarih: string }[] = [];
  for (const item of liste) {
    const ticker = ilkTicker(item.stockCodes);
    const pd = item.publishDate;   // 'DD.MM.YYYY HH:MM:SS' veya 'YYYY.MM.DD ...'
    if (!ticker || !pd) continue;
    const parca = pd.split(" ")[0];
    const t = trTarihIso(parca) ?? (/^\d{4}\./.test(parca) ? parca.replace(/\./g, "-") : null);
    if (t) out.push({ ticker, tarih: t });
  }
  return out;
}
