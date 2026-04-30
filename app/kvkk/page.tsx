import React from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#F1F5F9", marginBottom: 10 }}>{title}</h2>
      <div style={{ color: "#94A3B8", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export default function KVKKPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E2E8F0", padding: "60px 24px", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/" style={{ color: "#3B82F6", textDecoration: "none", fontSize: 14 }}>← Ana Sayfa</a>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 8px" }}>KVKK Aydınlatma Metni</h1>
        <p style={{ color: "#64748B", marginBottom: 40 }}>Son güncelleme: Mayıs 2026</p>
        <Section title="1. Veri Sorumlusu">
          <p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla ParaKonuşur (parakonusur.com) olarak kişisel verilerinizi işlemekteyiz. İletişim: hello@parakonusur.com</p>
        </Section>
        <Section title="2. İşlenen Kişisel Veriler">
          <ul>
            <li>Kimlik ve iletişim bilgileri: Ad, e-posta adresi</li>
            <li>Hesap bilgileri: Kullanıcı adı, profil fotoğrafı (isteğe bağlı), hesap oluşturma tarihi</li>
            <li>Platform kullanım verileri: Portföy girişleri, izleme listesi, fiyat alarmaları, yapay zekâ analiz geçmişi</li>
            <li>Teknik veriler: IP adresi, tarayıcı türü, oturum bilgileri</li>
            <li>İletişim tercihleri: E-posta bildirim ayarları</li>
          </ul>
        </Section>
        <Section title="3. Kişisel Verilerin İşlenme Amaçları">
          <ul>
            <li>Kullanıcı hesabının oluşturulması ve yönetilmesi</li>
            <li>Hisse analizi, portföy takibi ve fiyat alarm hizmetlerinin sunulması</li>
            <li>Yapay zekâ destekli analiz özelliklerinin çalıştırılması</li>
            <li>E-posta bildirimleri ve platform duyurularının iletilmesi</li>
            <li>Hizmet güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi</li>
          </ul>
        </Section>
        <Section title="4. Hukuki Dayanak">
          <p>Kişisel verileriniz; sözleşmenin ifası (KVKK m. 5/2-c), meşru menfaat (KVKK m. 5/2-f) ve açık rıza (KVKK m. 5/1) hukuki sebeplerine dayanılarak işlenmektedir.</p>
        </Section>
        <Section title="5. Kişisel Verilerin Aktarımı">
          <ul>
            <li>Supabase Inc. — veritabanı ve kimlik doğrulama altyapısı</li>
            <li>Resend Inc. — e-posta gönderim altyapısı</li>
            <li>Vercel Inc. — uygulama barındırma altyapısı</li>
            <li>Anthropic, Inc. — yapay zekâ analiz altyapısı</li>
          </ul>
          <p>Verileriniz ticari amaçla üçüncü taraflarla paylaşılmamaktadır.</p>
        </Section>
        <Section title="6. Kişisel Verilerin Saklanma Süresi">
          <p>Verileriniz hesabınız aktif olduğu sürece saklanır. Hesap silme talebinde bulunmanız halinde 30 gün içinde silinir.</p>
        </Section>
        <Section title="7. KVKK Kapsamındaki Haklarınız">
          <ul>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
            <li>Silinmesini veya yok edilmesini isteme</li>
            <li>Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme</li>
          </ul>
        </Section>
        <Section title="8. Başvuru Yöntemi">
          <p>Haklarınızı kullanmak için hello@parakonusur.com adresine e-posta gönderebilirsiniz. Talepler en geç 30 gün içinde yanıtlanır.</p>
        </Section>
      </div>
    </div>
  );
}
