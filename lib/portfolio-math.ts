export type RiskPosition = { skor: number | null; deger: number };

export function weightedRisk(positions: RiskPosition[]): { skor: number; seviye: string } | null {
  if (!positions.length || positions.some(p => p.skor === null || !Number.isFinite(p.skor) || p.skor < 0 || p.skor > 100 || !Number.isFinite(p.deger) || p.deger <= 0)) return null;
  const total = positions.reduce((sum, p) => sum + p.deger, 0);
  const skor = Math.round(positions.reduce((sum, p) => sum + p.skor! * p.deger / total, 0));
  return { skor, seviye: skor >= 60 ? "Yüksek" : skor >= 35 ? "Orta" : "Düşük" };
}

export type HistoricalPosition = { adet: number; points: { timestamp: number; fiyat: number }[] };

export function portfolioHistory(positions: HistoricalPosition[]) {
  if (!positions.length || positions.some(p => !p.points.length || !Number.isFinite(p.adet) || p.adet <= 0)) return [];
  const maps = positions.map(p => new Map(p.points.filter(x => Number.isFinite(x.timestamp) && Number.isFinite(x.fiyat) && x.fiyat > 0).map(x => [x.timestamp, x.fiyat])));
  const times = [...maps[0].keys()].filter(t => maps.every(m => m.has(t))).sort((a, b) => a - b);
  const values = times.map(timestamp => ({ timestamp, value: positions.reduce((sum, p, i) => sum + p.adet * maps[i].get(timestamp)!, 0) }));
  if (values.length < 2 || values[0].value <= 0) return [];
  return values.map(p => ({ timestamp: p.timestamp, degisim: (p.value / values[0].value - 1) * 100 }));
}
