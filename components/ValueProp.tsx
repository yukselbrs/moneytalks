import { Zap, Target, Radio } from "lucide-react";

const pillars = [
  {
    icon: Zap,
    title: "Anlık Analiz",
    description: "Her hisseyi saniyede değerlendiren yapay zekâ motoru, piyasa kapanmadan önce size ulaşır.",
  },
  {
    icon: Target,
    title: "Net Sinyaller",
    description: "Karmaşık veriyi tek bir aksiyon önerisine dönüştürür. Yorumlama yükü size kalmaz.",
  },
  {
    icon: Radio,
    title: "Derin Kapsam",
    description: "527'den fazla BIST hissesini 7/24 kesintisiz izler. Hiçbir hareket gözden kaçmaz.",
  },
];

export default function ValueProp() {
  return (
    <section className="relative py-28 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <p
            className="text-[10px] tracking-[0.3em] font-medium mb-4"
            style={{ color: "#60A5FA", fontFamily: "var(--font-manrope)" }}
          >
            PLATFORM
          </p>
          <h2
            className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-5"
            style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
          >
            Tek platformda finansal zekâ
          </h2>
          <p
            className="text-lg max-w-xl mx-auto"
            style={{ color: "#64748B", fontFamily: "var(--font-manrope)" }}
          >
            Karmaşık piyasa verisini anlamlı içgörülere dönüştürüyoruz.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="card-glass rounded-2xl p-8 group"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-6 transition-colors duration-300"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
              >
                <Icon size={24} strokeWidth={1.5} color="#60A5FA" />
              </div>
              <h3
                className="text-lg font-bold mb-3"
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
          ))}
        </div>
      </div>
    </section>
  );
}
