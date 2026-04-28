"use client";
import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";

const BIST_HISSELER = [
  "AEFES","AGESA","AGROT","AHGAZ","AKBNK","AKCNS","AKFGY","AKFYE","AKGRT","AKSA","AKSEN","AKSGY","AKSUE","AKTIF","ALARK","ALBRK","ALCAR","ALCTL","ALFAS","ALGYO","ALKIM","ALMAD","ALTNY","ALVES","ANELE","ANGEN","ANHYT","ANSGR","ARASE","ARCLK","ARDYZ","ARENA","ARSAN","ASELS","ASSAN","ASUZU","ATAGY","ATAKP","ATATP","ATEKS","ATLAS","ATSYH","AVGYO","AVHOL","AVOD","AVPGY","AYCES","AYDEM","AYEN","AYES","AZTEK","BAGFS","BAKAB","BALAT","BANVT","BARMA","BASCM","BASGZ","BAYRK","BBGYO","BERA","BEYAZ","BFREN","BIGCH","BIMAS","BIOEN","BIZIM","BJKAS","BLCYT","BMEKS","BMSTL","BNTAS","BOBET","BORLS","BORSK","BOSSA","BRISA","BRKO","BRKSN","BRKVY","BRMEN","BRSAS","BRYAT","BSOKE","BTCIM","BUCIM","BURCE","BURVA","BVSAN","BYDNR","CANTE","CASA","CCOLA","CELHA","CEMAS","CEMTS","CENTA","CIMSA","CLEBI","CMBTN","CMENT","COKAL","CONSE","COSMO","CRDFA","CRFSA","CUSAN","CVKMD","CWENE","DAGI","DAPGM","DARDL","DENGE","DERHL","DERIM","DESA","DESPC","DEVA","DGATE","DGGYO","DGNMO","DIRIT","DITAS","DJIST","DMSAS","DNISI","DOAS","DOCO","DOGUB","DOHOL","DOKTA","DORD","DURDO","DYOBY","DZGYO","EBEBK","ECILC","ECZYT","EDATA","EGEEN","EGEPO","EGGUB","EGPRO","EGSER","EKGYO","EKSUN","ELITE","EMKEL","EMNIS","ENERY","ENGYO","ENKAI","ENPET","ENSRI","ENTRA","EPLAS","ERBOS","ERCB","EREGL","ERSU","ESCAR","ESCOM","ESEN","ETILR","ETYAT","EUHOL","EUPOWER","EUPWR","EYGYO","FADE","FENER","FLAP","FMIZP","FONET","FORMT","FORTE","FROTO","FZLGY","GARAN","GARFA","GEDIK","GEDZA","GENIL","GENTS","GEREL","GESAN","GLBMD","GLCVY","GLRYH","GLYHO","GMTAS","GOKNR","GOLTS","GOODY","GOZDE","GRSEL","GRTRK","GSDDE","GSDHO","GSRAY","GUBRF","GWIND","GZNMI","HALKB","HATEK","HDFGS","HEDEF","HEKTS","HLGYO","HOROZ","HTTBT","HUBVC","HUNER","HURGZ","ICBCT","ICUGS","IDGYO","IEYHO","IGDAS","IHEVA","IHGZT","IHLAS","IHLGM","IHYAY","IMASM","INDES","INFO","INGRM","INTEM","INVEO","IPEKE","ISATR","ISBIR","ISCTR","ISYAT","ISFIN","ISGSY","ISGYO","ISKPL","ISKUR","ISYAT","ITTFK","IZENR","IZFAS","IZINV","IZMDC","JANTS","KAPLM","KAREL","KARSN","KARTN","KATMR","KAYSE","KBORU","KCHOL","KCVLY","KERVT","KFEIN","KGYO","KIMMR","KLGYO","KLKIM","KLMSN","KLNMA","KLRHO","KLSER","KMPUR","KNFRT","KONYA","KORDS","KRDMA","KRDMB","KRDMD","KRGYO","KRPLS","KRSTL","KRTEK","KSTUR","KTLEV","KUTPO","KZBGY","KZGYO","LIDER","LIDFA","LILAK","LINK","LKMNH","LMKDC","LOGO","LRSHO","LYKHO","MAALT","MACKO","MAGEN","MAKIM","MANAS","MARKA","MARTI","MAVI","MEDTR","MEGAP","MEPET","MERCN","MERIT","MERKO","METRO","METUR","MIATK","MIGRS","MIPAZ","MKOLEJ","MMCAS","MNDRS","MNDTR","MNVRL","MOBTL","MOGAN","MPARK","MRGYO","MRSHL","MSGYO","MTRKS","MTRYO","MZHLD","NATEN","NETAS","NETAŞ","NETTO","NIBAS","NTGAZ","NUGYO","NUHCM","NWLAT","OBAMS","ODAS","OFSYM","OKCBR","OKANT","ONCSM","ONRYT","ORCAY","ORGE","ORMA","OSTIM","OTKAR","OYAKC","OYAYO","OYLUM","OZGYO","OZKGY","PAGYO","PAMEL","PAPIL","PARSN","PASEU","PCILT","PEGYO","PEKGY","PENTA","PETKM","PETUN","PGSUS","PINSU","PKART","PKENT","PLTUR","PNLSN","POLHO","POLTK","PRDGS","PRZMA","PSDTC","PSGYO","PSKBM","QNBFB","QNBFL","RAYSG","RHEAG","RODRG","ROYAL","RTALB","RUBNS","RYGYO","RYSAS","SAFKR","SAGHO","SAHOL","SAMAT","SANEL","SANFM","SANKO","SARKY","SASA","SAYAS","SDTTR","SEGYO","SEKFK","SEKUR","SELEC","SELGD","SELVA","SEYKM","SILVR","SISE","SKTAS","SMART","SMRTG","SNGYO","SNKRN","SOKM","SRVGY","SUMAS","SURGY","SUWEN","TABGD","TATGD","TAVHL","TBORG","TCELL","TCKRC","TDGYO","TEKTU","TESLA","THYAO","TKFEN","TKNSA","TLMAN","TMSN","TMPOL","TOASO","TRCAS","TRGYO","TRILC","TSPOR","TTKOM","TTRAK","TUCLK","TUKAS","TULGA","TUPRS","TURSG","TUREX","UFUK","ULUFA","ULKER","ULUUN","UMPAS","UNLU","USAK","USDTR","VAKBN","VAKFN","VAKKO","VANGD","VATFT","VBTS","VERUS","VESBE","VESTL","VKGYO","VKFYO","VRGYO","WYNNS","YBTAS","YATAS","YGYO","YIGIT","YKBNK","YKSLN","YONGA","YYAPI","ZEDUR","ZOREN","ZRGYO"];

