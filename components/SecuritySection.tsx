import { Shield, Lock, FileCheck } from "lucide-react";

const cards = [
  {
    icon: Shield,
    title: "Borsa İstanbul Resmi Verisi",
    description:
      "Tüm piyasa verileri Borsa İstanbul'un resmi veri akışlarından alınır. Üçüncü taraf veri kaynağı kullanılmaz.",
  },
  {
    icon: Lock,
    title: "KVKK Uyumlu",
    description:
      "Kişisel verileriniz 6698 sayılı KVKK kapsamında işlenir ve korunur. Verileriniz üçüncü taraflarla paylaşılmaz.",
  },
  {
    icon: FileCheck,
    title: "Şeffaf Metodoloji",
    description:
      "Analiz yöntemlerimiz belgelenmiş ve açıklanmıştır. Kullanılan modeller ve veri kaynakları platformda yayımlanır.",
  },
];

export default function SecuritySection() {
  return (
    <section className="relative py-28 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="h-px mb-28" style={{ background: "rgba(59,130,246,0.08)" }} />

        {/* Heading */}
        <div className="text-center mb-16">
          <p
            className="text-[10px] tracking-[0.3em] font-medium mb-4"
            style={{ color: "#60A5FA", fontFamily: "var(--font-manrope)" }}
          >
            GÜVEN VE UYUMLULUK
          </p>
          <h2
            className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-5"
            style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
          >
            Güvenlik ve Şeffaflık
          </h2>
          <p
            className="text-lg max-w-xl mx-auto"
            style={{ color: "#64748B", fontFamily: "var(--font-manrope)" }}
          >
            Kurumsal kalitede altyapı ve düzenleyici uyumluluk.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card-glass rounded-2xl p-8">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-6"
                style={{
                  background: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(59,130,246,0.15)",
                }}
              >
                <Icon size={24} strokeWidth={1.5} color="#60A5FA" />
              </div>
              <h3
                className="text-base font-bold mb-3"
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
