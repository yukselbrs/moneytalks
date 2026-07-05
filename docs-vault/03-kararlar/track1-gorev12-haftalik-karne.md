# Track 1 / GÖREV 12 — Portföy Haftalık Karnesi

**Tarih:** 5 Temmuz 2026
**Durum:** Tamamlandı
**Referans:** brainstorm-2026-07.md Fikir 4; strateji raporu Boşluk 3 (portföy sağlık karnesi)

## Ne yapıldı

### 1. Sektör verisi (data-pipeline agent)
- `scripts/add-sektor.mjs`: TradingView Scanner'dan (mevcut `/api/risk` deseni) 606 hissenin sektörü tek istekte çekildi; 20 TradingView sektörü Türkçe'ye sabit tabloyla eşlendi.
- `data/bist-companies.json`: her kayda `sektor` alanı eklendi — **%100 kapsama (606/606)**, başka alan değişmedi. En büyük sektörler: Finans 136, Süreç Endüstrileri 75, Üretici İmalat 63.

### 2. İdempotency tablosu (supabase-schema agent)
- `karne_gonderim` (migrations.sql "GOREV 12" bloğu): `UNIQUE(user_id, hafta_baslangic)` — hafta anahtarı o haftanın Pazartesi'si. Insert-then-check deseni (kap_bildirim_gonderim ile aynı); yazma yalnız service role, kullanıcı kendi geçmişini okur.

### 3. Cron route (`app/api/cron/haftalik-karne/route.ts`)
- Akış: portföy → kullanıcı grupla → bu hafta gönderilmişleri ele → 10'luk batch → snapshot fiyat/getiri_1h + sektör + `/api/risk` + son 7 gün KAP olayları → karne hesapla → claim → `bildirimler` + Resend.
- **Hesaplar:** toplam değer; değer-ağırlıklı haftalık getiri (getiri_1h) XU100 haftalıkla yan yana; sektör dağılımı (top 3 + bar); değer-ağırlıklı risk skoru + portföy betası (kapsam <%60 ise "hesaplanamadı" — yanlış kesinlik yok).
- **Risk fetch bütçesi:** `/api/risk`'in IP limiti 30/dk (GÖREV 3) → cron değere göre sıralı en fazla 25 ticker çeker, 5'li paralel chunk. Route'un 60 sn TTL cache'i tekrar eden ticker'ları bedavaya getirir.
- **Eğitim mikro-içeriği:** 8 nötr kavram (beta, çeşitlendirme mekaniği, bedelsiz, RSI, likidite, F/K, volatilite, temettü), ISO hafta no ile rotasyon.
- `?dry=1` parametresi: yan etkisiz hesap çıktısı (test/gözlem için).

### 4. Zamanlama (`.github/workflows/haftalik-karne-cron.yml`)
- Pazar 17:05/18:05/19:05 UTC (TR 20:05-22:05) — 3 çalıştırma × 10 kullanıcı; idempotency sayesinde örtüşme güvenli, kullanıcı büyüdükçe saat eklemek yeterli.

## Teşhis dili / SPK duruşu
- kap-explainer agent tüm copy'yi denetledi: **temiz** — eylem önerisi sıfır ("çeşitlendir/azalt" yok, "tek sektör ağırlığı yüksek olduğunda dalgalanma geneline yansır" tarifi var), yargı sıfatı yok ("riskli" değil "endeksten oynak"), 3 katmanlı disclaimer (başlık altı + "getiri tahmini değildir" + footer). Üslup kalıpları agent memory'ye işlendi.

## Doğrulama
- `tsc --noEmit` temiz.
- **Dry-run gerçek veriyle uçtan uca çalıştı** (localhost): 5 kullanıcı, hafta anahtarı 2026-06-29 (doğru Pazartesi), sektör dağılımları, değer-ağırlıklı getiri/risk/beta (%100 kapsam), XU100 haftalık +1.01%.
- KAP olayları bölümü tablolar Supabase'e kurulana kadar boş kalır (GÖREV 9 manuel adım 1'e bağlı) — hata üretmez.

## Canlıya alma notu
migrations.sql'deki `karne_gonderim` bloğu SQL Editor'de çalıştırılmalı (GÖREV 9'un 3 tablosuyla birlikte tek seferde yapılabilir). Çalıştırılmazsa cron her seferinde claim insert'te hata alır ve e-posta gitmez (mükerrer gönderim riski YOK — güvenli taraf).
