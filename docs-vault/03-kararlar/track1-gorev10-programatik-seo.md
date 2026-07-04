# Track 1 / GÖREV 10 — Programatik SEO

**Tarih:** 4 Temmuz 2026
**Durum:** Tamamlandı (içerik akışı GÖREV 9'un canlıya alınmasına bağlı)
**Referans:** brainstorm-2026-07.md Fikir 2; strateji raporu Bölüm 7.3 (SEO ana motor)

## Ne yapıldı
1. **`/kap/[index]`** — her KAP bildirimi için otomatik, indekslenebilir sayfa. "{TICKER} {tip etiketi} ne anlama geliyor?" başlık formatı; ISR `revalidate=1800`; içerik `kap_bildirimleri` tablosundan anon Supabase okuma (RLS anon SELECT zaten açık). generateMetadata (title/description/canonical/OG) + Article JSON-LD. Özeti olmayan kayıtlarda ham konu + KAP linkiyle zarif düşüş. Kayıt yoksa notFound.
2. **`/kap`** — SEO hub: özetlenmiş son 50 bildirim listesi, ISR `revalidate=900`, iç bağlantı (crawl yolu) + boş durum tasarımı.
3. **50 pilot hisse structured data** — `lib/seo-pilot-hisseler.ts` (50 likit/bilinen ticker) + `app/hisse/[ticker]/layout.tsx`'e pilot hisseler için schema.org Corporation JSON-LD (mevcut generateMetadata korunarak).
4. **`app/sitemap.ts`** — statik sayfalar + 607 hisse sayfası + özetlenmiş son 500 KAP bildirimi (tablo yoksa/hata olursa sessizce atlanır — build kırılmaz).

## Kararlar
- URL şeması `/kap/{disclosureIndex}` (slug'sız): anahtar kelimeler title/H1'de taşınıyor; slug parse karmaşıklığı ve yönlendirme riski alınmadı.
- Yeni sayfalar server component + Tailwind (CLAUDE.md kuralı; mevcut sayfalardaki inline-style deseni değil) — GÖREV 13 tutarlılık turunun yönünü de belirliyor. `dot-grid`/`card-glass`/`animate-fade-up` global sınıfları server component'ta da çalışıyor.
- AppShell bilinçli olarak kullanılmadı: SEO sayfaları hafif, auth'suz, hızlı ilk yük; breadcrumb + hisse sayfası/kayıt CTA'sı ile uygulamaya bağlanıyor.
- Her sayfada disclaimer + "bağlayıcı olan kaynak bildirimdir" notu + KAP aslına link (SPK/güven duruşu).

## Doğrulama
- `npx tsc --noEmit` 0 hata; `npm run build` başarılı: `/kap` statik (15m revalidate), `/kap/[index]` dynamic ISR, sitemap.xml üretildi. Tablo henüz Supabase'de olmadığı için build sırasında boş durum yolu çalıştı (beklenen davranış).

## Not
İçerik envanteri GÖREV 9 cron'u canlıya alınınca birikmeye başlar; sitemap her build/revalidate'te son 500 bildirimi kapsar. Strateji raporundaki "SEO'ya en erken başla" ilkesi gereği bu sayfaların indekslenmesi bildirim hacminden bağımsız olarak hemen başlayabilir (hub + 607 hisse + pilot JSON-LD).
