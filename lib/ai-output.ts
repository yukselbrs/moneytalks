export const ANALYSIS_DISCLAIMER = "Bu analiz yatırım tavsiyesi değildir.";
const prohibited = [
  /(hisseyi?|bu hisseyi?|şimdi|hemen)\s+(al|sat|tut)\b/iu,
  /(?:satın al|satin al|kesinlikle al|kesinlikle sat|mutlaka al|mutlaka sat)/iu,
  /kesin(?:likle)?\s*(?:yüksel|düş)/iu,
  /garanti\s+(?:getiri|kazanç|kazanır|kâr|kar)/iu,
  /hedef\s+fiyat\s*[:=]?\s*\d/iu,
];

export function safeAnalysis(text: string): string {
  const cleaned = text.trim();
  if (!cleaned || prohibited.some(pattern => pattern.test(cleaned))) {
    return `Bu yanıt güvenilir bir bilgi özeti olarak sunulamıyor. Sorunuzu fiyat, bilanço veya haber verileriyle sınırlandırarak yeniden deneyin.\n\n${ANALYSIS_DISCLAIMER}`;
  }
  return cleaned.includes(ANALYSIS_DISCLAIMER) ? cleaned : `${cleaned}\n\n${ANALYSIS_DISCLAIMER}`;
}
