const steps = [
  {
    number: "01",
    title: "Hisseyi Seçin",
    description:
      "BIST'teki herhangi bir hisseyi arayın veya tarayın. 600'den fazla enstrüman anlık olarak erişilebilir.",
  },
  {
    number: "02",
    title: "Analizi Alın",
    description:
      "AI motoru teknik, temel ve sentiment verisini saniyeler içinde birleştirir. Kaynak verileri Borsa İstanbul'dan gelir.",
  },
  {
    number: "03",
    title: "Riskleri Görün",
    description:
      "Özet rapor, risk notu ve teknik veri görünümü tek ekranda sunulur. Yönlendirme değil, bilgi.",
  },
];

export default function HowItWorks() {
  return (
    <section id="nasil-calisir" className="relative py-28 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="h-px mb-28" style={{ background: "rgba(59,130,246,0.08)" }} />

        {/* Heading */}
        <div className="text-center mb-20">
          <p
            className="text-[10px] tracking-[0.3em] font-medium mb-4"
            style={{ color: "#60A5FA", fontFamily: "var(--font-manrope)" }}
          >
            NASIL ÇALIŞIR
          </p>
          <h2
            className="text-4xl lg:text-5xl font-extrabold tracking-tight"
            style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
          >
            Üç adımda piyasayı anlayın
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Single connector line spanning all three dots */}
          <div
            className="hidden lg:block absolute left-[10%] right-[10%] h-px z-0"
            style={{
              top: "52px",
              background:
                "linear-gradient(90deg, rgba(59,130,246,0.05), rgba(59,130,246,0.3), rgba(59,130,246,0.05))",
            }}
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-12">
            {steps.map((step) => (
              <div key={step.number} className="relative z-10 px-4 pb-12 lg:pb-0">
                {/* Number */}
                <div
                  className="text-[11px] tracking-[0.25em] font-bold mb-6"
                  style={{ color: "#1E40AF", fontFamily: "var(--font-manrope)" }}
                >
                  {step.number}
                </div>

                {/* Dot */}
                <div
                  className="w-5 h-5 rounded-full mb-8"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6, #1E40AF)",
                    boxShadow:
                      "0 0 0 4px rgba(59,130,246,0.12), 0 0 0 8px rgba(59,130,246,0.06), 0 0 24px rgba(59,130,246,0.25)",
                  }}
                />

                <h3
                  className="text-xl font-bold mb-4"
                  style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed max-w-xs"
                  style={{ color: "#64748B", fontFamily: "var(--font-manrope)" }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
