# KAP Bildirimlerini Ücretsiz Çekme — Kaynak Araştırması (18 Tem 2026)

**Sonuç: kap.org.tr'nin kendi sitesinin JSON API'si ücretsiz, key'siz ve mevcut MKK VYK API'sinin işlevsel muadili.** Canlı test edildi, çalışıyor.

## Doğrulanan endpoint'ler (18 Tem 2026 canlı test)

### 1. Bildirim listesi
```
POST https://www.kap.org.tr/tr/api/disclosure/members/byCriteria
Headers: User-Agent (tarayıcı UA'sı), Content-Type: application/json,
         Referer: https://www.kap.org.tr/tr/bildirim-sorgu
Body: {"fromDate":"YYYY-MM-DD","toDate":"YYYY-MM-DD","mkkMemberOidList":[],"subjectList":[]}
```
Test sonucu: bugün için 27 kayıt, HTTP 200. Dönen alanlar: **disclosureIndex** (VYK ile AYNI numaralandırma — mevcut `kap_bildirimleri.disclosure_index` ile uyumlu), **stockCodes**, summary, subject, publishDate, disclosureClass/Type/Category, attachmentCount, isLate, year/period. Yanıt 2.000 kayıtla sınırlı (tarih aralığını daraltarak aşılır).

### 2. Bildirim detayı
```
GET https://www.kap.org.tr/tr/api/notification/attachment-detail/{disclosureIndex}
Header: Referer: https://www.kap.org.tr/tr/Bildirim/{disclosureIndex}
```
Test sonucu: HTTP 200 — disclosureBasic (şirket, stockCode, tarih, tip) + içerik/ek metadata'sı.

### 3. Diğerleri (topluluk dokümantasyonundan, test edilmedi)
- Şirket listesi: `GET /tr/api/company/items/IGS/A` (IGS = BIST kotasyonlu)
- Şirket arama: `GET /tr/api/member/filter/{ticker}` → mkkMemberOid
- PDF indirme: `GET /tr/api/file/download/{objId}` — dosya Java-serialization sarmalayıcısında (magic bytes `AC ED 00 05` sonrası ayıklanır)

## Dikkat edilecekler
- **WAF davranışı:** ~6 sn'de TCP bağlantısını düşürebiliyor; önce `/tr/bildirim-sorgu`'ya ısınma GET'i atmak ve ~2 istek/sn üzerine çıkmamak öneriliyor. Gerçek tarayıcı UA'sı + doğru Referer şart (bunlarsız timeout aldık, doğru header'larla sorunsuz).
- **Resmî taahhüt yok:** bu, sitenin kendi iç API'si — sözleşmesiz, endpoint habersiz değişebilir. VYK gibi SLA'sı yok. Üretimde kullanılacaksa mevcut VYK entegrasyonunu birincil tutup bunu **ücretsiz yedek/fallback** yapmak en sağlıklısı (ya da tersi: bunu birincil yapıp VYK'dan çıkılacaksa kullanım koşulları/yeniden yayın izni hukuken netleştirilmeli — Barış).
- KAP RSS'i yok (404), eski `/tr/api/disclosures` endpoint'i ölü.

## Elenen alternatifler
- **MKK e-VERİ / VYK:** resmî ama sözleşmeli-ücretli (şu an kullandığımız).
- **Matriks, Foreks vb. vendor:** lisanslı-ücretli.
- **Topluluk projeleri** ([pykap](https://github.com/cemsinano/pykap), [kap-notifier](https://github.com/cahitihac/kap-notifier), [trailingedge endpoint notları](https://github.com/caganco/trailingedge/blob/master/docs/KAP_ENDPOINT_NOTES.md)): hepsi zaten yukarıdaki site API'sini sarıyor — ayrı bir kaynak değil, doğrulama referansı.

## Olası sonraki adım (onay gerektirir)
`lib/kap` fetch katmanına VYK ↔ site-API fallback köprüsü: VYK 401/5xx verirse liste+detay site API'sinden çekilir (alan eşlemesi birebir yakın, disclosureIndex ortak). KAP cron'ları GitHub secret sorunu yaşadığı dönemde de bu yedek işe yarar.

İlgili: [[kap-tercumani-supabase-semasi]] · [[viop-veri-fizibilite]]
