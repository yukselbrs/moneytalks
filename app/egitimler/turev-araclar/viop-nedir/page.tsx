"use client";

import EgitimUstBar from "@/components/egitim/UstBar";
import { Sahne, Satir, Sayac, SoruKarti, IlerlemeRayi, IkizKart, useSahneAktif } from "@/components/egitim/parcalar";
import { KaporaHalkaSVG, DireksiyonSVG, TeminatKartSVG, SuBardagiSVG, AsansorSVG, BugdaySVG } from "./svg";
import dynamic from "next/dynamic";

const Simulasyon = dynamic(() => import("./Simulasyon"), {
  ssr: false,
  loading: () => <div className="card-glass" style={{ borderRadius: 12, minHeight: 260, opacity: 0.5 }} />,
});

// "VIOP Nedir?" — scroll-driven egitim hikayesi.
// Icerik: docs-vault/02-urun/viop-nedir-icerik-plani.md (11 bolum, birebir).
// ASAMA DURUMU: B1-B6 tam animasyonlu; B7-B10 metin + basit vurgu (set-piece SVG'ler asama 3-4);
// B11 simulasyon asama 5'te — su an "hazirlaniyor" karti.

const BOLUMLER = [
  { id: "b1", ad: "Tanıdık senaryo" },
  { id: "b2", ad: "Kapora" },
  { id: "b3", ad: "Teminat" },
  { id: "b4", ad: "Kaldıraç" },
  { id: "b5", ad: "Kâr" },
  { id: "b6", ad: "Zarar" },
  { id: "b7", ad: "Teminat çağrısı" },
  { id: "b8", ad: "Long" },
  { id: "b9", ad: "Short" },
  { id: "b10", ad: "Neden var?" },
  { id: "b11", ad: "Simülasyon" },
];

const tl = (v: number) => `${Math.round(v).toLocaleString("tr-TR")} ₺`;

function UyariKutusu({ children, ton = "notr" }: { children: React.ReactNode; ton?: "notr" | "uyari" }) {
  const r = ton === "uyari" ? { bg: "rgba(245,158,11,0.08)", bd: "rgba(245,158,11,0.3)", tx: "#FCD34D" } : { bg: "rgba(59,130,246,0.07)", bd: "rgba(59,130,246,0.25)", tx: "#93C5FD" };
  return (
    <div style={{ background: r.bg, border: `1px solid ${r.bd}`, borderRadius: 10, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.65, color: r.tx }}>
      {children}
    </div>
  );
}

function Bolum1() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b1" etiket="Bölüm 1 / 11" baslik="Bildiğin şeyi hatırlayalım">
        <Satir sira={0}>THYAO&apos;dan 100 lot aldın diyelim. Tanesi 330 ₺.</Satir>
        <Satir sira={1}>Toplam <strong style={{ color: "#F1F5F9" }}>33.000 ₺</strong> ödedin. Hisse senin.</Satir>
        <Satir sira={2}>
          <div className="card-glass" style={{ borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#64748B", margin: 0, textTransform: "uppercase" }}>Fiyat 340 ₺ olursa</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9", margin: "4px 0 0" }}>
                <Sayac hedef={34000} aktif={aktif} format={tl} />
              </p>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#10B981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 999, padding: "6px 14px" }}>
              +<Sayac hedef={1000} aktif={aktif} format={v => Math.round(v).toLocaleString("tr-TR")} /> ₺
            </span>
          </div>
        </Satir>
        <SoruKarti sira={3}
          soru="Buraya kadar tanıdık mı?"
          secenekler={["Evet, devam", "Hisse kısmını da özetle"]}
          geriBildirim={i => i === 0
            ? "Güzel — şimdi işin ilginçleşen kısmına geçiyoruz."
            : "Kısa özet: hisse aldığında şirketin ortağı olursun; fiyat yükselirse pozisyonun değerlenir, düşerse değer kaybeder. Ödediğin paranın tamamı baştan cebinden çıkar. Şimdi devam."}
        />
      </Sahne>
    </div>
  );
}

function Bolum2() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b2" etiket="Bölüm 2 / 11" baslik="Ama ya cebindeki para yetmiyorsa?">
        <Satir sira={0}>Bir ev beğendin: <strong style={{ color: "#F1F5F9" }}>3.000.000 ₺</strong>. Ama bugün elinde 300.000 ₺ var.</Satir>
        <Satir sira={1}>Kapora yatırırsın. Ev senin adına &quot;rezerve&quot; olur.</Satir>
        <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
          <KaporaHalkaSVG aktif={aktif} yuzde={10} />
        </Satir>
        <Satir sira={3}>Evin fiyatı sözleşme süresinde değişirse, fark seni etkiler — evin tamamına sahip olmasan bile.</Satir>
      </Sahne>
    </div>
  );
}

