import React from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#F1F5F9", marginBottom: 10 }}>{title}</h2>
      <div style={{ color: "#94A3B8", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

function PageWrapper({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0B1220", minHeight: "100vh", padding: "48px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#F8FAFC", marginBottom: 8 }}>{title}</h1>
          <p style={{ fontSize: 13, color: "#475569" }}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function KVKKPage() {
  return (
    <PageWrapper title="KVKK Aydınlatma Metni" subtitle="Son güncelleme: Mayıs 2026">
      <Section title="1. Veri Sorumlusu">
        <p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla Barış Yüksel ve Kaan İlgin (bundan sonra "ParaKonuşur" veya "Biz" olarak anılacaktır) tarafından kişisel verileriniz aşağıda açıklanan amaçlar doğrultusunda işlenmektedir. İletişim: hello@parakonusur.com</p>
      </Section>
      <Section title="2. İşlenen Kişisel Veriler">
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>Kimlik verileri: Ad, soyad, kullanıcı adı</li>
          <li style={{ marginBottom: 6 }}>İletişim verileri: E-posta adresi</li>
          <li style={{ marginBottom: 6 }}>Kullanım verileri: Analiz geçmişi, izleme listesi, portföy bilgileri</li>
          <li style={{ marginBottom: 6 }}>Teknik veriler: IP adresi, tarayıcı türü, cihaz bilgisi, oturum bilgileri</li>
          <li style={{ marginBottom: 6 }}>Finansal tercih verileri: Takip edilen hisseler, portföy içerikleri</li>
        </ul>
      </Section>
      <Section title="3. Kişisel Verilerin İşlenme Amaçları">
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>Üyelik ve kimlik doğrulama işlemlerinin yürütülmesi</li>
          <li style={{ marginBottom: 6 }}>Hizmetlerin sunulması ve kişiselleştirilmesi</li>
          <li style={{ marginBottom: 6 }}>Yapay zeka destekli analiz hizmetlerinin sağlanması</li>
          <li style={{ marginBottom: 6 }}>Sistem güvenliği ve doğrulama süreçleri</li>
          <li style={{ marginBottom: 6 }}>Yasal yükümlülüklerin yerine getirilmesi</li>
          <li style={{ marginBottom: 6 }}>Hizmet kalitesinin artırılması ve teknik sorunların giderilmesi</li>
          <li style={{ marginBottom: 6 }}>Kullanım istatistiklerinin oluşturulması (anonim)</li>
        </ul>
      </Section>
      <Section title="4. Hukuki Dayanak">
        <p>Kişisel verileriniz; KVKK Madde 5/2-a (kanunlarda açıkça öngörülmesi), Madde 5/2-c (sözleşmenin kurulması veya ifası), Madde 5/2-ç (hukuki yükümlülük) ve Madde 5/2-f (meşru menfaat) hukuki dayanaklarına göre işlenmektedir. Açık rıza gerektiren işlemler için ayrıca onayınız alınmaktadır.</p>
      </Section>
      <Section title="5. Kişisel Verilerin Aktarımı">
        <p>Kişisel verileriniz aşağıdaki üçüncü taraflara aktarılabilmektedir:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>Supabase Inc. — Veritabanı ve kimlik doğrulama altyapısı (ABD, GDPR uyumlu)</li>
          <li style={{ marginBottom: 6 }}>Vercel Inc. — Uygulama barındırma hizmeti (ABD, GDPR uyumlu)</li>
          <li style={{ marginBottom: 6 }}>Resend Inc. — E-posta iletişim hizmeti (ABD, GDPR uyumlu)</li>
          <li style={{ marginBottom: 6 }}>Anthropic Inc. — Yapay zeka analiz hizmeti (ABD, GDPR uyumlu)</li>
          <li style={{ marginBottom: 6 }}>Yasal yükümlülükler kapsamında ilgili kamu kurum ve kuruluşları</li>
        </ul>
      </Section>
      <Section title="6. Kişisel Verilerin Saklanma Süresi">
        <p>Kişisel verileriniz, üyelik süreniz boyunca ve üyeliğin sona ermesinden itibaren yasal yükümlülükler kapsamında en fazla 3 yıl süreyle saklanmaktadır. Analiz geçmişi ve portföy verileri hesap silme talebi üzerine derhal silinmektedir.</p>
      </Section>
      <Section title="7. KVKK Kapsamındaki Haklarınız">
        <p>KVKK Madde 11 uyarınca aşağıdaki haklara sahipsiniz:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li style={{ marginBottom: 6 }}>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li style={{ marginBottom: 6 }}>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li style={{ marginBottom: 6 }}>Yurt içi veya yurt dışında aktarıldığı üçüncü kişileri öğrenme</li>
          <li style={{ marginBottom: 6 }}>Eksik veya yanlış işlenmişse düzeltilmesini talep etme</li>
          <li style={{ marginBottom: 6 }}>KVKK Madde 7 kapsamında silinmesini veya yok edilmesini talep etme</li>
          <li style={{ marginBottom: 6 }}>İşlemenin otomatik sistemler aracılığıyla yapılması halinde ortaya çıkan aleyhine sonuca itiraz etme</li>
          <li style={{ marginBottom: 6 }}>Zararın giderilmesini talep etme</li>
        </ul>
      </Section>
      <Section title="8. Başvuru Yöntemi">
        <p>Haklarınıza ilişkin taleplerinizi hello@parakonusur.com adresine e-posta göndererek veya profil sayfanızdaki "Hesabı Sil" seçeneğini kullanarak iletebilirsiniz. Talepler 30 gün içinde yanıtlanacaktır.</p>
      </Section>
    </PageWrapper>
  );
}
