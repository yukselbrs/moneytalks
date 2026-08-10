"use client";

import EgitimUstBar from "@/components/egitim/UstBar";
import { Sahne, Satir, Sayac, SoruKarti, IlerlemeRayi, IkizKart, useSahneAktif } from "@/components/egitim/parcalar";
import { AsansorSVG, BugdaySVG, KarsiTarafRiskiSVG } from "@/components/egitim/ortak-svg";
import { FiyatKilidiSVG, BorsaOtcSVG } from "./svg";
import dynamic from "next/dynamic";

const Simulasyon = dynamic(() => import("./Simulasyon"), {
  ssr: false,
  loading: () => <div className="card-glass" style={{ borderRadius: 12, minHeight: 260, opacity: 0.5 }} />,
});

// "Forward Nedir?" — scroll-driven egitim hikayesi.
// Icerik: docs-vault/02-urun/forward-nedir-icerik-plani.md (7 bolum, birebir).
// Altyapi VIOP Nedir ile ORTAK: components/egitim/parcalar.tsx (rect-tabanli sahne,
// IntersectionObserver DEGIL — bkz. viop-nedir-uygulama.md kritik karari).

const BOLUMLER = [
  { id: "b1", ad: "Tanıdık senaryo" },
  { id: "b2", ad: "Fiyatı kilitlemek" },
  { id: "b3", ad: "Özel anlaşma (OTC)" },
  { id: "b4", ad: "Karşı taraf riski" },
  { id: "b5", ad: "Long / Short" },
  { id: "b6", ad: "Neden var?" },
  { id: "b7", ad: "Simülasyon" },
];

const tl = (v: number) => `${Math.round(v).toLocaleString("tr-TR")} ₺`;

function UyariKutusu({ children, ton = "notr" }: { children: React.ReactNode; ton?: "notr" | "uyari" }) {
  const r = ton === "uyari"
    ? { bg: "rgba(245,158,11,0.08)", bd: "rgba(245,158,11,0.3)", tx: "#FCD34D" }
    : { bg: "rgba(59,130,246,0.07)", bd: "rgba(59,130,246,0.25)", tx: "#93C5FD" };
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
      <Sahne id="b1" etiket="Bölüm 1 / 7" baslik="Bildiğin şeyi hatırlayalım">
        <Satir sira={0}>THYAO&apos;dan 100 lot aldın diyelim. Tanesi 330 ₺.</Satir>
        <Satir sira={1}>Toplam <strong style={{ color: "#F1F5F9" }}>33.000 ₺</strong> ödedin. Hisse bugün senin, fiyatı da bugünün fiyatı.</Satir>
        <Satir sira={2}>
          <div className="card-glass" style={{ borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#64748B", margin: 0, textTransform: "uppercase" }}>Bugün ödediğin</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9", margin: "4px 0 0" }}>
                <Sayac hedef={33000} aktif={aktif} format={tl} />
              </p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#93C5FD", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 999, padding: "6px 14px" }}>
              teslim de bugün
            </span>
          </div>
        </Satir>
        <Satir sira={3}>Alım da teslim de <strong style={{ color: "#F1F5F9" }}>bugün</strong> oldu. Şimdi bunu bozacağız: ya anlaşmayı bugün yapıp teslimi ileriye bıraksaydık?</Satir>
        <SoruKarti sira={4}
          soru="Buraya kadar tanıdık mı?"
          secenekler={["Evet, devam", "Kısaca hatırlat"]}
          geriBildirim={i => i === 0
            ? "Güzel — şimdi zamanı işin içine katıyoruz."
            : "Kısa özet: hisse aldığında parayı bugün verir, hisseyi bugün alırsın. Fiyat sonradan değişirse pozisyonun değeri de değişir. Forward'da ise anlaşma bugün, alışveriş ileride olur. Şimdi devam."}
        />
      </Sahne>
    </div>
  );
}

function Bolum2() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b2" etiket="Bölüm 2 / 7" baslik="Fiyatı bugünden kilitlemek">
        <Satir sira={0}>Kahvecinin sahibisin. Çekirdek fiyatı şu an kilosu <strong style={{ color: "#F1F5F9" }}>100 ₺</strong>.</Satir>
        <Satir sira={1}>Üreticiye gidiyorsun: &ldquo;Üç ay sonra 500 kilo alacağım, ama fiyatı <strong style={{ color: "#F1F5F9" }}>bugünden</strong> 100 ₺ konuşalım.&rdquo;</Satir>
        <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
          <FiyatKilidiSVG aktif={aktif} />
        </Satir>
        <Satir sira={3}>El sıkışıyorsunuz. Para da mal da bugün el değiştirmiyor — sadece <strong style={{ color: "#F1F5F9" }}>söz</strong> veriliyor.</Satir>
        <Satir sira={4}>Üç ay sonra çekirdek 130 ₺ olsa da, 80 ₺ olsa da: sizin fiyatınız 100 ₺.</Satir>
        <Satir sira={5}>
          <UyariKutusu>
            VİOP&apos;taki ev kaporası &ldquo;pozisyon açmak&rdquo; içindi. Buradaki el sıkışma ise doğrudan <strong>fiyatı sabitlemek</strong> için — forward&apos;ın tek işi bu.
          </UyariKutusu>
        </Satir>
      </Sahne>
    </div>
  );
}

