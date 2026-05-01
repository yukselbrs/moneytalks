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

export default function KullanimSartlariPage() {
  return (
    <PageWrapper title="Kullanım Şartları" subtitle="Son güncelleme: Mayıs 2026">
      <Section title="1. Taraflar ve Kapsam">
        <p>Bu kullanım şartları, parakonusur.com adresinde sunulan hizmetleri kullanan kullanıcılar ("Kullanıcı") ile Barış Yüksel ve Kaan İlgin ("ParaKonuşur") arasındaki ilişkiyi düzenlemektedir. Siteye erişerek veya hesap oluşturarak bu şartları kabul etmiş sayılırsınız.</p>
      </Section>
      <Section title="2. Hizmetin Kapsamı">
        <p>ParaKonuşur; Borsa İstanbul (BIST) hisselerine ilişkin teknik analiz, fiyat grafikleri, risk skorları ve yapay zeka destekli yorumlar sunan bir finansal bilgi platformudur. Sunulan içerikler yalnızca bilgilendirme amaçlıdır ve yatırım tavsiyesi niteliği taşımamaktadır.</p>
      </Section>
      <Section title="3. Yatırım Tavsiyesi Değildir">
        <p>ParaKonuşur, Sermaye Piyasası Kurulu (SPK) tarafından yetkilendirilmiş bir yatırım danışmanlığı şirketi değildir. Platform üzerinde sunulan hiçbir içerik, analiz, skor veya yorum yatırım tavsiyesi, alım-satım önerisi veya finansal danışmanlık hizmeti olarak değerlendirilemez. Yatırım kararlarınızı kendi sorumluluğunuzda ve gerektiğinde lisanslı bir yatırım danışmanına başvurarak alınız.</p>
      </Section>
      <Section title="4. Kullanıcı Yükümlülükleri">
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>Platforma yalnızca kişisel ve yasal amaçlarla erişmek</li>
          <li style={{ marginBottom: 6 }}>Hesap bilgilerinizi gizli tutmak ve üçüncü kişilerle paylaşmamak</li>
          <li style={{ marginBottom: 6 }}>Platformu otomatik araçlarla veya bot aracılığıyla kullanmamak</li>
          <li style={{ marginBottom: 6 }}>Sistemlere zarar verecek eylemlerden kaçınmak</li>
          <li style={{ marginBottom: 6 }}>Başka kullanıcıların verilerine izinsiz erişmeye çalışmamak</li>
          <li style={{ marginBottom: 6 }}>Platform içeriklerini izinsiz kopyalamak, dağıtmak veya ticari amaçla kullanmamak</li>
        </ul>
      </Section>
      <Section title="5. Fikri Mülkiyet">
        <p>Platform üzerindeki tüm içerikler, tasarımlar, yazılımlar ve yapay zeka çıktıları ParaKonuşur'un fikri mülkiyetidir. İzinsiz kullanım, kopyalama veya dağıtım yasaktır. Kullanıcılar, platform içeriklerini yalnızca kişisel kullanım amacıyla görüntüleyebilir.</p>
      </Section>
      <Section title="6. Hizmet Kesintileri ve Değişiklikler">
        <p>ParaKonuşur, herhangi bir bildirimde bulunmaksızın hizmetin tamamını veya bir bölümünü geçici ya da kalıcı olarak askıya alma, değiştirme veya sonlandırma hakkını saklı tutar. Bakım, güncelleme veya teknik sorunlar nedeniyle oluşabilecek kesintilerden sorumlu tutulamaz.</p>
      </Section>
      <Section title="7. Veri Doğruluğu">
        <p>Platformda sunulan finansal veriler Yahoo Finance üzerinden alınmakta olup 15 dakika gecikmeli olabilir. Verilerin doğruluğu, güncelliği ve eksiksizliği konusunda herhangi bir garanti verilmemektedir. Yatırım kararlarınızda resmi kaynaklara ve güncel verilere başvurmanızı tavsiye ederiz.</p>
      </Section>
      <Section title="8. Sorumluluk Sınırlaması">
        <p>ParaKonuşur; platform kullanımından, sunulan analizlere dayanılarak alınan yatırım kararlarından, veri gecikmelerinden veya hatalarından, hizmet kesintilerinden kaynaklanabilecek doğrudan veya dolaylı zararlardan sorumlu tutulamaz.</p>
      </Section>
      <Section title="9. Hesap Askıya Alma">
        <p>Bu kullanım şartlarını ihlal eden kullanıcıların hesapları önceden bildirim yapılmaksızın askıya alınabilir veya kalıcı olarak kapatılabilir.</p>
      </Section>
      <Section title="10. Uygulanacak Hukuk">
        <p>Bu kullanım şartları Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Müdürlükleri yetkilidir.</p>
      </Section>
      <Section title="11. İletişim">
        <p>Kullanım şartlarına ilişkin sorularınız için hello@parakonusur.com adresine ulaşabilirsiniz.</p>
      </Section>
    </PageWrapper>
  );
}