export default function HisselerPage() {
  const router = useRouter();
  const [arama, setArama] = useState("");
  const [fiyatlar, setFiyatlar] = useState<Record<string, { fiyat: string; degisim: string; yukselis: boolean } | null>>({});
  const [yukleniyor, setYukleniyor] = useState(false);

  const filtrelendi = BIST_HISSELER.filter(h => h.includes(arama.toUpperCase()));

  useEffect(() => {
    if (arama.length > 0) return;
    setYukleniyor(true);
    const ilk50 = BIST_HISSELER.slice(0, 50).join(",");
    fetch(`/api/fiyatlar?extra=${ilk50}`)
      .then(r => r.json())
      .then(d => { setFiyatlar(d); setYukleniyor(false); })
      .catch(() => setYukleniyor(false));
  }, []);

  useEffect(() => {
    if (arama.length < 2) return;
    const q = arama.toUpperCase();
    const eslesen = BIST_HISSELER.filter(h => h.startsWith(q)).slice(0, 20).join(",");
    if (!eslesen) return;
    fetch(`/api/fiyatlar?extra=${eslesen}`)
      .then(r => r.json())
      .then(d => setFiyatlar(prev => ({ ...prev, ...d })))
      .catch(() => {});
  }, [arama]);

  return (
    <AppShell>
      <div style={{ background: "#0B1220", minHeight: "100vh", fontFamily: "var(--font-manrope, sans-serif)" }}>
        <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 24px" }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: "#3B82F6", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>BIST · Tüm Hisseler</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.5px" }}>
                Hisseler <span style={{ fontSize: 14, color: "#334155", fontWeight: 500 }}>{BIST_HISSELER.length} hisse</span>
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "8px 14px", minWidth: 240 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Hisse kodu ara..."
                  style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#94A3B8", width: "100%" }} />
              </div>
            </div>
          </div>

          {/* Tablo header */}
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 100px", gap: 8, padding: "8px 14px", marginBottom: 4 }}>
            {["#", "HİSSE", "FİYAT", "DEĞİŞİM"].map(h => (
              <p key={h} style={{ fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.07em" }}>{h}</p>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {filtrelendi.map((ticker, i) => {
              const f = fiyatlar[ticker];
              return (
                <div key={ticker} onClick={() => router.push(`/hisse/${ticker}`)}
                  style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 100px", gap: 8, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.06)", background: "rgba(255,255,255,0.01)", cursor: "pointer", alignItems: "center", transition: "all 0.1s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.05)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.01)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.06)"; }}>
                  <span style={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>{i + 1}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", letterSpacing: "-0.2px" }}>{ticker}</span>
                  <span style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>
                    {f ? `${f.fiyat} ₺` : <span style={{ color: "#1E293B" }}>—</span>}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: f ? (f.yukselis ? "#10B981" : "#EF4444") : "#1E293B" }}>
                    {f ? `${f.yukselis ? "▲" : "▼"} %${Math.abs(Number(f.degisim)).toFixed(2).replace(".", ",")}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
