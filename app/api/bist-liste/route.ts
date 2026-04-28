import { NextResponse } from "next/server";

let cache: { data: {ticker: string; ad: string}[]; ts: number } | null = null;

async function fetchBatch(tickers: string[]): Promise<{ticker: string; ad: string}[]> {
  const symbols = tickers.map(t => `${t}.IS`).join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=symbol,shortName,longName`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  const quotes = data?.quoteResponse?.result || [];
  return quotes
    .filter((q: {regularMarketPrice?: number}) => q.regularMarketPrice)
    .map((q: {symbol: string; longName?: string; shortName?: string}) => ({
      ticker: q.symbol.replace(".IS", ""),
      ad: q.longName || q.shortName || q.symbol.replace(".IS", ""),
    }));
}

// Bilinen BIST hisse kodlarından Yahoo'da gerçekten işlem görenleri filtrele
const TUMU = ["A1CAP","ACSEL","ADEL","ADESE","ADGYO","AEFES","AFYON","AGESA","AGHOL","AGROT","AGYO","AHGAZ","AKBNK","AKCNS","AKFGY","AKFYE","AKGRT","AKMGY","AKSA","AKSEN","AKSGY","AKSUE","AKTIF","ALARK","ALBRK","ALCAR","ALCTL","ALFAS","ALGYO","ALKIM","ALMAD","ALTNY","ALVES","ANELE","ANGEN","ANHYT","ANSGR","ARCLK","ARDYZ","ARENA","ARSAN","ASELS","ASTOR","ASUZU","ATAGY","ATAKP","ATEKS","ATLAS","AVGYO","AVHOL","AVOD","AYDEM","AYEN","AYES","AZTEK","BAGFS","BAKAB","BALAT","BANVT","BASCM","BASGZ","BERA","BEYAZ","BFREN","BIGCH","BIMAS","BIOEN","BIZIM","BJKAS","BLCYT","BMSTL","BNTAS","BOBET","BOSSA","BRISA","BRYAT","BTCIM","BUCIM","BURCE","BVSAN","BYDNR","CANTE","CASA","CCOLA","CELHA","CEMAS","CEMTS","CIMSA","CLEBI","CMBTN","COKAL","CRFSA","CVKMD","CWENE","DAGI","DAPGM","DENGE","DESA","DESPC","DEVA","DGATE","DGGYO","DITAS","DMSAS","DOAS","DOHOL","DOKTA","DYOBY","DZGYO","EBEBK","ECILC","ECZYT","EDATA","EGEEN","EGEPO","EGGUB","EGSER","EKGYO","EKSUN","EMKEL","ENERY","ENGYO","ENKAI","ENTRA","EPLAS","ERBOS","EREGL","ERSU","ESCAR","ESCOM","EUPWR","FADE","FENER","FLAP","FONET","FORMT","FORTE","FROTO","GARAN","GARFA","GEDIK","GENIL","GENTS","GESAN","GLRYH","GLYHO","GOLTS","GOZDE","GSDHO","GSRAY","GUBRF","GWIND","HALKB","HATEK","HEKTS","HLGYO","HOROZ","HTTBT","HUBVC","HUNER","HURGZ","ICBCT","IHLAS","IHLGM","INDES","INFO","INVEO","IPEKE","ISBIR","ISCTR","ISFIN","ISGYO","ITTFK","IZENR","IZMDC","JANTS","KAPLM","KAREL","KARSN","KARTN","KATMR","KAYSE","KCHOL","KERVT","KFEIN","KLGYO","KLKIM","KLNMA","KNFRT","KONYA","KORDS","KOZAA","KOZAL","KRDMA","KRDMB","KRDMD","KRSTL","LIDER","LINK","LKMNH","LMKDC","LOGO","MAALT","MANAS","MARKA","MARTI","MAVI","MEDTR","MEPET","MERCN","MERIT","MERKO","METRO","MGROS","MNDRS","MOBTL","MOGAN","MPARK","MRSHL","MTRKS","NATEN","NETAS","NIBAS","NTGAZ","NUGYO","NUHCM","ODAS","ONCSM","ORGE","OSTIM","OTKAR","OYAKC","OYLUM","OZGYO","PAMEL","PARSN","PENTA","PETKM","PETUN","PGSUS","PINSU","PKART","PKENT","POLHO","PRDGS","QNBFB","QNBFL","RAYSG","RHEAG","ROYAL","RYSAS","SAFKR","SAHOL","SANEL","SANKO","SARKY","SASA","SDTTR","SEKUR","SELEC","SELGD","SEYKM","SISE","SKTAS","SMART","SNGYO","SOKM","SUWEN","TABGD","TATGD","TAVHL","TBORG","TCELL","THYAO","TKFEN","TKNSA","TMSN","TMPOL","TOASO","TRCAS","TRGYO","TSPOR","TTKOM","TTRAK","TUKAS","TUPRS","TURSG","ULKER","UMPAS","UNLU","USAK","VAKBN","VAKKO","VESBE","VESTL","VKGYO","YATAS","YKBNK","YKSLN","YYAPI","ZOREN","ZRGYO"];

export async function GET() {
  if (cache && Date.now() - cache.ts < 86400000) {
    return NextResponse.json(cache.data);
  }
  
  const sonuc: {ticker: string; ad: string}[] = [];
  const batchSize = 20;
  
  for (let i = 0; i < TUMU.length; i += batchSize) {
    const batch = TUMU.slice(i, i + batchSize);
    const data = await fetchBatch(batch);
    sonuc.push(...data);
    await new Promise(r => setTimeout(r, 100));
  }
  
  cache = { data: sonuc, ts: Date.now() };
  return NextResponse.json(sonuc);
}
