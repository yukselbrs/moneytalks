export default function RiskUyarisiPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E2E8F0", padding: "60px 24px", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/" style={{ color: "#3B82F6", textDecoration: "none", fontSize: 14 }}>← Ana Sayfa</a>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 8px" }}>Risk Uyarısı</h1>
        <p style={{ color: "#64748B", marginBottom: 40 }}>Son güncelleme: Mayıs 2026</p>

        <div style={{ background: "#1E293B", border: "1px solid #EF4444", borderRadius: 12, padding: "20px 24px", marginBottom: 40 }}>
          <p style={{ color: "#FCA5A5", fontWeight: 600, marginBottom: 8 }}>⚠️ Önemli Uyarı</p>
          <p style={{ color: "#94A3B8", lineHeight: 1.8 }}>
            ParaKonuşur, Sermaye Piyasası Kanunu kapsamında yatırım danışmanlığı hizmeti vermemektedir.
            Platform içerikleri yatırım tavsiyesi niteliği taşımaz. Yatırım kararlarınızı vermeden önce
            lisanslı bir yatırım danışmanına başvurmanız tavsiye edilir.
          </p>
        </div>

        {[
          {
            title: "1. Yatırım Riski",
            text: "Sermaye piyasası araçlarına (hisse senedi, fon vb.) yatırım yapmak ciddi finansal riskler barındırır. Yatırımınızın tamamını veya bir kısmını kaybedebilirsiniz. Geçmiş fiyat hareketleri ve getiri verileri, gelecekteki performansın garantisi değildir."
          },
          {
            title: "2. Platform İçeriklerinin Niteliği",
            text: "ParaKonuşur'un sunduğu tüm içerikler yalnızca bilgilendirme amaçlıdır:

• Hisse fiyat verileri gecikmeli olabilir (15 dakikaya kadar)
• Teknik analiz göstergeleri geçmiş veriye dayanır, geleceği garanti etmez
• Yapay zekâ analizleri otomatik olarak üretilir, hata içerebilir
• Hiçbir içerik alım, satım veya elde tutma tavsiyesi değildir"
          },
          {
            title: "3. Yapay Zekâ Analizlerinin Sınırlılıkları",
            text: "Platform, yapay zekâ destekli hisse analizleri sunar. Bu analizlere ilişkin önemli sınırlılıklar:

• Analizler Anthropic Claude modeli tarafından otomatik üretilir
• İnsan denetiminden geçmez
• Eksik, güncel olmayan veya hatalı piyasa verilerine dayanıyor olabilir
• Model, piyasa koşullarını tam olarak yansıtmıyor olabilir
• Yapay zekâ çıktıları kesin finansal sonuçları öngöremez

Bu analizler, kendi araştırmanızı desteklemek amacıyla kullanılmalıdır."
          },
          {
            title: "4. Veri Kaynakları ve Doğruluk",
            text: "Platform verileri Yahoo Finance başta olmak üzere çeşitli üçüncü taraf kaynaklardan alınmaktadır. ParaKonuşur:

• Veri sağlayıcılardan kaynaklanan hata veya gecikmelerden sorumlu değildir
• Verilerin eksiksizliğini veya doğruluğunu garanti etmez
• Teknik kesinti veya veri akışı sorunlarından sorumlu tutulamaz"
          },
          {
            title: "5. Kişisel Sorumluluk",
            text: "Platform üzerinden erişilen bilgiler doğrultusunda verilen yatırım kararları ve bu kararların sonuçları tamamen kullanıcının sorumluluğundadır. ParaKonuşur, kullanıcıların yatırım kararları nedeniyle uğradığı doğrudan veya dolaylı zararlardan hukuki sorumluluk kabul etmez."
          },
          {
            title: "6. Lisanslı Danışmanlık",
            text: "Yatırım kararı vermeden önce:

• SPK lisanslı bir yatırım danışmanına başvurmanızı
• Kendi finansal durumunuzu ve risk toleransınızı değerlendirmenizi
• Birden fazla bağımsız kaynaktan bilgi edinmenizi

şiddetle tavsiye ederiz."
          },
          {
            title: "7. İletişim",
            text: "Risk uyarısına ilişkin sorularınız için: hello@parakonusur.com"
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