function Bolum3() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b3" etiket="Bölüm 3 / 7" baslik="Bu bir özel anlaşma">
        <Satir sira={0}>Aynı fikri finansal piyasada yaptığında adı <strong style={{ color: "#F1F5F9" }}>forward sözleşmesi</strong> olur.</Satir>
        <Satir sira={1}>Ama önemli bir fark var: forward <strong style={{ color: "#FCD34D" }}>borsada işlem görmez</strong>. İki taraf kendi aralarında anlaşır. Buna tezgâh üstü (OTC) denir.</Satir>
        <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
          <BorsaOtcSVG aktif={aktif} />
        </Satir>
        <Satir sira={3}>
          <IkizKart aktif={aktif}
            sol={{ baslik: "VİOP", satirlar: [["Nerede", "Borsada"], ["Şartlar", "Standart"], ["Devretmek", "Kolay"]] }}
            sag={{ baslik: "Forward", ton: "kar", satirlar: [["Nerede", "Taraflar arası"], ["Şartlar", "Serbest"], ["Devretmek", "Zor"]] }}
          />
        </Satir>
        <Satir sira={4}>Bu esneklik forward&apos;ın gücü: &ldquo;500 kilo, 12 Ekim, şu kalite&rdquo; diyebilirsin. Borsa kontratında böyle bir özelleştirme yok.</Satir>
        <SoruKarti sira={5}
          soru="Peki bu serbestliğin bir bedeli var mı sence?"
          secenekler={["Var", "Yok", "Emin değilim"]}
          dogruIndex={0}
          geriBildirim={i => i === 0
            ? "Evet — bir sonraki bölüm tam olarak bu bedeli anlatıyor."
            : "Var: aradan borsa çekilince bir güvence de çekiliyor. Sıradaki bölümde göreceğiz."}
        />
      </Sahne>
    </div>
  );
}

function Bolum4() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b4" etiket="Bölüm 4 / 7" baslik="Bedeli: karşı taraf riski" ton="uyari">
        <Satir sira={0}>Üç ay doldu. Çekirdek <strong style={{ color: "#F1F5F9" }}>130 ₺</strong> olmuş. Senin anlaşman 100 ₺.</Satir>
        <Satir sira={1}>Üretici bakıyor: sana 100 ₺&apos;den satarsa kilo başına 30 ₺ kaybediyor. Ya sözünü tutmazsa?</Satir>
        <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
          <KarsiTarafRiskiSVG aktif={aktif} />
        </Satir>
        <Satir sira={3}>
          İşte <strong style={{ color: "#FCD34D" }}>karşı taraf riski</strong> bu: anlaşmanın diğer ucundaki kişi yükümlülüğünü yerine getirmezse, elinde sadece bir söz kalır.
        </Satir>
        <Satir sira={4}>
          VİOP&apos;ta bu risk yoktur — çünkü araya <strong style={{ color: "#93C5FD" }}>takas kurumu</strong> girer. Herkesin karşı tarafı borsadır; teminat sistemi de bunun için vardır.
        </Satir>
        <Satir sira={5}>
          <UyariKutusu ton="uyari">
            Forward&apos;da güvence tarafların anlaşmasına bağlıdır. Bazı forward&apos;larda taraflar kendi aralarında teminat/garanti şartı koyar; bu zorunlu değil, pazarlık konusudur.
          </UyariKutusu>
        </Satir>
      </Sahne>
    </div>
  );
}

