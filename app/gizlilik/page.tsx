export default function GizlilikPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E2E8F0", padding: "60px 24px", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/" style={{ color: "#3B82F6", textDecoration: "none", fontSize: 14 }}>← Ana Sayfa</a>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 8px" }}>Gizlilik Politikası</h1>
        <p style={{ color: "#64748B", marginBottom: 40 }}>Son güncelleme: Nisan 2026</p>
        
        {[
          { title: "1. Toplanan Veriler", text: "ParaKonusur, hesap oluşturma sırasında ad, e-posta adresi ve kullanıcı adı gibi kişisel bilgileri toplar. Platform kullanımına ilişkin teknik veriler (IP adresi, tarayıcı türü) de toplanabilir." },
          { title: "2. Verilerin Kullanımı", text: "Toplanan veriler; hizmet sunumu, kullanıcı deneyiminin iyileştirilmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla kullanılır. Verileriniz üçüncü taraflarla satılmaz." },
          { title: "3. Veri Güvenliği", text: "Verileriniz 256-bit SSL şifreleme ile korunur. Supabase altyapısı üzerinde güvenli biçimde saklanır ve yetkisiz erişime karşı korunur." },
          { title: "4. KVKK Hakları", text: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında verilerinize erişme, düzeltme, silme ve işlemeyi kısıtlama haklarına sahipsiniz." },
          { title: "5. Çerezler", text: "Platform, oturum yönetimi için zorunlu çerezler kullanır. Analitik amaçlı çerezler için onayınız alınır." },
          { title: "6. İletişim", text: "Gizlilik ile ilgili sorularınız için: destek@parakonusur.com" },
        ].map(s => (
          <div key={s.title} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#F1F5F9", marginBottom: 10 }}>{s.title}</h2>
            <p style={{ color: "#94A3B8", lineHeight: 1.8 }}>{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
