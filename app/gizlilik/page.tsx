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

export default function GizlilikPage() {
  return (
    <PageWrapper title="Gizlilik Politikası" subtitle="Son güncelleme: Mayıs 2026">
      <Section title="1. Genel Bilgi">
        <p>ParaKonuşur olarak gizliliğinize önem veriyoruz. Bu politika, parakonusur.com adresini ziyaret ettiğinizde veya hizmetlerimizi kullandığınızda hangi verileri topladığımızı, nasıl kullandığımızı ve koruduğumuzu açıklamaktadır.</p>
      </Section>
      <Section title="2. Topladığımız Veriler">
        <p><strong style={{ color: "#E2E8F0" }}>Doğrudan sağladığınız veriler:</strong> Kayıt sırasında ad, soyad ve e-posta adresinizi alırız. Portföy ve izleme listesi oluşturduğunuzda ilgili hisse bilgilerini saklarız.</p>
        <p style={{ marginTop: 8 }}><strong style={{ color: "#E2E8F0" }}>Otomatik toplanan veriler:</strong> IP adresi, tarayıcı türü, işletim sistemi, ziyaret edilen sayfalar ve oturum süreleri teknik altyapımız tarafından otomatik olarak kaydedilebilir.</p>
        <p style={{ marginTop: 8 }}><strong style={{ color: "#E2E8F0" }}>Çerezler:</strong> Oturum yönetimi ve kullanıcı tercihlerinin hatırlanması amacıyla çerezler kullanılmaktadır. Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz; ancak bu durumda bazı özellikler çalışmayabilir.</p>
      </Section>
      <Section title="3. Verilerin Kullanım Amaçları">
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>Hesabınızı oluşturmak ve yönetmek</li>
          <li style={{ marginBottom: 6 }}>Yapay zeka destekli analiz hizmetlerini sunmak</li>
          <li style={{ marginBottom: 6 }}>Portföy ve izleme listesi özelliklerini çalıştırmak</li>
          <li style={{ marginBottom: 6 }}>Güvenlik açıklarını tespit etmek ve önlemek</li>
          <li style={{ marginBottom: 6 }}>Hizmet kalitesini geliştirmek</li>
          <li style={{ marginBottom: 6 }}>Yasal yükümlülükleri yerine getirmek</li>
        </ul>
      </Section>
      <Section title="4. Veri Güvenliği">
        <p>Verileriniz Supabase altyapısında şifrelenmiş olarak saklanmaktadır. Şifreler hiçbir zaman düz metin olarak tutulmaz; bcrypt algoritmasıyla hashlenir. SSL/TLS şifrelemesi tüm veri transferlerinde kullanılmaktadır. Bununla birlikte, internet üzerinden hiçbir iletimin %100 güvenli olmadığını hatırlatırız.</p>
      </Section>
      <Section title="5. Üçüncü Taraf Hizmetler">
        <p>Hizmetlerimizi sunarken aşağıdaki üçüncü taraf sağlayıcılarla çalışmaktayız. Bu sağlayıcıların kendi gizlilik politikaları mevcuttur:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>Supabase — Veritabanı ve kimlik doğrulama</li>
          <li style={{ marginBottom: 6 }}>Vercel — Uygulama barındırma</li>
          <li style={{ marginBottom: 6 }}>Anthropic — Yapay zeka analiz motoru</li>
          <li style={{ marginBottom: 6 }}>Resend — E-posta hizmeti</li>
          <li style={{ marginBottom: 6 }}>Yahoo Finance — Finansal veri sağlayıcısı</li>
        </ul>
      </Section>
      <Section title="6. Veri Saklama ve Silme">
        <p>Verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızı sildiğinizde kişisel verileriniz 30 gün içinde sistemlerimizden kalıcı olarak silinir. Yasal yükümlülükler kapsamında tutulması gereken veriler bu sürenin dışında tutulabilir.</p>
      </Section>
      <Section title="7. Çocukların Gizliliği">
        <p>Hizmetlerimiz 18 yaş altındaki kişilere yönelik değildir. 18 yaş altında olduğunu bildiğimiz kişilere ait verileri toplamıyor ve işlemiyoruz.</p>
      </Section>
      <Section title="8. Politika Değişiklikleri">
        <p>Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler olması durumunda kayıtlı e-posta adresinize bildirim göndeririz. Güncel politikayı bu sayfadan takip edebilirsiniz.</p>
      </Section>
      <Section title="9. İletişim">
        <p>Gizlilik politikamıza ilişkin sorularınız için hello@parakonusur.com adresine ulaşabilirsiniz.</p>
      </Section>
    </PageWrapper>
  );
}
