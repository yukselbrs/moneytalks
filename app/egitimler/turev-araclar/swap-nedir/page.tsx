"use client";

import EgitimUstBar from "@/components/egitim/UstBar";
import { Sahne, Satir, Sayac, SoruKarti, IlerlemeRayi, IkizKart, useSahneAktif } from "@/components/egitim/parcalar";
import { DalgaliSabitSVG, KarsiTarafRiskiSVG } from "@/components/egitim/ortak-svg";
import { EvTakasiSVG, ForwardDizisiSVG, FaizSwapSVG, FaizIkonu } from "./svg";
import dynamic from "next/dynamic";

const Simulasyon = dynamic(() => import("./Simulasyon"), {
  ssr: false,
  loading: () => <div className="card-glass" style={{ borderRadius: 12, minHeight: 260, opacity: 0.5 }} />,
});

// "Swap Nedir?" — scroll-driven egitim hikayesi (serinin UCUNCUSU).
// Icerik: docs-vault/02-urun/swap-nedir-icerik-plani.md (7 bolum, birebir).
// Altyapi VIOP/Forward ile ORTAK: components/egitim/parcalar.tsx (rect-tabanli sahne,
// IntersectionObserver DEGIL — bkz. viop-nedir-uygulama.md kritik karari).
// B3 ve B5 Forward Nedir'e ACIK ATIF yapar; sira bu yuzden forward'dan sonradir.

const BOLUMLER = [
  { id: "b1", ad: "Tanıdık senaryo" },
  { id: "b2", ad: "Ev takası" },
  { id: "b3", ad: "Forward dizisi" },
  { id: "b4", ad: "Faiz swap'ı" },
  { id: "b5", ad: "Karşı taraf riski" },
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
        <Satir sira={1}>Toplam <strong style={{ color: "#F1F5F9" }}>33.000 ₺</strong> ödedin. İşlem bitti — <strong style={{ color: "#F1F5F9" }}>tek seferlik</strong> bir alışverişti.</Satir>
        <Satir sira={2}>
          <div className="card-glass" style={{ borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#64748B", margin: 0, textTransform: "uppercase" }}>Tek seferde ödediğin</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9", margin: "4px 0 0" }}>
                <Sayac hedef={33000} aktif={aktif} format={tl} />
              </p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#93C5FD", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 999, padding: "6px 14px" }}>
              1 kez
            </span>
          </div>
        </Satir>
        <Satir sira={3}>Şimdi bunu değiştireceğiz: ya tek seferlik değil de, aylarca <strong style={{ color: "#F1F5F9" }}>tekrar eden</strong> bir anlaşma olsaydı?</Satir>
        <SoruKarti sira={4}
          soru="Buraya kadar tanıdık mı?"
          secenekler={["Evet, devam", "Kısaca hatırlat"]}
          geriBildirim={i => i === 0
            ? "Güzel — şimdi işin tekrar eden kısmına geçiyoruz."
            : "Kısa özet: hisse aldığında parayı bir kez verir, hisseyi bir kez alırsın; alışveriş orada biter. Swap'ta ise anlaşma aylarca sürer ve taraflar birbirine düzenli ödeme yapar. Şimdi devam."}
        />
      </Sahne>
    </div>
  );
}

function Bolum2() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b2" etiket="Bölüm 2 / 7" baslik="Günlük hayat: ev takası">
        <Satir sira={0}>İstanbul&apos;da eviniz var. Arkadaşınızın da İzmir&apos;de.</Satir>
        <Satir sira={1}>Altı aylığına takas ediyorsunuz: sen onun evinde otur, o senin evinde otursun.</Satir>
        <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
          <EvTakasiSVG aktif={aktif} />
        </Satir>
        <Satir sira={3}>Mülkiyet değişmiyor — evler yine sizin. Değişen şey, altı ay boyunca <strong style={{ color: "#F1F5F9" }}>kimin neyi kullandığı</strong>.</Satir>
        <Satir sira={4}>Süre bitince herkes kendi evine döner.</Satir>
        <Satir sira={5}>
          <UyariKutusu>
            Swap&apos;ın mantığı tam olarak bu: sahip olduğun şeyi değil, ondan doğan <strong>akışı</strong> belirli bir süre için takas edersin.
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
      <Sahne id="b3" etiket="Bölüm 3 / 7" baslik="Swap aslında arka arkaya dizilmiş forward'lardır">
        <Satir sira={0}>
          <strong style={{ color: "#F1F5F9" }}>Forward Nedir</strong>&apos;de öğrendiğin şeyi hatırla: bugünden anlaşıp, ileri bir tarihte tek seferlik alışveriş yapıyordun.
        </Satir>
        <Satir sira={1}>Swap bunun tekrar edeni: tek vade yerine <strong style={{ color: "#F1F5F9" }}>birçok vade</strong>. Her üç ayda bir, bir yıl boyunca.</Satir>
        <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
          <ForwardDizisiSVG aktif={aktif} />
        </Satir>
        <Satir sira={3}>Yani swap ≈ arka arkaya dizilmiş forward&apos;lar.</Satir>
        <Satir sira={4}>Tek fark: hepsini tek bir sözleşmede, tek bir anlaşmayla kuruyorsun.</Satir>
        <SoruKarti sira={5}
          soru="Peki swap borsada mı işlem görür, taraflar arasında mı?"
          secenekler={["Borsada", "Taraflar arasında", "Emin değilim"]}
          dogruIndex={1}
          geriBildirim={i => i === 1
            ? "Doğru — forward gibi swap de tezgâh üstü (OTC) bir üründür."
            : "Taraflar arasında: forward gibi swap de tezgâh üstü (OTC) bir üründür, borsada işlem görmez. Bunun bedelini birazdan göreceğiz."}
        />
      </Sahne>
    </div>
  );
}

