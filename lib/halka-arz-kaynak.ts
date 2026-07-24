// Halka arz kaynak katmani (K-HA1): yapisal alanlar araci kurum kamu duyuru sayfasindan
// (ahlatciyatirim.com.tr/halka-arz — liste kartlari + detay dt/dd ciftleri + tamamlanan tablosu),
// islem-goruyor sinyali Yahoo fiyat akisindan. Her hata GUVENLE bos/null doner; cron kirilmaz.

const AHLATCI = "https://www.ahlatciyatirim.com.tr";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export type KaynakArz = {
  kod: string;
  sirket_adi: string;
  logo_url: string | null;
  aktif: boolean; // true = talep toplama surecinde/karti aktif, false = tamamlanan tablosundan
  talep_baslangic: string | null; // YYYY-MM-DD
  talep_bitis: string | null;
  fiyat: number | null;
  buyukluk: number | null;
  pay_miktari: number | null;
  dagitim_yontemi: string | null;
  iskonto_orani: number | null;
  halka_aciklik_orani: number | null;
  araci_kurumlar: string[];
  kaynak_link: string;
};

const AYLAR: Record<string, number> = {
  ocak: 1, subat: 2, "şubat": 2, mart: 3, nisan: 4, mayis: 5, "mayıs": 5, haziran: 6,
  temmuz: 7, agustos: 8, "ağustos": 8, eylul: 9, "eylül": 9, ekim: 10, kasim: 11, "kasım": 11, aralik: 12, "aralık": 12,
};

function htmlTemizle(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "4.480.000.000 ₺" | "35,00 ₺" | "%20,00" | "128.000.000 Lot" -> sayi
export function trSayi(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.replace(/[^\d.,]/g, "");
  if (!m) return null;
  const normalized = m.includes(",") ? m.replace(/\./g, "").replace(",", ".") : m.replace(/\./g, "");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

// "22 - 24 Temmuz 2026" | "30 Haziran - 1 Temmuz 2026" | "21 Temmuz 2026" -> [bas, bit] (ISO)
export function trTarihAraligi(s: string | null | undefined): [string | null, string | null] {
  if (!s) return [null, null];
  const yilM = s.match(/(20\d{2})/);
  if (!yilM) return [null, null];
  const yil = parseInt(yilM[1]);
  const parcalar = [...s.matchAll(/(\d{1,2})\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)?/g)]
    .map((m) => ({ gun: parseInt(m[1]), ay: m[2] ? AYLAR[m[2].toLocaleLowerCase("tr")] : undefined }))
    .filter((p) => p.gun >= 1 && p.gun <= 31);
  if (!parcalar.length) return [null, null];
  // Aysiz gunler kendinden SONRAKI ayli parcadan ay alir ("22 - 24 Temmuz": 22 -> Temmuz).
  let sonAy: number | undefined;
  for (let i = parcalar.length - 1; i >= 0; i--) {
    if (parcalar[i].ay) sonAy = parcalar[i].ay;
    else parcalar[i].ay = sonAy;
  }
  const gecerli = parcalar.filter((p) => p.ay);
  if (!gecerli.length) return [null, null];
  const iso = (p: { gun: number; ay?: number }) => `${yil}-${String(p.ay).padStart(2, "0")}-${String(p.gun).padStart(2, "0")}`;
  return [iso(gecerli[0]), iso(gecerli[gecerli.length - 1])];
}

async function getir(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, accept: "text/html" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function dtDdCiftleri(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)) {
    map.set(htmlTemizle(m[1]).toLocaleLowerCase("tr"), htmlTemizle(m[2]));
  }
  return map;
}

function detayAlanlariUygula(arz: KaynakArz, dd: Map<string, string>) {
  const al = (k: string) => dd.get(k) ?? null;
  arz.pay_miktari = arz.pay_miktari ?? trSayi(al("halka arz büyüklüğü (lot)"));
  arz.buyukluk = arz.buyukluk ?? trSayi(al("halka arz büyüklüğü (tl)"));
  arz.fiyat = arz.fiyat ?? trSayi(al("halka arz fiyatı"));
  arz.iskonto_orani = arz.iskonto_orani ?? trSayi(al("iskonto oranı"));
  arz.halka_aciklik_orani = arz.halka_aciklik_orani ?? trSayi(al("halka açıklık oranı"));
  arz.dagitim_yontemi = arz.dagitim_yontemi ?? al("dağıtım yöntemi");
  if (!arz.talep_baslangic) {
    const [b, s] = trTarihAraligi(al("talep tarihleri"));
    arz.talep_baslangic = b;
    arz.talep_bitis = s;
  }
}

