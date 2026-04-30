export default function KVKKPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E2E8F0", padding: "60px 24px", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/" style={{ color: "#3B82F6", textDecoration: "none", fontSize: 14 }}>← Ana Sayfa</a>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 8px" }}>KVKK Aydınlatma Metni</h1>
        <p style={{ color: "#64748B", marginBottom: 40 }}>Son güncelleme: Mayıs 2026</p>

        {[
          {
            title: "1. Veri Sorumlusu",
            text: "6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatıyla ParaKonuşur (parakonusur.com) olarak kişisel verilerinizi aşağıda açıklanan amaçlar doğrultusunda işlemekteyiz. İletişim: hello@parakonusur.com"
          },
          {
            title: "2. İşlenen Kişisel Veriler",
            text: "Platform üzerinden aşağıdaki kişisel veriler işlenmektedir:

• Kimlik ve iletişim bilgileri: Ad, e-posta adresi
• Hesap bilgileri: Kullanıcı adı, profil fotoğrafı (isteğe bağlı), hesap oluşturma tarihi
• Platform kullanım verileri: Portföy girişleri, izleme listesi, fiyat alarmaları, yapay zekâ analiz geçmişi
• Teknik veriler: IP adresi, tarayıcı türü, oturum bilgileri
• İletişim tercihleri: E-posta bildirim ayarları"
          },
          {
            title: "3. Kişisel Verilerin İşlenme Amaçları",
            text: "Verileriniz aşağıdaki amaçlarla işlenmektedir:

• Kullanıcı hesabının oluşturulması ve yönetilmesi
• Hisse analizi, portföy takibi ve fiyat alarm hizmetlerinin sunulması
• Yapay zekâ destekli analiz özelliklerinin çalıştırılması
• E-posta bildirimleri ve platform duyurularının iletilmesi
• Hizmet güvenliğinin sağlanması ve yasal yükümlülüklerin yerine getirilmesi
• Kullanıcı deneyiminin iyileştirilmesi"
          },
          {
            title: "4. Hukuki Dayanak",
            text: "Kişisel verileriniz; sözleşmenin ifası (KVKK m. 5/2-c), meşru menfaat (KVKK m. 5/2-f) ve açık rıza (KVKK m. 5/1) hukuki sebeplerine dayanılarak işlenmektedir. Pazarlama amaçlı iletişimler yalnızca açık rızanıza dayalı olarak gerçekleştirilmektedir."
          },
          {
            title: "5. Kişisel Verilerin Aktarımı",
            text: "Verileriniz aşağıdaki hizmet sağlayıcılarla, yalnızca hizmet sunumu amacıyla paylaşılmaktadır:

• Supabase Inc. — veritabanı ve kimlik doğrulama altyapısı
• Resend Inc. — e-posta gönderim altyapısı
• Vercel Inc. — uygulama barındırma altyapısı
• Anthropic, Inc. — yapay zekâ analiz altyapısı (yalnızca analiz talebinize ilişkin bağlam)

Verileriniz ticari amaçla üçüncü taraflarla paylaşılmamaktadır."
          },
          {
            title: "6. Kişisel Verilerin Saklanma Süresi",
            text: "Verileriniz, hesabınız aktif olduğu sürece saklanır. Hesap silme talebinde bulunmanız halinde verileriniz 30 gün içinde sistemlerimizden silinir. Yasal yükümlülükler kapsamında saklanması zorunlu veriler ilgili mevzuatta öngörülen süreler boyunca tutulur."
          },
          {
            title: "7. KVKK Kapsamındaki Haklarınız",
            text: "KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:

• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• İşlenmişse buna ilişkin bilgi talep etme
• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme
• Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme
• Eksik veya yanlış işlenmişse düzeltilmesini isteme
• Silinmesini veya yok edilmesini isteme
• Otomatik sistemler aracılığıyla aleyhinize bir sonucun ortaya çıkmasına itiraz etme
• Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme"
          },
          {
            title: "8. Başvuru Yöntemi",
            text: "Haklarınızı kullanmak için hello@parakonusur.com adresine e-posta gönderebilirsiniz. Talepler, kimliğinizin doğrulanmasının ardından KVKK'nın 13. maddesi gereğince en geç 30 gün içinde yanıtlanır."
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