function Bolum4() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b4" etiket="Bölüm 4 / 7" baslik="En yaygın örnek: faiz swap'ı">
        <Satir sira={0}>Ayşe&apos;nin kredisi <strong style={{ color: "#FCD34D" }}>değişken</strong> faizli. Faiz yükselirse ödemesi artıyor — bu belirsizlik onu rahatsız ediyor.</Satir>
        <Satir sira={1}>Mehmet&apos;in kredisi <strong style={{ color: "#93C5FD" }}>sabit</strong> faizli. O ise faizlerin düşeceğini düşünüyor, sabit ödemeye takılı kalmak istemiyor.</Satir>
        <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
          <FaizSwapSVG aktif={aktif} />
        </Satir>
        <Satir sira={3}>İkisi anlaşır: Ayşe bundan sonra sabit öder, Mehmet değişken. <strong style={{ color: "#F1F5F9" }}>Faiz swap&apos;ı</strong> budur.</Satir>
        <Satir sira={4}>Krediler yerinde duruyor — bankalar değişmedi. Değişen sadece aralarındaki <strong style={{ color: "#F1F5F9" }}>ödeme akışı</strong>.</Satir>
        <Satir sira={5}>
          <IkizKart aktif={aktif}
            sol={{ baslik: "Sabit ödeyen", satirlar: [["Her çeyrek", "%40 / 4"], ["Aldığı", "O dönemin faizi"], ["Ödemesi", "Öngörülebilir"]] }}
            sag={{ baslik: "Değişken ödeyen", ton: "kar", satirlar: [["Her çeyrek", "O dönemin faizi"], ["Aldığı", "%40 / 4"], ["Ödemesi", "Dalgalı"]] }}
          />
        </Satir>
        <Satir sira={6}>
          <UyariKutusu>
            Ana para <strong>1.000.000 ₺</strong> — buna <strong>nominal</strong> denir. Nominal taraflar arasında el değiştirmez, yalnızca hesap için kullanılır. El değiştiren tek şey ödeme farkıdır.
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
      <Sahne id="b5" etiket="Bölüm 5 / 7" baslik="Karşı taraf riski — yine" ton="uyari">
        <Satir sira={0}>Swap da forward gibi <strong style={{ color: "#FCD34D" }}>tezgâh üstü (OTC)</strong> bir üründür. Borsada işlem görmez.</Satir>
        <Satir sira={1} style={{ display: "flex", justifyContent: "center" }}>
          <KarsiTarafRiskiSVG aktif={aktif} />
        </Satir>
        <Satir sira={2}>
          Yani <strong style={{ color: "#F1F5F9" }}>Forward Nedir</strong>&apos;de gördüğün risk burada da var: karşı taraf sözünü tutmazsa, elinde sadece bir anlaşma kalır.
        </Satir>
        <Satir sira={3}>Üstelik swap&apos;ta bu risk <strong style={{ color: "#F1F5F9" }}>daha uzun sürer</strong> — forward tek vadede biter, swap aylarca hatta yıllarca devam eder.</Satir>
        <Satir sira={4}>Her ödeme tarihi, karşı tarafın yükümlülüğünü yerine getirmesi gereken yeni bir andır.</Satir>
        <Satir sira={5}>
          <UyariKutusu ton="uyari">
            Kurumsal swap&apos;larda taraflar genelde çerçeve sözleşme ve teminat şartı koyar. Bu zorunlu değil, anlaşmaya bağlıdır.
          </UyariKutusu>
        </Satir>
      </Sahne>
    </div>
  );
}

