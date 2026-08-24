# yahoo-vercel-ua — Yahoo Finance User-Agent Notu

**Kural:** Vercel serverless fonksiyonundan Yahoo Finance (`query1/query2.finance.yahoo.com/v8/finance/chart/...`) çekerken **kısa UA `"Mozilla/5.0"` kullan**. Uzun Chrome-masaüstü UA'sı (`Mozilla/5.0 (Macintosh...) Chrome/126 Safari/537.36`) Vercel IP'lerinden tutarlı biçimde **HTTP 429** yiyor; kısa UA sorunsuz.

**Kanıt (24 Tem 2026):** halka-arz cron'unda `yahooIslemSinyali` uzun UA ile `query1:429,query2:429` döndü; aynı anda `/api/grafik` ve `/api/fiyatlar` (kısa UA) aynı altyapıdan SARAE fiyatını çekebiliyordu. Kısa UA'ya çevirince düzeldi (`7c2f2cd`).

**Uygulama:** `lib/market-pricing.ts`, `/api/grafik`, `/api/fiyatlar`, `/api/temettu` zaten kısa UA kullanıyor — yeni Yahoo entegrasyonlarında da kısa UA. DİKKAT: uzun UA yalnız gerçek tarayıcı davranışı isteyen site scrape'lerinde gerekli (ör. Ahlatcı `lib/halka-arz-kaynak.ts`); Yahoo'da değil.

## İlgili
- [[data-pipeline-notlar]] — genel veri kaynağı tuhaflıkları
- [[hisse-denetim-halka-arz-takvimi-log]] — bu notun yazılmasına yol açan görev
- Launch checklist M-4 → [[launch-checklist-2026]] (Yahoo tek nokta bağımlılığı, hisse fiyatında yedek yok)
