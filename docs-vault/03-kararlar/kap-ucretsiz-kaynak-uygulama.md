# KAP Ücretsiz Kaynak — Uygulama Kaydı (18 Tem 2026)

**Durum: KOD TAMAMLANDI, production'da. VYK/demo tamamen kaldırıldı; tek kaynak ücretsiz kap.org.tr.** Araştırma: [[kap-ucretsiz-veri-kaynagi]].

> **19 Tem güncelleme:** İlk sürüm VYK-birincil/ücretsiz-fallback (auto) idi. Ama production'da MKK **demo/dev gateway** (`apigwdev.mkk.com.tr`) birincil olarak bayat/sınırlı veri (ör. ZRGYO/HUNER) döndürüyor, HTTP 200 olduğu için fallback tetiklenmiyor ve haberler sayfası gerçek akışı göstermiyordu. Kullanıcı talebiyle **VYK tamamen kaldırıldı**; kaynak yalnız ücretsiz site API'si. `KAP_KAYNAK` env anahtarı ve tüm VYK kodu (vykSonIndex/vykListe/vykCompanyId/vykDetay, KAP_API_* sabitleri) silindi.

## Bağlam
KAP bildirimleri eskiden MKK VYK demo gateway'inden çekiliyordu; auth kırıldığında (GitHub↔Vercel secret, [[track1-gorev2-cron-secret-rotasyonu]]) pipeline duruyor, çalışırken bile demo verisi geliyordu. kap.org.tr'nin kendi açık JSON API'si canlı doğrulandı (anahtarsız, gerçek güncel bildirimler, disclosureIndex aynı numaralandırma).

## Karar: tek kaynak = ücretsiz kap.org.tr
Modül **`lib/kap-kaynak.ts`** üç işlemi sunar: `kapSonIndex()`, `kapListe({sonIndex, ticker})`, `kapDetay(index)` — hepsi doğrudan kap.org.tr site API'sinden. Üç tüketici de buna bağlı; ham VYK `fetch` çağrıları ve `KAP_API_URL/KEY/SECRET` kullanımı kaldırıldı:
- `app/api/cron/kap-bildirimleri` (DB besleyici — omurga)
- `app/api/haberler` (public haber akışı — 10 gerçek bildirim canlı doğrulandı)
- `app/api/chatbot` (neden/haber bağlamı)

**Barış — Vercel env temizliği:** `KAP_API_URL`, `KAP_API_KEY`, `KAP_API_SECRET`, `KAP_KAYNAK` artık kullanılmıyor, silinebilir (kod bunlara hiç bakmıyor).

## Ücretsiz site API'si
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
