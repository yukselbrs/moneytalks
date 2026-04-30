import React from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#F1F5F9", marginBottom: 10 }}>{title}</h2>
      <div style={{ color: "#94A3B8", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export default function KullanimSartlariPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E2E8F0", padding: "60px 24px", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/" style={{ color: "#3B82F6", textDecoration: "none", fontSize: 14 }}>Ana Sayfa</a>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 8px" }}>Kullanım Şartları</h1>
        <p style={{ color: "#64748B", marginBottom: 40 }}>Son güncelleme: Mayıs 2026</p>
        <Section title="1. Genel">
          <p>Bu kullanım şartları, ParaKonuşur platformunu kullanan tüm kullanıcılar için geçerlidir. Platforma erişim sağlayarak bu şartları kabul etmiş sayılırsınız.</p>
        </Section>
        <Section title="2. Hizmetin Kapsamı">
          <p>ParaKonuşur, Borsa İstanbul (BIST) hisselerine ilişkin fiyat verilerini, teknik göstergeleri ve yapay zekâ destekli analizleri sunan bir bilgi platformudur.</p>
        </Section>
        <Section title="3. Yatırım Tavsiyesi Değildir">
          <ul>
            <li>ParaKonuşurun sunduğu tüm içerikler yalnızca bilgilendirme amaçlıdır.</li>
            <li>Hiçbir içerik yatırım tavsiyesi veya alım-satım önerisi niteliği taşımaz.</li>
            <li>Platform, Sermaye Piyasası Kanunu kapsamında yatırım danışmanlığı hizmeti vermemektedir.</li>
            <li>Geçmiş performans verileri gelecekteki sonuçların garantisi değildir.</li>
          </ul>
        </Section>
        <Section title="4. Veri Doğruluğu">
          <p>Hisse fiyat verileri Yahoo Finance üzerinden gecikmeli olarak sunulur. ParaKonuşur, veri sağlayıcılarından kaynaklanan hata veya gecikmelerden sorumlu tutulamaz.</p>
        </Section>
        <Section title="5. Yapay Zekâ Analizleri">
          <ul>
            <li>Analizler Anthropic Claude modeli tarafından otomatik üretilir.</li>
            <li>İnsan denetiminden geçmez, hata içerebilir.</li>
            <li>Yatırım tavsiyesi niteliği taşımaz.</li>
          </ul>
        </Section>
        <Section title="6. Kullanıcı Yükümlülükleri">
          <ul>
            <li>Platformu yalnızca kişisel ve yasal amaçlarla kullanmak</li>
            <li>Hesap bilgilerini üçüncü taraflarla paylaşmamak</li>
            <li>Altyapıya zarar verebilecek eylemlerden kaçınmak</li>
          </ul>
        </Section>
        <Section title="7. Fikri Mülkiyet">
          <p>Platform üzerindeki tüm içerik ve tasarım ParaKonuşura aittir. Yazılı izin alınmaksızın kopyalanamaz.</p>
        </Section>
        <Section title="8. Uygulanacak Hukuk">
          <p>Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri yetkilidir.</p>
        </Section>
        <Section title="9. İletişim">
          <p>hello@parakonusur.com</p>
        </Section>
      </div>
    </div>
  );
}
