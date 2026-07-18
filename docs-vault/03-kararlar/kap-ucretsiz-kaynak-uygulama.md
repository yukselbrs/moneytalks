# KAP Ücretsiz Kaynak — Uygulama Kaydı (18 Tem 2026)

**Durum: KOD TAMAMLANDI, production'da (auto modu).** Araştırma: [[kap-ucretsiz-veri-kaynagi]].

## Bağlam
KAP bildirimleri şimdiye dek yalnız MKK VYK (sözleşmeli/anahtarlı) API'sinden çekiliyordu. VYK auth'u kırıldığında (bkz. GitHub↔Vercel secret uyuşmazlığı, [[track1-gorev2-cron-secret-rotasyonu]]) KAP pipeline'ı komple duruyordu. kap.org.tr'nin kendi açık JSON API'si canlı doğrulandı (anahtarsız, disclosureIndex VYK ile aynı).

## Karar: tek kaynak katmanı + VYK-birincil / ücretsiz-fallback
Yeni modül **`lib/kap-kaynak.ts`** üç işlemi tek yerden sunar: `kapSonIndex()`, `kapListe({sonIndex, ticker})`, `kapDetay(index)`. Her biri önce VYK'yi dener, hata/boş dönerse kap.org.tr site API'sine düşer. Üç tüketici de bu modüle bağlandı; ham `fetch(KAP_API_URL/...)` çağrıları kaldırıldı:
- `app/api/cron/kap-bildirimleri` (DB besleyici — omurga)
- `app/api/haberler` (public haber akışı)
- `app/api/chatbot` (neden/haber bağlamı)

### `KAP_KAYNAK` env anahtarı (Vercel'de ayarlanır)
- **`auto`** (varsayılan, tanımsızsa da bu): VYK birincil, hata olursa ücretsiz siteye düşer. **Şu an production bu modda** — VYK çalışırken normal, VYK düşünce pipeline ücretsizle kendini kurtarır (secret sorununun tekrarına karşı dayanıklılık).
- **`kap`**: yalnız ücretsiz site API'si (VYK aboneliğinden çıkılırsa tek satır env değişimiyle geçiş — kod değişikliği YOK).
- **`vyk`**: yalnız VYK (fallback kapalı; katı istenirse).

## Ücretsiz site API'si (fallback yolu)
- Liste: `POST kap.org.tr/tr/api/disclosure/members/byCriteria` — 4 günlük tarih penceresi, `disclosureIndex > cursor` client-side filtre, ticker verildiyse `stockCodes` içinde arar.
- Detay: `GET /tr/api/notification/attachment-detail/{index}` → `KapDetay` şekline eşlenir (senderExchCodes = stockCode split, time = publishDate YYYY.MM.DD→DD.MM.YYYY, flatData = disclosureBody HTML).
- WAF'a karşı: gerçek tarayıcı UA + `Referer` zorunlu (yoksa bağlantı düşüyor); byCriteria öncesi best-effort oturum ısınma GET'i; 15 sn timeout.
- **Güvenli çökme:** her hata `hataYakala` ile loglanır ve boş/null döner — pipeline asla kırılmaz (o tur "yeni bildirim yok" gibi davranır).

## Doğrulama (18 Tem 2026, gerçek uygulama kodu)
- `KAP_KAYNAK=kap` ile `/api/haberler`: 10 gerçek KAP bildirimi doğru eşlendi (ticker/başlık/tarih); `?ticker=TSPOR` → yalnız 2 TSPOR bildirimi (ticker filtresi ✓).
- `auto` (VYK birincil) ile `/api/haberler`: hatasız, farklı set (VYK aktif) — birincil yol sağlam.
- İçerik çıkarımı: ücretsiz `disclosureBody` (HTML) → `htmlTemizle`/`icerikTopla` ile anlamlı metin çıkıyor (özet AI'ının girdisi). Not: iki dilli (TR+EN) etiket gürültüsü VYK'nın yapısal flatData'sından fazla ama LLM tolere ediyor — kalite farkı kabul edilebilir.
- tsc temiz, production build temiz (3 route derleniyor).

## Açık riskler / borçlar
1. **Vercel egress IP'si WAF'ta farklı davranabilir** — lokal test farklı IP'den geçti. Prod'da ücretsiz yol ilk kez tetiklendiğinde (VYK düşünce) izlenmeli. Kötü senaryoda fallback boş döner = zarar yok, ama kurtarma da olmaz.
2. Ücretsiz kaynağın **resmî SLA'sı yok**; endpoint habersiz değişebilir. Yalnız yedek olduğu sürece risk düşük. `kap` moduna kalıcı geçilecekse yeniden-yayın izni hukuken netleştirilmeli (Barış).
3. Özet kalitesi ücretsiz yolda VYK'ya göre bir tık gürültülü (EN etiketler). Gerekirse adaptörde `content-en` blokları ayıklanabilir — şimdilik borç.

İlgili: [[kap-tercumani-supabase-semasi]] · [[track1-gorev9-kap-tercumani]]
