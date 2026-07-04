# ADR: KAP Tercümanı Supabase Şeması

**Tarih:** 2026-07-04
**Ajan:** supabase-schema
**Durum:** Uygulandı (`supabase/migrations.sql` sonuna eklendi, SQL Editor'de elle çalıştırılacak)

## Bağlam
KAP Tercümanı, ParaKonuşur'un omurga özelliği (strateji raporu, 1 Temmuz). Akış:
cron KAP API'den yeni bildirimleri artımlı çeker (`disclosureIndex` cursor'lı) →
tabloya yazar → Claude ile 3 katmanlı özet **bir kez** üretilip cache'lenir →
izleme listesinde ilgili ticker'ı olan kullanıcılara e-posta gider → aynı içerik
SEO sayfalarında (Görev 10) herkese açık gösterilir.

Kısıt: özet üretimi pahalı (Claude çağrısı) → bildirim başına bir kez üretilmeli.
E-posta çok kullanıcıya gider → mükerrer gönderim engellenmeli (idempotency).

## Karar
Üç tablo eklendi:

1. **`kap_bildirimleri`** — bir satır = bir KAP bildirimi + cache'lenmiş AI özet.
   - `disclosure_index BIGINT UNIQUE`: KAP doğal anahtarı, aynı zamanda cache anahtarı. Cron `ON CONFLICT (disclosure_index) DO NOTHING` ile mükerrer yazımı önler.
   - `ticker TEXT` (birincil) + `tickerlar TEXT[]`: KAP `senderExchCodes` çoklu kod dönebilir. Birincil kolon basit sorgu için, dizi array-overlap eşleşme için.
   - `bildirim_tipi TEXT` + genişleyebilir CHECK constraint (ozel_durum, finansal_rapor, pay_geri_alim, sermaye_artirimi, temettu, genel_kurul, diger). CHECK ayrı `ALTER ... DROP/ADD CONSTRAINT` bloğunda → yeni tip eklemek idempotent.
   - `ham_detay JSONB`: KAP disclosureDetail ham JSON'u, kaynak-of-truth (yeniden özet/denetim).
   - `ozet_tek_cumle`, `ozet_ne_demek`: cache'lenmiş 2 AI katmanı. **3. katman (portföy/izleme bağlamı) tabloda YOK** — kullanıcıya göre gönderim anında şablonla kurulur, Claude'a gitmez.
   - `durum` (yeni/ozetlendi/hata): özet aşaması. Cron "yeni" olanları özetler.

2. **`kap_bildirim_gonderim`** — (bildirim_id, user_id) junction, UNIQUE.
   E-posta idempotency'sinin gerçek yeri. Ana tablodaki `durum` per-bildirim özet aşamasını izler; gönderim per-user'dır. Cron `ON CONFLICT DO NOTHING` ile aynı çifte ikinci e-posta göndermez.

3. **`kap_cursor`** — tek satırlık (id=1, CHECK), `son_index BIGINT`.
   Artımlı polling cursor'u.

## Alternatifler
- **Cursor'u `rate_limits` key-value tablosuna koymak:** elendi. Değer BIGINT; key-value TEXT'te tip güvenliği yok, semantik karışık. Ayrı tek-satır tablo daha okunaklı.
- **Cursor yerine `MAX(disclosure_index)`:** elendi. Cron ODA-dışı bildirimleri "görür" ama tabloya yazmayabilir; MAX yalnız yazılanları bilir → aynı aralık tekrar taranır. Cursor "görülen en yüksek index"i tutar.
- **E-posta durumunu ana tabloda tek `gonderildi` boolean:** elendi. Bir bildirim N kullanıcıya gider; tek boolean per-user idempotency veremez. Junction zorunlu.
- **3. katmanı tabloda saklamak:** elendi. Kullanıcıya özel (portföy/izleme), Claude'a gitmiyor, gönderim anında şablonla üretilir → cache'lemenin faydası yok, gereksiz denormalizasyon.

## Sonuç / RLS
- **Yazma:** üç tabloda da yalnız service role (cron). Yazma policy'si tanımlanmadı.
- **Okuma:**
  - `kap_bildirimleri`: anon + authenticated SELECT serbest (kamuya açık KAP + SEO). Operasyonel kolonlar (durum, özet zamanı) kişisel veri değil, sızması sorun değil.
  - `kap_bildirim_gonderim`: yalnız kendi satırını okuyabilir (`auth.uid() = user_id`) — kişisel gönderim geçmişi.
  - `kap_cursor`: RLS açık, policy yok → yalnız service role (rate_limits deseni).
- **Takas:** `tickerlar` GIN + ayrı `ticker` b-tree = iki index bakımı, ama izleme eşleşmesi (array-overlap) ve basit SEO listelemesi ayrı erişim yolları. Kabul edildi.

## Rollback
```sql
DROP TABLE IF EXISTS public.kap_bildirim_gonderim;  -- once child (FK)
DROP TABLE IF EXISTS public.kap_bildirimleri;
DROP TABLE IF EXISTS public.kap_cursor;
```
Tablolar yeni; hiçbir mevcut tabloya kolon/constraint eklenmedi, veri kaybı riski yok. `set_updated_at()` fonksiyonu paylaşılan (diğer tablolar kullanıyor) — DROP edilmez.
