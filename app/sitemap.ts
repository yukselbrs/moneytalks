import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://parakonusur.com";
  const statikSayfalar = [
    { url: base, priority: 1.0 },
    { url: `${base}/dashboard`, priority: 0.9 },
    { url: `${base}/hisseler`, priority: 0.9 },
    { url: `${base}/analizler`, priority: 0.8 },
    { url: `${base}/portfoy`, priority: 0.8 },
    { url: `${base}/izleme`, priority: 0.7 },
    { url: `${base}/haberler`, priority: 0.7 },
    { url: `${base}/blog`, priority: 0.7 },
    { url: `${base}/takvim`, priority: 0.6 },
    { url: `${base}/alarmlar`, priority: 0.6 },
    { url: `${base}/pro`, priority: 0.8 },
    { url: `${base}/login`, priority: 0.5 },
    { url: `${base}/register`, priority: 0.5 },
    { url: `${base}/gizlilik`, priority: 0.3 },
    { url: `${base}/kvkk`, priority: 0.3 },
  ];
  return statikSayfalar.map(s => ({
    url: s.url,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: s.priority,
  }));
}
