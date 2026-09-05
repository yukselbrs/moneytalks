// Halka arz kaynak katmani (K-HA1): yapisal alanlar Ahlatci duyuru sayfasindan,
// yeni/aktif arz tespiti icin Halkarz.com yedeginden; islem-goruyor sinyali Yahoo fiyat akisindan.
// Her hata GUVENLE bos/null doner; tek kaynak dustugunde digeri cron'u beslemeye devam eder.

const AHLATCI = "https://www.ahlatciyatirim.com.tr";
const HALKARZ = "https://halkarz.com";
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
  pazar: string | null;
  arz_sekli: string | null;
  araci_kurumlar: string[];
  kaynak: "ahlatci" | "halkarz";
  kaynak_link: string;
};

export type HalkaArzKaynakSonucu = {
  arzlar: KaynakArz[] | null;
  uyarilar: Array<"ahlatci" | "halkarz">;
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

// "2,2 Milyar TL" | "850 Milyon TL" | "4.480.000.000 TL" -> tam TL tutari
export function trTutar(s: string | null | undefined): number | null {
  const n = trSayi(s);
  if (n === null || !s) return n;
  const k = s.toLocaleLowerCase("tr");
  if (/milyar|\bmlr\b/.test(k)) return n * 1_000_000_000;
  if (/milyon|\bmn\b/.test(k)) return n * 1_000_000;
  return n;
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
  arz.pazar = arz.pazar ?? al("pazar");
  arz.arz_sekli = arz.arz_sekli ?? al("halka arz şekli");
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
      pazar: null,
      arz_sekli: null,
      araci_kurumlar: [],
      kaynak: "ahlatci",
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
      pazar: null,
      arz_sekli: null,
      araci_kurumlar: konsorsiyum && konsorsiyum !== "-" ? konsorsiyum.split(/\s*[,·]\s*/).filter(Boolean) : [],
      kaynak: "ahlatci",
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

function halkarzTabloCiftleri(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const satir of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const hucreler = [...satir.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => htmlTemizle(m[1]));
    if (hucreler.length < 2) continue;
    const anahtar = hucreler[0].replace(/\s*:\s*$/, "").toLocaleLowerCase("tr");
    if (anahtar) map.set(anahtar, hucreler[1]);
  }
  return map;
}

function halkarzEkAlan(html: string, baslik: string): string | null {
  for (const li of html.match(/<li[^>]*>[\s\S]*?<\/li>/gi) ?? []) {
    const h5 = htmlTemizle(li.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i)?.[1] ?? "");
    if (h5.toLocaleLowerCase("tr") !== baslik.toLocaleLowerCase("tr")) continue;
    // Kaynak dipnotlarindaki yil/sayfa numaralari (%20 + Sayfa 132 gibi) sayisal alana sizmasin.
    const icerik = li.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
    return htmlTemizle(icerik.replace(/<small[^>]*>[\s\S]*?<\/small>/gi, "")) || null;
  }
  return null;
}

function arzSekliMetni(s: string | null): string | null {
  if (!s) return null;
  const turler: string[] = [];
  if (/sermaye\s+artırımı/i.test(s)) turler.push("Sermaye Artırımı");
  if (/ortak\s+satışı/i.test(s)) turler.push("Ortak Satışı");
  return turler.length ? turler.join(" + ") : s;
}