function Bolum3() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b3" etiket="Bölüm 3 / 11" baslik="VİOP'un mantığı buna benzer">
        <Satir sira={0}>VİOP&apos;ta hisseyi satın almazsın. Fiyatı üzerine <strong style={{ color: "#F1F5F9" }}>sözleşme</strong> yaparsın.</Satir>
        <Satir sira={1}>33.000 ₺&apos;lik THYAO pozisyonu için tamamını değil, bir <strong style={{ color: "#93C5FD" }}>teminat</strong> yatırırsın — örnekte 3.300 ₺.</Satir>
        <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
          <TeminatKartSVG aktif={aktif} />
        </Satir>
        <Satir sira={3}>Pozisyonun büyüklüğü yine 33.000 ₺. Ama bağladığın para 3.300 ₺.</Satir>
        <Satir sira={4}>
          <UyariKutusu>Teminat oranları sözleşmeye ve piyasa koşullarına göre değişir; bu sayfadaki tüm rakamlar eğitim amaçlı örnektir.</UyariKutusu>
        </Satir>
      </Sahne>
    </div>
  );
}

function Bolum4() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b4" etiket="Bölüm 4 / 11" baslik="Kaldıraç nedir?">
        <Satir sira={0}>Direksiyonu 5 derece çevirirsin; tekerlekler çok daha fazla döner.</Satir>
        <Satir sira={1} style={{ display: "flex", justifyContent: "center" }}>
          <DireksiyonSVG aktif={aktif} />
        </Satir>
        <Satir sira={2}>Kaldıraç budur: fiyattaki küçük hareket, teminatına <strong style={{ color: "#F1F5F9" }}>büyütülmüş</strong> yansır.</Satir>
        <Satir sira={3}>Örneğimizde yaklaşık <strong style={{ color: "#93C5FD" }}>10x</strong>: pozisyon 33.000 ₺ / teminat 3.300 ₺.</Satir>
        <SoruKarti sira={4}
          soru="THYAO %5 yükselirse teminatındaki değişim sence ne olur?"
          secenekler={["~%5", "~%50", "Emin değilim"]}
          dogruIndex={1}
          geriBildirim={i => i === 1
            ? "Tahminin doğru. Bir sonraki bölümde rakamlarla göreceksin."
            : "Cevabı bir sonraki bölümde rakamlarla göreceksin — ipucu: paydadaki para değişti."}
        />
      </Sahne>
    </div>
  );
}

function Bolum5() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b5" etiket="Bölüm 5 / 11" baslik="Kâr neden büyüyor?" ton="kar">
        <Satir sira={0}>THYAO %5 yükseldi: 330 → 346,5 ₺. Aynı hareket, iki dünya:</Satir>
        <Satir sira={1}>
          <IkizKart aktif={aktif}
            sol={{ baslik: "Hisse (33.000 ₺ bağladın)", satirlar: [["Pozisyon", "34.650 ₺"], ["Fark", <span key="f" style={{ color: "#10B981" }}>+1.650 ₺</span>], ["Paranın getirisi", <span key="g" style={{ color: "#10B981" }}>+%5</span>]] }}
            sag={{ baslik: "VİOP (3.300 ₺ bağladın)", ton: "kar", satirlar: [["Pozisyon farkı", <span key="f" style={{ color: "#10B981" }}>+1.650 ₺</span>], ["Teminatın", "3.300 → 4.950 ₺"], ["Teminatına oran", <strong key="g" style={{ color: "#10B981", fontSize: 16 }}>+%50</strong>]] }}
          />
        </Satir>
        <Satir sira={2}>Aynı hareket. Fark: <strong style={{ color: "#F1F5F9" }}>paydadaki para.</strong></Satir>
      </Sahne>
    </div>
  );
}

