import { describe, expect, it } from "vitest";
import {
  halkarzDetayAlanlariUygula,
  halkarzListeKartlari,
  trTutar,
} from "@/lib/halka-arz-kaynak";

const listeHtml = `
  <article class="index-list">
    <a href="https://halkarz.com/net-global-endustriyel-yatirimlar-a-s/">
      <img src="https://halkarz.com/logo/NETGLOBAL.jpg" class="slogo">
    </a>
    <span class="il-bist-kod"> NETGL </span>
    <h3 class="il-halka-arz-sirket">
      <a href="https://halkarz.com/net-global-endustriyel-yatirimlar-a-s/">Net Global Endüstriyel Yatırımlar A.Ş.</a>
    </h3>
    <time datetime="9-10-11 Eylül 2026">9-10-11 Eylül 2026</time>
  </article>
  <article class="index-list">
    <span class="il-bist-kod"> ESKI </span>
    <h3 class="il-halka-arz-sirket"><a href="https://halkarz.com/eski/">Eski Arz A.Ş.</a></h3>
    <time datetime="1-2 Eylül 2026">1-2 Eylül 2026</time>
  </article>`;

const detayHtml = `
  <table>
    <tr><td><em>Halka Arz Tarihi : </em></td><td><time>9-10-11 Eylül 2026</time><small>09:00-17:00</small></td></tr>
    <tr><td><em>Halka Arz Fiyatı/Aralığı : </em></td><td><strong>25,52 TL</strong></td></tr>
    <tr><td><em>Dağıtım Yöntemi : </em></td><td><strong>Eşit Dağıtım **</strong></td></tr>
    <tr><td><em>Pay : </em></td><td><strong>87.500.000 Lot</strong></td></tr>
    <tr><td><em>Aracı Kurum : </em></td><td><strong>Tacirler Yatırım Menkul Değerler A.Ş.</strong></td></tr>
    <tr><td><em>Pazar : </em></td><td><strong>Yıldız Pazar</strong></td></tr>
  </table>
  <li><h5>Halka Arz Şekli</h5><p>- Sermaye Artırımı : 62.500.000 Lot<br>- Ortak Satışı : 25.000.000 Lot<br><small>SPK Bülteni, 2026/56.</small></p></li>
  <li><h5>Halka Açıklık</h5><p>- %28.<br><small>İzahname, Sayfa 249.</small></p></li>
  <li><h5>Halka Arz İskontosu</h5><p>- %20.<br><small>Fiyat Tespit Raporu, Sayfa 132.</small></p></li>
  <li><h5>Halka Arz Büyüklüğü</h5><p>～ 2,2 Milyar TL.</p></li>`;

describe("Halkarz halka arz kaynagi", () => {
  it("yalniz devam eden/yaklasan liste kartlarini ISO tarihlerle okur", () => {
    const arzlar = halkarzListeKartlari(listeHtml, "2026-09-05");
    expect(arzlar).toHaveLength(1);
    expect(arzlar[0]).toMatchObject({
      kod: "NETGL",
      sirket_adi: "Net Global Endüstriyel Yatırımlar A.Ş.",
      talep_baslangic: "2026-09-09",
      talep_bitis: "2026-09-11",
      logo_url: "https://halkarz.com/logo/NETGLOBAL.jpg",
      kaynak: "halkarz",
      aktif: true,
    });
  });

  it("NETGL detay alanlarini normalize eder", () => {
    const arz = halkarzListeKartlari(listeHtml, "2026-09-05")[0];
    halkarzDetayAlanlariUygula(arz, detayHtml);
    expect(arz).toMatchObject({
      fiyat: 25.52,
      pay_miktari: 87_500_000,
      buyukluk: 2_200_000_000,
      dagitim_yontemi: "Eşit Dağıtım",
      iskonto_orani: 20,
      halka_aciklik_orani: 28,
      pazar: "Yıldız Pazar",
      arz_sekli: "Sermaye Artırımı + Ortak Satışı",
      araci_kurumlar: ["Tacirler Yatırım Menkul Değerler A.Ş."],
    });
  });

  it("Turkce buyukluk birimlerini tam TL tutarina cevirir", () => {
    expect(trTutar("2,2 Milyar TL")).toBe(2_200_000_000);
    expect(trTutar("850 Milyon TL")).toBe(850_000_000);
    expect(trTutar("4.480.000.000 TL")).toBe(4_480_000_000);
  });
});