function Bolum5() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b5" etiket="Bölüm 5 / 7" baslik="Long ve short — iki taraf">
        <Satir sira={0}>Forward&apos;da da her anlaşmanın iki tarafı vardır.</Satir>
        <Satir sira={1} style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
          <AsansorSVG aktif={aktif} yon="long" />
          <AsansorSVG aktif={aktif} yon="short" />
        </Satir>
        <Satir sira={2}>
          <strong style={{ color: "#10B981" }}>Uzun taraf (long):</strong> ileride almayı taahhüt eder. Fiyat yükselirse pozisyonu değer kazanır — düşük fiyattan alma sözü elindedir.
        </Satir>
        <Satir sira={3}>
          <strong style={{ color: "#10B981" }}>Kısa taraf (short):</strong> ileride satmayı taahhüt eder. Fiyat düşerse pozisyonu değer kazanır — yüksek fiyattan satma sözü elindedir.
        </Satir>
        <Satir sira={4}>Kahveci sensin: alacaksın, yani long&apos;sun. Üretici short.</Satir>
        <Satir sira={5}>
          <UyariKutusu>Birinin kazancı diğerinin kaybıdır. Forward sıfır toplamlıdır.</UyariKutusu>
        </Satir>
      </Sahne>
    </div>
  );
}

function Bolum6() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b6" etiket="Bölüm 6 / 7" baslik="Peki forward neden var?">
        <Satir sira={0}>Çiftçi hasadı Eylül&apos;de kaldıracak. Buğday fiyatı o güne kadar ne olur, bilmiyor.</Satir>
        <Satir sira={1} style={{ display: "flex", justifyContent: "center" }}>
          <BugdaySVG aktif={aktif} />
        </Satir>
        <Satir sira={2}>Bugünden &ldquo;Eylül&apos;de şu fiyata satarım&rdquo; diye anlaşırsa, fiyat düşse de geliri bellidir.</Satir>
        <Satir sira={3}>Forward&apos;ın asıl amacı budur: kazanç değil, <strong style={{ color: "#F1F5F9" }}>belirsizliği azaltmak</strong>.</Satir>
        <Satir sira={4}>
          <UyariKutusu>
            Forward bu fikrin en eski ve en basit hali; yüzyıllardır tüccarlar arasında yapılıyor.
            VİOP ise aynı fikrin <strong>kurumsallaşmış</strong> hali: borsaya taşınmış, standartlaştırılmış,
            teminat ve takas sistemiyle karşı taraf riski ortadan kaldırılmış. İkisi rakip değil — biri diğerinin evrimi.
          </UyariKutusu>
        </Satir>
      </Sahne>
    </div>
  );
}

function Bolum7() {
  return (
    <Sahne id="b7" etiket="Bölüm 7 / 7" baslik="Şimdi sen dene">
      <Satir sira={0}>Bir forward anlaşması yap, vadeyi bekle ve ne olduğunu gör.</Satir>
      <Satir sira={1}><Simulasyon /></Satir>
    </Sahne>
  );
}

export default function ForwardNedirPage() {
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

      <EgitimUstBar kategoriSlug="turev-araclar" />
      <IlerlemeRayi bolumler={BOLUMLER} />

      <section style={{ minHeight: "72svh", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 640 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(96,165,250,0.75)", margin: 0 }}>İnteraktif Rehber</p>
          <h1 style={{ fontSize: "clamp(30px, 6vw, 44px)", fontWeight: 800, color: "#F1F5F9", letterSpacing: "-1px", margin: "10px 0 14px" }}>Forward Nedir?</h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "#94A3B8", margin: 0 }}>
            Fiyatı bugünden kilitlemek, tezgâh üstü (OTC) anlaşmalar ve karşı taraf riski — bildiğin bir hisseden (THYAO) yola çıkıp 7 kısa adımda anlatacağız. Aşağı kaydır.
          </p>
          <p style={{ fontSize: 12, color: "#64748B", marginTop: 18, lineHeight: 1.6 }}>
            ⚠️ Bu içerik eğitim amaçlıdır; yatırım tavsiyesi değildir. Forward sözleşmeleri tezgâh üstü (OTC) ürünlerdir; karşı taraf riski taşır.
          </p>
          <div aria-hidden style={{ marginTop: 26, color: "#475569", fontSize: 22 }}>↓</div>
        </div>
      </section>

      <Bolum1 /><Bolum2 /><Bolum3 /><Bolum4 /><Bolum5 /><Bolum6 /><Bolum7 />

      <footer style={{ padding: "34px 20px 46px", textAlign: "center" }}>
        <p style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
          Bu içerik eğitim amaçlıdır; yatırım tavsiyesi değildir. Forward sözleşmeleri tezgâh üstü (OTC) ürünlerdir;
          merkezi takas kurumu bulunmadığı için karşı taraf riski taşır. Örnek rakamlar temsilidir. © ParaKonuşur
        </p>
      </footer>
    </div>
  );
}
