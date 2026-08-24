---
aliases: [06-agent-memory]
---
# 06-agent-memory — Agent Hafızası

Subagent'ların proje boyunca biriktirdiği kalıcı bilgi burada tutulur.

## Amaç
`.claude/agents/` altındaki subagent'ların (data-pipeline, kap-explainer, supabase-schema) öğrendiği; şema kararları, veri kaynağı tuhaflıkları, prompt kalıpları gibi tekrar tekrar işine yarayacak bilgiler.

## Kullanım
- Her subagent kendi konusuyla ilgili notları buraya yazar/günceller.
- Kod tabanından türetilebilen bilgi (dosya yapısı, geçmiş fix'ler) buraya yazılmaz — sadece non-obvious, kalıcı bilgi.

## Notlar
- [[data-pipeline-notlar]] — Yahoo Finance / KAP / MKK veri çekme tuhaflıkları
- [[yahoo-vercel-ua]] — Vercel IP'sinden Yahoo çekerken kısa UA zorunlu (uzun UA 429 yer)
- [[kap-explainer-notlar]] — KAP özet üretimi üslup ve prompt öğrenimleri
- [[supabase-schema-notlar]] — şema kararları ve migration geçmişi notları

## İlgili
- Subagent tanımları → `.claude/agents/`
- Mimari kararlar → [[03-kararlar]]
