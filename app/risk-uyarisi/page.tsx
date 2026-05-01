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

export default function RiskUyarisiPage() {
  return (
    <PageWrapper title="Risk Uyarısı" subtitle="Son güncelleme: Mayıs 2026">
      <Section title="Genel Risk Uyarısı">
        <p>ParaKonuşur platformunda sunulan tüm içerikler, analizler, grafikler, yapay zeka çıktıları ve risk skorları yalnızca bilgilendirme amaçlıdır. Bu içerikler hiçbir koşulda yatırım tavsiyesi, alım-satım önerisi veya finansal danışmanlık hizmeti olarak yorumlanamaz.</p>
      </Section>
      <Section title="SPK Uyarısı">
        <p>ParaKonuşur, Sermaye Piyasası Kurulu (SPK) tarafından yetkilendirilmiş bir yatırım danışmanlığı veya portföy yönetim şirketi değildir. 6362 sayılı Sermaye Piyasası Kanunu kapsamında yatırım danışmanlığı hizmeti sunulmamaktadır. Yatırım danışmanlığı hizmeti, kişilerin risk ve getiri tercihleri dikkate alınarak kişiye özel sunulmaktadır.</p>
      </Section>
      <Section title="Yatırım Riskleri">
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>Sermaye piyasası araçlarına yapılan yatırımlar risk içermektedir. Yatırılan anaparanın tamamı kaybedilebilir.</li>
          <li style={{ marginBottom: 6 }}>Geçmiş performans gelecekteki sonuçların garantisi değildir.</li>
          <li style={{ marginBottom: 6 }}>Hisse senedi fiyatları piyasa koşullarına, ekonomik gelişmelere ve şirket haberlerine bağlı olarak anlık değişkenlik gösterebilir.</li>
          <li style={{ marginBottom: 6 }}>Kaldıraçlı işlemler, türev araçlar ve yüksek volatiliteli varlıklar özellikle yüksek risk taşır.</li>
          <li style={{ marginBottom: 6 }}>Döviz kuru değişimleri yatırım getirilerini olumlu veya olumsuz etkileyebilir.</li>
        </ul>
      </Section>
      <Section title="Yapay Zeka Analizleri Hakkında">
        <p>Platform üzerindeki yapay zeka destekli analizler, geçmiş fiyat verileri ve teknik göstergeler kullanılarak otomatik olarak üretilmektedir. Bu analizler:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>Şirketin finansal tablolarını, bilançosunu veya nakit akışını analiz etmemektedir</li>
          <li style={{ marginBottom: 6 }}>KAP bildirimleri veya şirket haberlerini dikkate almamaktadır</li>
          <li style={{ marginBottom: 6 }}>Makroekonomik koşulları veya sektör dinamiklerini değerlendirmemektedir</li>
          <li style={{ marginBottom: 6 }}>Kişisel risk toleransınızı, yatırım ufkunuzu veya finansal durumunuzu bilmemektedir</li>
        </ul>
        <p style={{ marginTop: 8 }}>Bu nedenle yapay zeka çıktıları yalnızca bir başlangıç noktası olarak değerlendirilmeli; kesinlikle tek başına yatırım kararı almak için kullanılmamalıdır.</p>
      </Section>
      <Section title="Veri Gecikmesi">
        <p>Platformda sunulan fiyat verileri 15 dakika gecikmeli olabilir. Anlık işlem kararları için lütfen aracı kurum platformlarındaki gerçek zamanlı verileri kullanınız.</p>
      </Section>
      <Section title="Sorumluluk Reddi">
        <p>ParaKonuşur; platform içeriklerine dayanılarak yapılan yatırımlardan doğabilecek maddi veya manevi zararlardan hiçbir koşulda sorumlu tutulamaz. Yatırım kararlarınız tamamen size aittir ve kendi sorumluluğunuzda gerçekleştirilmektedir.</p>
      </Section>
      <Section title="Profesyonel Tavsiye">
        <p>Yatırım yapmadan önce kendi araştırmanızı yapmanızı ve gerektiğinde SPK lisanslı bir yatırım danışmanına başvurmanızı şiddetle tavsiye ederiz.</p>
      </Section>
    </PageWrapper>
  );
}
