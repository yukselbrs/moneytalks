// Bilanco takviminin ILERIYE DONUK katmani — ucuncu taraf veri gerektirmez.
//
// Neden: sirketin BEYAN ETTIGI planlanan aciklama tarihi KAP API'sinden alinamiyor
// (dort kez dogrulandi, bkz. docs-vault takvim logu K-TK4) ve kullanilabilir ikincil
// kaynak yok (bkz. 04-arastirma/bilanco-takvimi-ikincil-kaynak-degerlendirmesi.md).
// Sirket basina TAHMIN uretmek yerine MEVZUATIN kendisini gosteriyoruz: SPK II-14.1
// bildirim sureleri kamuya acik ve deterministik.
//
// SPK II-14.1 — Kamuya bildirim sureleri (donem sonundan itibaren):
//   Ara donem (Q1/Q2/Q3):  konsolide olmayan 30 gun · konsolide 40 gun
//   Yillik (Q4):           konsolide olmayan 60 gun · konsolide 70 gun
// Dogrulama: 2025 yil sonu +60 = 1 Mart 2026 (Pazar) -> 2 Mart · +70 = 11 Mart 2026.
//            2026/Q2 +40 = 9 Agu 2026 (Pazar) -> 10 Agustos. Ikisi de kamuya duyurulan
//            tarihlerle birebir tutuyor.
//
// BILINEN SINIR: son gun hafta sonuna denk gelirse sonraki is gunune kaydirilir, ancak
// resmi tatiller HESABA KATILMAZ (dini bayramlar her yil kayiyor). Bu yuzden satirlar
// "yasal son gun" olarak etiketlenir, sirket beyani olarak degil.

export type SonTarihOlayi = {
  tarih: string;          // ISO
  donem: string;          // '2026/Q2'
  donemBitis: string;     // ISO
  kapsam: "konsolide-olmayan" | "konsolide";
  baslik: string;
};

const CEYREK_SONU: Record<string, string> = { Q1: "03-31", Q2: "06-30", Q3: "09-30", Q4: "12-31" };

// Hafta sonuna denk gelen son gun sonraki is gunune kayar.
function isGunuyeKaydir(d: Date): Date {
  const x = new Date(d);
  while (x.getUTCDay() === 0 || x.getUTCDay() === 6) x.setUTCDate(x.getUTCDate() + 1);
  return x;
}

function gunEkle(iso: string, gun: number): Date {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Bir ceyregin iki yasal son tarihini uretir.
function ceyrekSonTarihleri(yil: number, ceyrek: "Q1" | "Q2" | "Q3" | "Q4"): SonTarihOlayi[] {
  const donemBitis = `${yil}-${CEYREK_SONU[ceyrek]}`;
  const donem = `${yil}/${ceyrek}`;
  const yillik = ceyrek === "Q4";
  const donemAdi = yillik ? "Yıllık" : ceyrek === "Q2" ? "6 aylık" : ceyrek === "Q1" ? "3 aylık" : "9 aylık";
  return ([
    { gun: yillik ? 60 : 30, kapsam: "konsolide-olmayan" as const, etiket: "konsolide olmayan" },
    { gun: yillik ? 70 : 40, kapsam: "konsolide" as const, etiket: "konsolide" },
  ]).map(({ gun, kapsam, etiket }) => ({
    tarih: iso(isGunuyeKaydir(gunEkle(donemBitis, gun))),
    donem,
    donemBitis,
    kapsam,
    baslik: `${donemAdi} finansal rapor son günü — ${etiket} (SPK II-14.1, ${gun} gün)`,
  }));
}

// [from, to] araligina dusen tum yasal son tarihler. Saf fonksiyon: DB/ag gerektirmez,
// bayatlamaz. Aralik birden fazla yila yayilabilir.
export function bilancoSonTarihleri(from: string, to: string): SonTarihOlayi[] {
  const ilkYil = parseInt(from.slice(0, 4), 10);
  const sonYil = parseInt(to.slice(0, 4), 10);
  if (!Number.isFinite(ilkYil) || !Number.isFinite(sonYil)) return [];
  const out: SonTarihOlayi[] = [];
  // Bir onceki yilin Q4'u Mart'ta duser -> tarama bir yil geriden baslar.
  for (let y = ilkYil - 1; y <= sonYil; y++) {
    for (const c of ["Q1", "Q2", "Q3", "Q4"] as const) {
      for (const o of ceyrekSonTarihleri(y, c)) {
        if (o.tarih >= from && o.tarih <= to) out.push(o);
      }
    }
  }
  return out.sort((a, b) => a.tarih.localeCompare(b.tarih));
}
