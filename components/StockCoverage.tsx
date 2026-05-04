const tickers = [
  "THYAO", "GARAN", "AKBNK", "EREGL", "SISE", "KCHOL", "SAHOL", "BIMAS",
  "ASELS", "TUPRS", "TOASO", "FROTO", "PGSUS", "KOZAA", "KRDMD", "VESTL",
  "TCELL", "TTKOM", "ARCLK", "DOHOL", "PETKM", "YKBNK", "HALKB", "VAKBN",
  "ISCTR", "EKGYO", "TAVHL", "LOGO", "MGROS", "SOKM", "ULKER", "NETAS",
];

const stats = [
  { value: "600+", label: "Hisse Kapsamı", type: "numeric" as const },
  { value: "Gerçek Zamanlı", label: "Veri Akışı", type: "text" as const },
  { value: "7/24", label: "Kesintisiz İzleme", type: "numeric" as const },
];

const row1 = [...tickers, ...tickers];
const row2 = [...tickers.slice(16), ...tickers.slice(0, 16), ...tickers.slice(16), ...tickers.slice(0, 16)];

export default function StockCoverage() {
  return (
    <section id="kapsam" className="relative py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="h-px mb-28" style={{ background: "rgba(59,130,246,0.08)" }} />

        {/* Heading */}
        <div className="text-center mb-20">
          <p
            className="text-[10px] tracking-[0.3em] font-medium mb-4"
            style={{ color: "#60A5FA", fontFamily: "var(--font-manrope)" }}
          >
            KAPSAM
          </p>
          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight mb-5"
            style={{ color: "#F8FAFC", fontFamily: "var(--font-syne)" }}
          >
            600&apos;den fazla BIST hissesi.
            <br />
            <span className="gradient-text">Kesintisiz kapsam.</span>
          </h2>
        </div>
      </div>

      {/* Ticker rows — full bleed */}
      <div className="relative mb-20">
        {/* Fade edges */}
        <div
          className="absolute left-0 top-0 bottom-0 w-48 z-20 pointer-events-none"
          style={{ background: "linear-gradient(90deg, #0F172A, transparent)" }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-48 z-20 pointer-events-none"
          style={{ background: "linear-gradient(-90deg, #0F172A, transparent)" }}
        />

        {/* Row 1 */}
        <div className="flex overflow-hidden mb-3">
          <div className="ticker-track flex gap-3 whitespace-nowrap">
            {row1.map((ticker, i) => (
              <span
                key={`r1-${i}`}
                className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-medium tracking-widest"
                style={{
                  background: "rgba(11,18,32,0.8)",
                  border: "1px solid rgba(59,130,246,0.1)",
                  color: "#475569",
                  fontFamily: "var(--font-manrope)",
                }}
              >
                {ticker}
              </span>
            ))}
          </div>
        </div>

        {/* Row 2 — reverse direction */}
        <div className="flex overflow-hidden">
          <div className="ticker-track-slow flex gap-3 whitespace-nowrap">
            {row2.map((ticker, i) => (
              <span
                key={`r2-${i}`}
                className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-medium tracking-widest"
                style={{
                  background: "rgba(11,18,32,0.8)",
                  border: "1px solid rgba(59,130,246,0.08)",
                  color: "#334155",
                  fontFamily: "var(--font-manrope)",
                }}
              >
                {ticker}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map(({ value, label, type }) => (
            <div
              key={label}
              className="card-glass rounded-2xl p-8 text-center"
            >
              <div
                className={
                  type === "numeric"
                    ? "text-4xl lg:text-5xl font-bold mb-3 gradient-text"
                    : "text-2xl font-medium mb-3"
                }
                style={{
                  fontFamily: type === "numeric" ? "var(--font-syne)" : "var(--font-manrope)",
                  ...(type === "text" ? { color: "#F8FAFC" } : {}),
                }}
              >
                {value}
              </div>
              <div
                className="text-sm tracking-wider uppercase"
                style={{ color: "#475569", fontFamily: "var(--font-manrope)" }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
