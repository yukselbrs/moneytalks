# Vault Bakımı — 13 Temmuz 2026 (Faz 3, Bölüm E)

Faz 3 audit oturumunda vault'un kendisine yapılan değişikliklerin kaydı.

## Yapılan değişiklikler
1. **[[parakonusur_handoff_v9]]** — başa "GÜNCEL DEĞİL, bkz. v10" notu eklendi; geçersizleşen 5 iddia (RSI, rate limit, KAP, CRON_SECRET, çift cron) tek tek işaretlendi. İçerik silinmedi (arşiv ilkesi).
2. **[[handoff-v9-fark-analizi]]** — başa arşiv notu: 4 Temmuz fotoğrafı olduğu, güncel denetimin [[2026-07-tam-audit]] olduğu belirtildi.
3. **04-arastirma açıldı** (ilk kez kullanılıyor): [[rakip-analizi]] (Fintables/Midas/Robinhood/eToro, 13 Tem), [[pazar-verileri]] (MKK 6,82M; halka arz Ç2 13,3M katılım; fon 5,89M/~10T₺), [[vergi-mevzuati]] (C.3 fikrinin tabanı). `_index.md`'ye "tazeyse tekrar arama" kullanım kuralı eklendi.
4. **[[00-MOC/_index]]** — güncel giriş noktalarına tam-audit + araştırma notları bağlandı.
5. **[[03-kararlar/_index]]** — bu not + fark-analizi arşiv etiketi eklendi.
6. **05-gunluk/2026-07-13** — oturum günlüğü.

## Birleştirme önerileri (UYGULANMADI — öneri)
- `track1-gorev*` 13 notu tek tek değerli (devam-noktası işlevi bitti ama karar gerekçeleri kalıcı) — birleştirme YERİNE v10 handoff zaten özet görevi görüyor; dokunulmasın.
- `kap-tercumani-supabase-semasi` ile `06-agent-memory/supabase-schema-notlar` arasında KAP şema bilgisi mükerrer: ADR karar-gerekçesi, agent notu operasyonel-referans. Öneri: agent notundaki KAP bölümüne "gerekçe için bkz. [[kap-tercumani-supabase-semasi]]" satırı eklensin, içerik kısaltılsın (Faz 4'te, supabase-schema ajanı kendi notunu güncellerken).
- `brainstorm-2026-07` fikirleri Track 1'de büyük ölçüde uygulandı → dosyanın başına "uygulama durumu" tablosu eklenebilir (5 dk'lık iş, Faz 4 açılışında).

## Vault sağlık gözlemleri
- `docs-vault/Untitled.base` ve `docs-vault/components/` (Obsidian Bases denemesi) untracked duruyor — Barış'ın kişisel çalışması; commit edilmedi, karar Barış'ta (kalıcıysa adlandırıp bir klasöre almak iyi olur).
- 02-urun klasörü hâlâ boş (yalnız _index) — Faz 4 başlarken C fikirlerinden onaylananların spec'leri buraya yazılmalı (index'teki kural zaten böyle).