function Bolum6() {
  const { ref, aktif } = useSahneAktif();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <Sahne id="b6" etiket="Bölüm 6 / 7" baslik="Peki swap neden var?">
        <Satir sira={0}>Bir şirket düşün: 10 milyon ₺ değişken faizli kredisi var.</Satir>
        <Satir sira={1}>Faiz yükselirse ödemesi artar; bütçesini kuramaz, fiyatlamasını yapamaz.</Satir>
        <Satir sira={2} style={{ display: "flex", justifyContent: "center" }}>
          <DalgaliSabitSVG aktif={aktif} ikon={FaizIkonu}
            aria="Dalgalı faiz seyrine karşı swap ile sabitlenen ödeme"
            ustEtiket="faiz: belirsiz" altEtiket="swap sonrası: sabit" />
        </Satir>
        <Satir sira={3}>Swap ile sabit tarafa geçer: artık her ay ne ödeyeceğini bilir.</Satir>
        <Satir sira={4}>Amaç kazanç değil, <strong style={{ color: "#F1F5F9" }}>belirsizliği azaltmak</strong> — buğdayını bugünden fiyatlayan çiftçiyle aynı mantık.</Satir>
        <Satir sira={5}>
          <UyariKutusu>
            Üçünü birlikte düşün: <strong>VİOP</strong> borsada standart kontrat, <strong>forward</strong> taraflar arası tek seferlik anlaşma,
            <strong> swap</strong> ise taraflar arası tekrar eden anlaşma. Üçü de aynı soruyu yanıtlıyor:
            geleceğin belirsizliğini bugünden nasıl yönetirim?
          </UyariKutusu>
        </Satir>
      </Sahne>
    </div>
  );
}

function Bolum7() {
  return (
    <Sahne id="b7" etiket="Bölüm 7 / 7" baslik="Şimdi sen dene">
      <Satir sira={0}>Bir faiz swap&apos;ı kur, dört çeyreği ilerlet ve nasıl sonuçlandığını gör.</Satir>
      <Satir sira={1}><Simulasyon /></Satir>
    </Sahne>
  );
}

export default function SwapNedirPage() {
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
          <h1 style={{ fontSize: "clamp(30px, 6vw, 44px)", fontWeight: 800, color: "#F1F5F9", letterSpacing: "-1px", margin: "10px 0 14px" }}>Swap Nedir?</h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "#94A3B8", margin: 0 }}>
            Nakit akışı takası, faiz swap&apos;ı ve karşı taraf riski — bildiğin bir hisseden (THYAO) yola çıkıp 7 kısa adımda anlatacağız. Aşağı kaydır.
          </p>
          <p style={{ fontSize: 12, color: "#64748B", marginTop: 18, lineHeight: 1.6 }}>
            ⚠️ Bu içerik eğitim amaçlıdır; yatırım tavsiyesi değildir. Swap sözleşmeleri tezgâh üstü (OTC) ürünlerdir; karşı taraf riski taşır.
          </p>
          <div aria-hidden style={{ marginTop: 26, color: "#475569", fontSize: 22 }}>↓</div>
        </div>
      </section>

      <Bolum1 /><Bolum2 /><Bolum3 /><Bolum4 /><Bolum5 /><Bolum6 /><Bolum7 />

      <footer style={{ padding: "34px 20px 46px", textAlign: "center" }}>
        <p style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
          Bu içerik eğitim amaçlıdır; yatırım tavsiyesi değildir. Swap sözleşmeleri tezgâh üstü (OTC) ürünlerdir;
          merkezi takas kurumu bulunmadığı için karşı taraf riski taşır. Örnek rakamlar temsilidir. © ParaKonuşur
        </p>
      </footer>
    </div>
  );
}
