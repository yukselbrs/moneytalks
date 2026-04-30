import React from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#F1F5F9", marginBottom: 10 }}>{title}</h2>
      <div style={{ color: "#94A3B8", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export default function GizlilikPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E2E8F0", padding: "60px 24px", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/" style={{ color: "#3B82F6", textDecoration: "none", fontSize: 14 }}>Ana Sayfa</a>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 8px" }}>Gizlilik Politikası</h1>
        <p style={{ color: "#64748B", marginBottom: 40 }}>Son güncelleme: Mayıs 2026</p>
        <Section title="1. Toplanan Veriler">
          <ul>
            <li>Ad ve e-posta adresi (hesap oluşturma)</li>
            <li>Profil fotoğrafı (isteğe bağlı)</li>
            <li>Portföy girişleri, izleme listesi ve fiyat alarmaları</li>
            <li>Yapay zekâ analiz geçmişi</li>
            <li>IP adresi, tarayıcı türü ve oturum bilgileri</li>
          </ul>
        </Section>
        <Section title="2. Verilerin Kullanımı">
          <ul>
            <li>Hizmetin sunulması ve hesap yönetimi</li>
            <li>Yapay zekâ destekli analiz özelliklerinin çalıştırılması</li>
            <li>E-posta bildirimleri ve fiyat alarmlarının iletilmesi</li>
            <li>Platform performansının ölçülmesi ve iyileştirilmesi</li>
            <li>Verileriniz üçüncü taraflara satılmaz.</li>
          </ul>
        </Section>
        <Section title="3. Üçüncü Taraf Hizmetler">
          <ul>
            <li>Supabase Inc. — veritabanı ve kimlik doğrulama</li>
            <li>Resend Inc. — e-posta gönderimi</li>
            <li>Vercel Inc. — uygulama barındırma</li>
            <li>Anthropic, Inc. — yapay zekâ analiz altyapısı</li>
            <li>Google Analytics — anonim kullanım istatistikleri</li>
          </ul>
        </Section>
        <Section title="4. Çerezler">
          <ul>
            <li>Zorunlu çerezler: Oturum yönetimi için gereklidir, devre dışı bırakılamaz.</li>
            <li>Analitik çerezler: Google Analytics aracılığıyla anonim veriler toplanır. Tarayıcı ayarlarınızdan reddedebilirsiniz.</li>
          </ul>
        </Section>
        <Section title="5. Veri Güvenliği">
          <p>Verileriniz 256-bit SSL/TLS şifreleme ile korunur. Erişim yalnızca hesap sahibiyle sınırlıdır.</p>
        </Section>
        <Section title="6. Veri Saklama ve Silme">
          <p>Hesabınız aktif olduğu sürece verileriniz saklanır. Hesap silme talebinde 30 gün içinde kalıcı olarak silinir. Talep için: hello@parakonusur.com</p>
        </Section>
        <Section title="7. İletişim">
          <p>Gizlilik ile ilgili sorularınız için: hello@parakonusur.com</p>
        </Section>
      </div>
    </div>
  );
}