function Bolum6() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b6" etiket="Bölüm 6 / 11" baslik="Peki zarar?" ton="zarar">
        <Satir sira={0}>Şimdi tersi: THYAO %5 düştü: 330 → 313,5 ₺.</Satir>
        <Satir sira={1}>
          <IkizKart aktif={aktif}
            sol={{ baslik: "Hisse", satirlar: [["Fark", <span key="f" style={{ color: "#EF4444" }}>−1.650 ₺</span>], ["Paranın kaybı", <span key="g" style={{ color: "#EF4444" }}>−%5</span>]] }}
            sag={{ baslik: "VİOP", ton: "zarar", satirlar: [["Pozisyon farkı", <span key="f" style={{ color: "#EF4444" }}>−1.650 ₺</span>], ["Teminatın", "3.300 → 1.650 ₺"], ["Teminatının", <strong key="g" style={{ color: "#EF4444", fontSize: 16 }}>%50&apos;si eridi</strong>]] }}
          />
        </Satir>
        <Satir sira={2}>Kaldıraç yön ayırt etmez. Büyüttüğü şey <strong style={{ color: "#F1F5F9" }}>sonuçtur</strong> — kâr da, zarar da.</Satir>
      </Sahne>
    </div>
  );
}

function Bolum7() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
    <Sahne id="b7" etiket="Bölüm 7 / 11" baslik='Likidasyon değil: "Teminat Tamamlama Çağrısı"' ton="uyari">
      <Satir sira={0}>Teminatın bir alt sınırı var: <strong style={{ color: "#FCD34D" }}>sürdürme teminatı</strong>.</Satir>
      <Satir sira={1} style={{ display: "flex", justifyContent: "center" }}>
        <SuBardagiSVG aktif={aktif} />
      </Satir>
      <Satir sira={2}>Zarar teminatını bu çizginin altına indirirse, aracı kurumdan bir çağrı gelir: <strong style={{ color: "#F1F5F9" }}>teminat tamamlama çağrısı</strong>. İki seçeneğin olur: ek teminat yatırırsın — pozisyon devam eder. Ya da yatırmazsın — pozisyonun kapatılır.</Satir>
      <Satir sira={3}>
        <UyariKutusu ton="uyari">
          ⚠️ Kripto borsalarındaki ani &quot;likidasyon&quot;dan farkı bu: Borsa İstanbul&apos;da önce <strong>çağrı</strong> vardır.
          Ama süresinde tamamlanmazsa sonuç yine pozisyonun kapanmasıdır.
        </UyariKutusu>
      </Satir>
      <SoruKarti sira={4}
        soru="Bardağa su eklemek neyi temsil ediyor olurdu?"
        secenekler={["Ek teminat yatırmak", "Yeni pozisyon açmak"]}
        dogruIndex={0}
        geriBildirim={i => i === 0 ? "Aynen: su seviyesi teminatın; çizginin altına inince ya doldurursun ya bardak boşalır." : "Yeni pozisyon yeni bardak demek olurdu — su eklemek, mevcut teminatı tamamlamaktır."}
      />
    </Sahne>
    </div>
  );
}

function Bolum8() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
    <Sahne id="b8" etiket="Bölüm 8 / 11" baslik="Long — yükseliş yönlü pozisyon" ton="kar">
      <Satir sira={0}>Az önce yaptığın şeyin adı: <strong style={{ color: "#10B981" }}>long</strong>.</Satir>
      <Satir sira={1} style={{ display: "flex", justifyContent: "center" }}>
        <AsansorSVG aktif={aktif} yon="long" />
      </Satir>
      <Satir sira={2}>Asansör yukarı: fiyat yükseldikçe pozisyonun değer kazanır.</Satir>
      <Satir sira={3}>Asansör aşağı inerse aynı mekanizma aleyhine çalışır. (Bölüm 6&apos;yı hatırla.)</Satir>
    </Sahne>
    </div>
  );
}

function Bolum9() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
    <Sahne id="b9" etiket="Bölüm 9 / 11" baslik="Short — düşüşe pozisyon almak">
      <Satir sira={0}>Şimdi ezber bozan kısım: elinde hiç THYAO olmasa bile &quot;düşecek&quot; görüşüne pozisyon açabilirsin.</Satir>
      <Satir sira={1} style={{ display: "flex", justifyContent: "center" }}>
        <AsansorSVG aktif={aktif} yon="short" />
      </Satir>
      <Satir sira={2}>Buna <strong style={{ color: "#93C5FD" }}>short</strong> denir: pozisyonun düşüş yönündedir. Evet, doğru gördün — fiyat inerken pozisyon rozeti yeşil: THYAO düşerse bu pozisyon değer kazanır; yükselirse kaybeder.</Satir>
      <Satir sira={3}>Nasıl oluyor&apos;un mekaniği bu hikayenin konusu değil — kritik fikir şu: <strong style={{ color: "#F1F5F9" }}>VİOP&apos;ta iki yön de bir pozisyondur.</strong></Satir>
      <SoruKarti sira={4}
        soru="THYAO %2 yükseldi. Short pozisyon ne yaptı?"
        secenekler={["Değer kazandı", "Değer kaybetti"]}
        dogruIndex={1}
        geriBildirim={i => i === 1 ? "Doğru: short düşüş yönlüydü; fiyat yükselince pozisyon değer kaybetti." : "Ters: short düşüş yönlüdür — fiyat yükselirse pozisyon değer kaybeder."}
      />
    </Sahne>
    </div>
  );
}