// Aktif kartlar: <article class="highlight-card ..."> ... __symbol / __title / logo / dt-dd
function aktifKartlar(html: string): KaynakArz[] {
  // Her parca kendi </article>'inda kesilir; son kartin parcasi sayfanin kalanini yutmasin
  // (aksi halde tamamlanan tablosunun <time> etiketleri karta sizip tarihleri bozuyor).
  const kartlar = html.split(/<article class="highlight-card/).slice(1).map((k) => k.split("</article>")[0]);
  const sonuc: KaynakArz[] = [];
  for (const kart of kartlar) {
    const kod = kart.match(/highlight-card__symbol">\s*([A-Z0-9]{2,10})\s*</)?.[1];
    const baslikM = kart.match(/highlight-card__title">\s*<a href="([^"]+)">([^<]+)<\/a>/);
    if (!kod || !baslikM) continue;
    const logo = kart.match(/company-logo[^>]*>\s*<img src="([^"]+)"/)?.[1] ?? null;
    const arz: KaynakArz = {
      kod,
      sirket_adi: htmlTemizle(baslikM[2]),
      logo_url: logo ? (logo.startsWith("http") ? logo : AHLATCI + logo) : null,
      aktif: true,
      talep_baslangic: null,
      talep_bitis: null,
      fiyat: null,
      buyukluk: null,
      pay_miktari: null,
      dagitim_yontemi: null,
      iskonto_orani: null,
      halka_aciklik_orani: null,
      araci_kurumlar: [],
      kaynak_link: baslikM[1].startsWith("http") ? baslikM[1] : AHLATCI + baslikM[1],
    };
    // Kart ici dt/dd (fiyat, tarih, buyukluk); <time datetime="..."> varsa ISO'yu dogrudan al.
    const dd = dtDdCiftleri(kart);
    arz.fiyat = trSayi(dd.get("halka arz fiyatı"));
    arz.buyukluk = trSayi(dd.get("büyüklük") ?? dd.get("halka arz büyüklüğü (tl)"));
    const zamanlar = [...kart.matchAll(/datetime="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]).sort();
    if (zamanlar.length) {
      arz.talep_baslangic = zamanlar[0];
      arz.talep_bitis = zamanlar[zamanlar.length - 1];
    } else {
      const [b, s] = trTarihAraligi(dd.get("talep tarihleri"));
      arz.talep_baslangic = b;
      arz.talep_bitis = s;
    }
    sonuc.push(arz);
  }
  return sonuc;
}

// Tamamlanan tablosu. DIKKAT: veri satirlarinda Sirket hucresi <th scope="row">, kalan 6 hucre <td>:
// td[0]=Sektor td[1]=Fiyat td[2]=Talep Tarihleri td[3]=Buyukluk td[4]=Konsorsiyum td[5]=Detay.
function tamamlananTablosu(html: string, enFazla: number): KaynakArz[] {
  const ti = html.indexOf('id="tablo-basligi"');
  if (ti < 0) return [];
  const tablo = html.slice(ti).match(/<table[\s\S]*?<\/table>/)?.[0];
  if (!tablo) return [];
  const sonuc: KaynakArz[] = [];
  for (const satir of tablo.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const tdler = [...satir.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (tdler.length < 5) continue; // baslik satiri (yalniz th'ler) veya beklenmedik yapi
    const sirketHam = htmlTemizle(satir.match(/<th[^>]*>([\s\S]*?)<\/th>/)?.[1] ?? "");
    const kod = sirketHam.match(/\b([A-Z0-9]{4,6})\s*$/)?.[1];
    if (!kod) continue;
    const detayHref = satir.match(/href="(\/halka-arz\/[^"]+)"/)?.[1];
    const [b, s] = trTarihAraligi(htmlTemizle(tdler[2]));
    const konsorsiyum = htmlTemizle(tdler[4]);
    sonuc.push({
      kod,
      sirket_adi: sirketHam.replace(/\b[A-Z0-9]{4,6}\s*$/, "").trim(),
      logo_url: null,
      aktif: false,
      talep_baslangic: b,
      talep_bitis: s,
      fiyat: trSayi(htmlTemizle(tdler[1])),
      buyukluk: trSayi(htmlTemizle(tdler[3])),
      pay_miktari: null,
      dagitim_yontemi: null,
      iskonto_orani: null,
      halka_aciklik_orani: null,
      araci_kurumlar: konsorsiyum && konsorsiyum !== "-" ? konsorsiyum.split(/\s*[,·]\s*/).filter(Boolean) : [],
      kaynak_link: detayHref ? AHLATCI + detayHref : AHLATCI + "/halka-arz",
    });
    if (sonuc.length >= enFazla) break;
  }
  return sonuc;
}

// Ahlatci detay sayfasi og:image = sirket logosu (or. /medya/borsa/hisse/sa-ra-enerji-2751.png).
function ogImageLogo(html: string): string | null {
  const m = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (!m) return null;
  const u = m[1];
  return /\/medya\/borsa\/hisse\//.test(u) ? (u.startsWith("http") ? u : AHLATCI + u) : null;
}

// Ana giris: aktif kartlar (+ detay sayfasi zenginlestirme) + son tamamlananlar (+ logo).
export async function ahlatciArzlari(tamamlananLimit = 10): Promise<KaynakArz[] | null> {
  const html = await getir(`${AHLATCI}/halka-arz`);
  if (!html) return null;
  const aktifler = aktifKartlar(html);
  for (const arz of aktifler) {
    const detay = await getir(arz.kaynak_link);
    if (detay) {
      detayAlanlariUygula(arz, dtDdCiftleri(detay));
      if (!arz.logo_url) arz.logo_url = ogImageLogo(detay);
    }
  }
  const tamamlananlar = tamamlananTablosu(html, tamamlananLimit).filter(
    (t) => !aktifler.some((a) => a.kod === t.kod)
  );
  // Tamamlananlar tabloda logo tasimaz — detay sayfasindan og:image cek.
  for (const arz of tamamlananlar) {
    const detay = await getir(arz.kaynak_link);
    if (detay) arz.logo_url = ogImageLogo(detay);
  }
  return [...aktifler, ...tamamlananlar];
}

// Islem-goruyor sinyali: Yahoo'da fiyat + ilk islem tarihi olustuysa hisse borsada islem goruyordur.
// ONEMLI: Yahoo cagrisinda KISA UA ("Mozilla/5.0") kullanilir — uzun Chrome-masaustu UA'si (Ahlatci
// scrape'i icin gerekli) Vercel IP'sinden 429 yiyor; kisa UA sitenin geri kalaninin (grafik/fiyatlar)
// gunluk kullandigi calisan desen. query1 tokezlerse query2 yedegi; ikisi de dusmusse "sinyal yok"
// (guvenli taraf) — bir sonraki cron kosusu tekrar dener.
const YAHOO_UA = "Mozilla/5.0";
export async function yahooIslemSinyali(kod: string): Promise<{ islemGoruyor: boolean; ilkIslemTarihi: string | null; detay: string }> {
  const denemeler: string[] = [];
  for (const host of ["query1", "query2"]) {
    try {
      const res = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${kod}.IS?range=5d&interval=1d`, {
        headers: { "User-Agent": YAHOO_UA },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        denemeler.push(`${host}:${res.status}`);
        continue;
      }
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const fiyat = meta?.regularMarketPrice;
      const ilk = meta?.firstTradeDate;
      const varMi = typeof fiyat === "number" && Number.isFinite(fiyat);
      denemeler.push(`${host}:${varMi ? "fiyat" : "bos:" + (data?.chart?.error?.code ?? "?")}`);
      return {
        islemGoruyor: varMi,
        ilkIslemTarihi: typeof ilk === "number" ? new Date(ilk * 1000).toISOString().slice(0, 10) : null,
        detay: denemeler.join(","),
      };
    } catch (e) {
      denemeler.push(`${host}:exc:${e instanceof Error ? e.name : "?"}`);
    }
  }
  return { islemGoruyor: false, ilkIslemTarihi: null, detay: denemeler.join(",") };
}
