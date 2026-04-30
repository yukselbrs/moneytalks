import React from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#F1F5F9", marginBottom: 10 }}>{title}</h2>
      <div style={{ color: "#94A3B8", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export default function RiskUyarisiPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E2E8F0", padding: "60px 24px", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/" style={{ color: "#3B82F6", textDecoration: "none", fontSize: 14 }}>← Ana Sayfa</a>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 8px" }}>Risk Uyarısı</h1>
        <p style={{ color: "#64748B", marginBottom: 40 }}>Son güncelleme: Mayıs 2026</p>
        <div style={{ background: "#1E293B", border: "1px solid #EF4444", borderRadius: 12, padding: "20px 24px", marginBottom: 40 }}>
          <p style={{ color: "#FCA5A5", fontWeight: 600, marginBottom: 8 }}>Önemli Uyarı</p>
          <p style={{ color: "#94A3B8", lineHeight: 1.8 }}>ParaKonuşur, Sermaye Piyasası Kanunu kapsamında yatırım danışmanlığı hizmeti vermemektedir. Platform içerikleri yatırım tavsiyesi niteliği taşımaz.</p>
        </div>
        <Section title="1. Yatırım Riski">
          <p>Sermaye piyasası araçlarına yatırım yapmak ciddi finansal riskler barındırmaktadır. Yatırımınızın tamamını veya bir kısmını kaybedebilirsiniz. Geçmiş getiriler geleceği garanti etmez.</p>
        </Section>
        <Section title="2. Platform İçeriklerinin Niteliği">
          <ul>
            <li>Hisse fiyat verileri gecikmeli olabilir (15 dakikaya kadar)</li>
            <li>Teknik analiz göstergeleri geçmiş veriye dayanır, geleceği garanti etmez</li>
            <li>Yapay zekâ analizleri otomatik üretilir, hata içerebilir</li>
            <li>Hiçbir içerik alım, satım veya elde tutma tavsiyesi değildir</li>
          </ul>
        </Section>
        <Section title="3. Yapay Zekâ Analizlerinin Sınırlılıkları">
          <ul>
            <li>Analizler Anthropic Claude modeli tarafından otomatik üretilir</li>
            <li>İnsan denetiminden geçmez</li>
            <li>Eksik veya hatalı piyasa verilerine dayanıyor olabilir</li>
            <li>Kesin finansal sonuçları öngöremez</li>
          </ul>
        </Section>
        <Section title="4. Kişisel Sorumluluk">
          <p>Platform üzerinden erişilen bilgiler doğrultusunda verilen yatırım kararları tamamen kullanıcının sorumluluğundadır. ParaKonuşur bu kararlar nedeniyle uğranılan zararlardan hukuki sorumluluk kabul etmez.</p>
        </Section>
        <Section title="5. Lisanslı Danışmanlık">
          <p>Yatırım kararı vermeden önce SPK lisanslı bir yatırım danışmanına başvurmanızı tavsiye ederiz.</p>
        </Section>
        <Section title="6. İletişim">
          <p>hello@parakonusur.com</p>
        </Section>
      </div>
    </div>
  );
}