// Halkarz ana sayfasindaki yalniz bugun devam eden/yaklasan arzlari okur. Bu filtre eski
// kartlarin yeni bir DB kaydi olarak tekrar lifecycle'a girmesini engeller.
export function halkarzListeKartlari(html: string, bugun = new Date().toISOString().slice(0, 10)): KaynakArz[] {
  const sonuc: KaynakArz[] = [];
  const kartlar = html.match(/<article[^>]*class=["'][^"']*\bindex-list\b[^"']*["'][^>]*>[\s\S]*?<\/article>/gi) ?? [];
  for (const kart of kartlar) {
    const kod = htmlTemizle(kart.match(/class=["'][^"']*\bil-bist-kod\b[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1] ?? "").match(/^[A-Z0-9]{2,10}$/)?.[0];
    const baslikBloku = kart.match(/class=["'][^"']*\bil-halka-arz-sirket\b[^"']*["'][^>]*>([\s\S]*?)<\/h\d>/i)?.[1] ?? "";
    const baslikM = baslikBloku.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const tarihHam = kart.match(/<time[^>]*(?:datetime|title)=["']([^"']+)["']/i)?.[1]
      ?? htmlTemizle(kart.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1] ?? "");
    const [talepBaslangic, talepBitis] = trTarihAraligi(tarihHam);
    if (!kod || !baslikM || !talepBaslangic || !talepBitis || talepBitis < bugun) continue;
    const logoEtiketi = kart.match(/<img[^>]*class=["'][^"']*\bslogo\b[^"']*["'][^>]*>/i)?.[0] ?? "";
    const logo = logoEtiketi.match(/src=["']([^"']+)["']/i)?.[1] ?? null;
    sonuc.push({
      kod,
      sirket_adi: htmlTemizle(baslikM[2]),
      logo_url: logo ? (logo.startsWith("http") ? logo : HALKARZ + logo) : null,
      aktif: true,
      talep_baslangic: talepBaslangic,
      talep_bitis: talepBitis,
      fiyat: null,
      buyukluk: null,
      pay_miktari: null,
      dagitim_yontemi: null,
      iskonto_orani: null,
      halka_aciklik_orani: null,
      pazar: null,
      arz_sekli: null,
      araci_kurumlar: [],
      kaynak: "halkarz",
      kaynak_link: baslikM[1].startsWith("http") ? baslikM[1] : HALKARZ + baslikM[1],
    });
  }
  return sonuc;
}

export function halkarzDetayAlanlariUygula(arz: KaynakArz, html: string): void {
  const tablo = halkarzTabloCiftleri(html);
  const al = (k: string) => tablo.get(k) ?? null;
  const [baslangic, bitis] = trTarihAraligi(al("halka arz tarihi"));
  arz.talep_baslangic = baslangic ?? arz.talep_baslangic;
  arz.talep_bitis = bitis ?? arz.talep_bitis;
  arz.fiyat = trSayi(al("halka arz fiyatı/aralığı")) ?? arz.fiyat;
  arz.pay_miktari = trSayi(al("pay")) ?? arz.pay_miktari;
  arz.dagitim_yontemi = al("dağıtım yöntemi")?.replace(/\s*\*+.*$/, "").trim() || arz.dagitim_yontemi;
  arz.pazar = al("pazar") ?? arz.pazar;
  const araci = al("aracı kurum");
  if (araci) arz.araci_kurumlar = [araci];

  arz.halka_aciklik_orani = trSayi(halkarzEkAlan(html, "Halka Açıklık")) ?? arz.halka_aciklik_orani;
  arz.iskonto_orani = trSayi(halkarzEkAlan(html, "Halka Arz İskontosu")) ?? arz.iskonto_orani;
  arz.buyukluk = trTutar(halkarzEkAlan(html, "Halka Arz Büyüklüğü")) ?? arz.buyukluk;
  arz.arz_sekli = arzSekliMetni(halkarzEkAlan(html, "Halka Arz Şekli")) ?? arz.arz_sekli;
}

export async function halkarzArzlari(): Promise<KaynakArz[] | null> {
  const html = await getir(`${HALKARZ}/`);
  if (!html) return null;
  const arzlar = halkarzListeKartlari(html);
  await Promise.all(arzlar.map(async (arz) => {
    const detay = await getir(arz.kaynak_link);
    if (detay) halkarzDetayAlanlariUygula(arz, detay);
  }));
  return arzlar;
}

function yedekAlanlariUygula(birincil: KaynakArz, yedek: KaynakArz): KaynakArz {
  return {
    ...birincil,
    aktif: birincil.aktif || yedek.aktif,
    logo_url: birincil.logo_url ?? yedek.logo_url,
    talep_baslangic: birincil.talep_baslangic ?? yedek.talep_baslangic,
    talep_bitis: birincil.talep_bitis ?? yedek.talep_bitis,
    fiyat: birincil.fiyat ?? yedek.fiyat,
    buyukluk: birincil.buyukluk ?? yedek.buyukluk,
    pay_miktari: birincil.pay_miktari ?? yedek.pay_miktari,
    dagitim_yontemi: birincil.dagitim_yontemi ?? yedek.dagitim_yontemi,
    iskonto_orani: birincil.iskonto_orani ?? yedek.iskonto_orani,
    halka_aciklik_orani: birincil.halka_aciklik_orani ?? yedek.halka_aciklik_orani,
    pazar: birincil.pazar ?? yedek.pazar,
    arz_sekli: birincil.arz_sekli ?? yedek.arz_sekli,
    araci_kurumlar: birincil.araci_kurumlar.length ? birincil.araci_kurumlar : yedek.araci_kurumlar,
  };
}

// Ahlatci birincil kalir; Halkarz yeni kodlari erkenden ekler ve Ahlatci'da bos kalan alanlari
// tamamlar. Iki istek paralel calisir, bu nedenle yedek kaynak cron suresini gereksiz uzatmaz.
export async function halkaArzKaynaklari(tamamlananLimit = 10): Promise<HalkaArzKaynakSonucu> {
  const [ahlatci, halkarz] = await Promise.all([ahlatciArzlari(tamamlananLimit), halkarzArzlari()]);
  const uyarilar: HalkaArzKaynakSonucu["uyarilar"] = [];
  if (ahlatci === null) uyarilar.push("ahlatci");
  if (halkarz === null) uyarilar.push("halkarz");
  if (ahlatci === null && halkarz === null) return { arzlar: null, uyarilar };

  const kodla = new Map<string, KaynakArz>((ahlatci ?? []).map((arz) => [arz.kod, arz]));
  for (const yedek of halkarz ?? []) {
    const birincil = kodla.get(yedek.kod);
    kodla.set(yedek.kod, birincil ? yedekAlanlariUygula(birincil, yedek) : yedek);
  }
  return { arzlar: [...kodla.values()], uyarilar };
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