function Bolum10() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
    <Sahne id="b10" etiket="Bölüm 10 / 11" baslik="VİOP neden var?" ton="kar">
      <Satir sira={0}>Bu piyasa spekülasyon için icat edilmedi.</Satir>
      <Satir sira={1}>Bir buğday çiftçisi düşün: hasat 6 ay sonra. Fiyat o güne kadar düşerse emeği eriyecek.</Satir>
      <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
        <BugdaySVG aktif={aktif} />
      </Satir>
      <Satir sira={3}>Bugünden &quot;hasatta şu fiyattan satarım&quot; sözleşmesi yapar. Fiyat sabitlenir; sürpriz ortadan kalkar.</Satir>
      <Satir sira={4}>VİOP&apos;un kökü bu: <strong style={{ color: "#10B981" }}>riskten korunma</strong>. Kaldıraç sonradan gelen bir yan etki — dikkatli kullanılmazsa asıl riskin kendisi.</Satir>
    </Sahne>
    </div>
  );
}

function Bolum11() {
  return (
    <Sahne id="b11" etiket="Bölüm 11 / 11" baslik="Sıra sende: mini simülasyon">
      <Satir sira={0}>
        <Simulasyon />
      </Satir>
    </Sahne>
  );
}

export default function ViopNedirPage() {
  return (
    <div className="dot-grid" style={{ background: "#0B1220", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <style>{`
        .vn-satir { opacity: 0; transform: translateY(14px); transition: opacity 0.55s ease, transform 0.55s ease; }
        [data-aktif="true"] .vn-satir { opacity: 1; transform: none; }
        @media (max-width: 700px) { .vn-ikiz { grid-template-columns: 1fr !important; } .vn-ray { display: none !important; } }
        @media (prefers-reduced-motion: reduce) {
          .vn-satir { opacity: 1 !important; transform: none !important; transition: none !important; }
          .vn-sahne * { transition: none !important; animation: none !important; }
        }
      `}</style>

      {/* ust bar — kategori sekmeleri ortak bilesenden (lib/egitimler config'i) */}
      <EgitimUstBar kategoriSlug="turev-araclar" />

      <IlerlemeRayi bolumler={BOLUMLER} />

      {/* giris */}
      <section style={{ minHeight: "72svh", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 640 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(96,165,250,0.75)", margin: 0 }}>İnteraktif Rehber</p>
          <h1 style={{ fontSize: "clamp(30px, 6vw, 44px)", fontWeight: 800, color: "#F1F5F9", letterSpacing: "-1px", margin: "10px 0 14px" }}>VİOP Nedir?</h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "#94A3B8", margin: 0 }}>
            Kaldıraç, teminat ve long/short — hepsini bildiğin bir hisseden (THYAO) yola çıkıp 11 kısa adımda anlatacağız. Aşağı kaydır.
          </p>
          <p style={{ fontSize: 12, color: "#64748B", marginTop: 18, lineHeight: 1.6 }}>
            ⚠️ Bu içerik eğitim amaçlıdır; yatırım tavsiyesi değildir. VİOP kaldıraçlı üründür; teminatın tamamını kaybetme riski vardır.
          </p>
          <div aria-hidden style={{ marginTop: 26, color: "#475569", fontSize: 22 }}>↓</div>
        </div>
      </section>

      <Bolum1 /><Bolum2 /><Bolum3 /><Bolum4 /><Bolum5 /><Bolum6 /><Bolum7 /><Bolum8 /><Bolum9 /><Bolum10 /><Bolum11 />

      <footer style={{ padding: "34px 20px 46px", textAlign: "center" }}>
        <p style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
          Bu içerik eğitim amaçlıdır; yatırım tavsiyesi değildir. VİOP kaldıraçlı üründür; teminatın tamamını kaybetme riski vardır.
          Örnek rakamlar temsilidir; teminat oranları sözleşmeye göre değişir. © ParaKonuşur
        </p>
      </footer>
    </div>
  );
}
