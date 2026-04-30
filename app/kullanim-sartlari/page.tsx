export default function KullanimSartlariPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1220", color: "#E2E8F0", padding: "60px 24px", fontFamily: "var(--font-manrope, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <a href="/" style={{ color: "#3B82F6", textDecoration: "none", fontSize: 14 }}>← Ana Sayfa</a>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 8px" }}>Kullanım Şartları</h1>
        <p style={{ color: "#64748B", marginBottom: 40 }}>Son güncelleme: Mayıs 2026</p>

        {[
          {
            title: "1. Genel",
            text: "Bu kullanım şartları, ParaKonuşur (parakonusur.com) platformunu kullanan tüm kullanıcılar için geçerlidir. Platforma erişim sağlayarak bu şartları kabul etmiş sayılırsınız. Şartları kabul etmiyorsanız platformu kullanmayınız."
          },
          {
            title: "2. Hizmetin Kapsamı",
            text: "ParaKonuşur, Borsa İstanbul (BIST) hisselerine ilişkin fiyat verilerini, teknik göstergeleri ve yapay zekâ destekli analizleri bir araya getiren bir bilgi platformudur. Platform; portföy takibi, fiyat alarmları ve hisse analizi özellikleri sunar."
          },
          {
            title: "3. Yatırım Tavsiyesi Değildir",
            text: "ÖNEMLI UYARI: ParaKonuşur'un sunduğu tüm içerikler, analizler ve yapay zekâ çıktıları yalnızca bilgilendirme amaçlıdır. Hiçbir içerik yatırım tavsiyesi, alım-satım önerisi veya finansal danışmanlık niteliği taşımaz.

Platform, Sermaye Piyasası Kanunu kapsamında yatırım danışmanlığı hizmeti vermemektedir. Yatırım kararlarınızı vermeden önce lisanslı bir yatırım danışmanına başvurmanız tavsiye edilir.

Geçmiş performans verileri gelecekteki sonuçların garantisi değildir. Sermaye piyasası araçlarına yatırım yapmak zarar riskini barındırır."
          },
          {
            title: "4. Veri Doğruluğu",
            text: "Platform, hisse fiyat verilerini Yahoo Finance üzerinden gerçek zamanlıya yakın (15 dakikaya kadar gecikmeli) olarak sunar. ParaKonuşur, veri sağlayıcılardan kaynaklanan hata, gecikme veya kesintilerden sorumlu tutulamaz. Veriler yatırım kararı vermek için tek başına yeterli kaynak olarak kullanılmamalıdır."
          },
          {
            title: "5. Yapay Zekâ Analizleri",
            text: "Platform, Anthropic Claude modeli aracılığıyla yapay zekâ destekli hisse analizleri sunar. Bu analizler:

• Otomatik olarak üretilir ve insan denetiminden geçmez
• Hata, eksiklik veya yanlışlık içerebilir
• Yatırım tavsiyesi niteliği taşımaz
• Güncel olmayan veya eksik piyasa verilerine dayanıyor olabilir

Kullanıcılar yapay zekâ çıktılarını kendi değerlendirmeleriyle desteklemekle yükümlüdür."
          },
          {
            title: "6. Kullanıcı Yükümlülükleri",
            text: "Platformu kullanırken aşağıdaki kurallara uymakla yükümlüsünüz:

• Platformu yalnızca kişisel ve yasal amaçlarla kullanmak
• Hesap bilgilerinizi üçüncü taraflarla paylaşmamak
• Platformun altyapısına zarar verebilecek eylemlerden kaçınmak
• Fikri mülkiyet haklarına saygı göstermek
• Başka kullanıcıların verilerine erişmeye çalışmamak"
          },
          {
            title: "7. Hesap Güvenliği",
            text: "Hesabınızın güvenliğinden siz sorumlusunuz. Şüpheli bir erişim tespit etmeniz halinde derhal hello@parakonusur.com adresine bildirmeniz gerekmektedir. Hesap bilgilerinin paylaşılması sonucu oluşan zararlardan ParaKonuşur sorumlu tutulamaz."
          },
          {
            title: "8. Hizmet Kesintileri",
            text: "ParaKonuşur, planlı veya plansız bakım, teknik sorunlar ya da üçüncü taraf hizmet kesintileri nedeniyle hizmetin geçici olarak kullanılamaz hale gelebileceğini kabul eder. Bu tür kesintiler için tazminat talep edilemez."
          },
          {
            title: "9. Fikri Mülkiyet",
            text: "Platform üzerindeki tüm içerik, tasarım, kod ve marka unsurları ParaKonuşur'a aittir. Yazılı izin alınmaksızın kopyalanamaz, dağıtılamaz veya ticari amaçla kullanılamaz."
          },
          {
            title: "10. Şartlarda Değişiklik",
            text: "ParaKonuşur, bu kullanım şartlarını önceden bildirmeksizin güncelleme hakkını saklı tutar. Güncel şartlar her zaman bu sayfada yayımlanır. Platformu kullanmaya devam etmeniz, güncel şartları kabul ettiğiniz anlamına gelir."
          },
          {
            title: "11. Uygulanacak Hukuk",
            text: "Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir."
          },
          {
            title: "12. İletişim",
            text: "Kullanım şartlarına ilişkin sorularınız için: hello@parakonusur.com"
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
