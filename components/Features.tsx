import { FileText, TrendingUp, Newspaper, Briefcase } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "AI Özet Raporları",
    description:
      "Hisse başına yapay zekâ destekli, anlaşılır özet analiz raporları. Karmaşık finansal veriyi sade Türkçe ile özetler.",
  },
  {
    icon: TrendingUp,
    title: "Teknik Gösterge Özeti",
    description:
      "Fiyat, hacim ve momentum verilerini sadeleştirir. Teknik görünümü yönlendirme yapmadan anlaşılır hale getirir.",
  },
  {
    icon: Newspaper,
    title: "Haber Sentiment Analizi",
    description:
      "Finansal haberlerin piyasa algısındaki yerini özetler. Olumlu ve olumsuz veri noktalarını gerçek zamanlı sıralar.",
  },
  {
    icon: Briefcase,
    title: "Portföy Takibi",
    description:
      "BIST portföyünüzü tek ekranda anlık olarak izleyin. Her pozisyon için AI analizi ve risk skoru görüntüleyin.",
  },
];

export default function Features() {
  return (
    <section id="ozellikler" className="relative py-28 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="h-px mb-28" style={{ background: "rgba(59,130,246,0.08)" }} />

        {/* Heading */}
        <div className="text-center mb-16">
          <p
            className="text-[10px] tracking-[0.3em] font-medium mb-4"
            style={{ color: "#60A5FA", fontFamily: "var(--font-manrope)" }}
          >
            ÖZELLİKLER
          </p>
          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight"
            style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
          >
            İhtiyacınız olan her analiz aracı
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="card-glass rounded-2xl p-8 flex gap-6 group"
            >
              <div
                className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                style={{
                  background: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(59,130,246,0.15)",
                }}
              >
                <Icon size={24} strokeWidth={1.5} color="#60A5FA" />
              </div>
              <div>
                <h3
                  className="text-base font-bold mb-2"
                  style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#64748B", fontFamily: "var(--font-manrope)" }}
                >
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
