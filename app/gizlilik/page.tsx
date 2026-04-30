export default function GizlilikPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E2E8F0", padding: "60px 24px", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/" style={{ color: "#3B82F6", textDecoration: "none", fontSize: 14 }}>← Ana Sayfa</a>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 8px" }}>Gizlilik Politikası</h1>
        <p style={{ color: "#64748B", marginBottom: 40 }}>Son güncelleme: Mayıs 2026</p>

        {[
          {
            title: "1. Toplanan Veriler",
            text: "ParaKonuşur, aşağıdaki kişisel verileri toplar:

• Ad ve e-posta adresi (hesap oluşturma)
• Profil fotoğrafı (isteğe bağlı)
• Portföy girişleri, izleme listesi ve fiyat alarmaları
• Yapay zekâ analiz geçmişi
• IP adresi, tarayıcı türü ve oturum bilgileri
• Çerezler aracılığıyla toplanan kullanım verileri"
          },
          {
            title: "2. Verilerin Kullanımı",
            text: "Toplanan veriler aşağıdaki amaçlarla kullanılır:

• Hizmetin sunulması ve hesap yönetimi
• Yapay zekâ destekli analiz özelliklerinin çalıştırılması
• E-posta bildirimleri ve fiyat alarmlarının iletilmesi
• Platform performansının ölçülmesi ve iyileştirilmesi
• Yasal yükümlülüklerin yerine getirilmesi

Verileriniz üçüncü taraflara satılmaz."
          },
          {
            title: "3. Üçüncü Taraf Hizmetler",
            text: "Platform aşağıdaki üçüncü taraf hizmetleri kullanmaktadır:

• Supabase Inc. — veritabanı ve kimlik doğrulama
• Resend Inc. — e-posta gönderimi
• Vercel Inc. — uygulama barındırma
• Anthropic, Inc. — yapay zekâ analiz altyapısı
• Google Analytics — anonim kullanım istatistikleri

Bu hizmetlerin her birinin kendi gizlilik politikaları mevcuttur."
          },
          {
            title: "4. Çerezler",
            text: "Platform aşağıdaki çerez kategorilerini kullanır:

• Zorunlu çerezler: Oturum yönetimi ve güvenlik için gereklidir, devre dışı bırakılamaz.
• Analitik çerezler: Google Analytics aracılığıyla anonim kullanım verileri toplanır. Bu çerezleri tarayıcı ayarlarınızdan reddedebilirsiniz.

Platformu kullanmaya devam etmeniz, zorunlu çerezlerin kullanımına onay verdiğiniz anlamına gelir. Analitik çerezler için ayrıca onayınız alınır."
          },
          {
            title: "5. Veri Güvenliği",
            text: "Verileriniz 256-bit SSL/TLS şifreleme ile korunur. Supabase altyapısı üzerinde güvenli biçimde saklanır. Erişim, Row Level Security (RLS) politikaları ile yalnızca hesap sahibiyle sınırlıdır. Veri ihlali tespit edilmesi halinde yasal süreler içinde bilgilendirme yapılır."
          },
          {
            title: "6. Veri Saklama ve Silme",
            text: "Verileriniz hesabınız aktif olduğu sürece saklanır. Hesap silme talebinde bulunmanız halinde verileriniz 30 gün içinde sistemlerimizden kalıcı olarak silinir. Hesap silme talebi için hello@parakonusur.com adresine e-posta gönderebilirsiniz."
          },
          {
            title: "7. KVKK Kapsamındaki Haklarınız",
            text: "6698 sayılı KVKK kapsamında verilerinize erişme, düzeltme, silme ve işlemeyi kısıtlama haklarına sahipsiniz. Detaylı bilgi için KVKK Aydınlatma Metni sayfamızı inceleyebilirsiniz."
          },
          {
            title: "8. İletişim",
            text: "Gizlilik ile ilgili sorularınız için: hello@parakonusur.com"
          },
        ].map(s => (
          <div key={s.title} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#F1F5F9", marginBottom: 10 }}>{s.title}</h2>
            <p style={{ color: "#94A3B8", lineHeight: 1.8, whiteSpace: "pre-line" }}>{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
