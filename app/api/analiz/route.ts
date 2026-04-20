import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { ticker } = await req.json();

  const mockAnaliz = `**Sirket Profili**
${ticker}, Borsa Istanbul'da islem goren koklü sirketlerden biridir. Sektorunde guclu bir konuma sahip olup yurt ici ve yurt disi pazarlarda faaliyet gostermektedir.

**Finansal Durum**
Temel finansal gostergeler analiz ediliyor. Guncel veriler icin sirketin kamuya acik finansal raporlarini incelemenizi oneririz.

**Piyasa Konumu**
Sektor icindeki rekabet ortami ve sirketin konumlanmasi degerlendiriliyor.

**Dikkat Noktalari**
Yatirim karari almadan once guncel gelismeleri takip ediniz.

Bu analiz yalnizca bilgilendirme amaclidir ve yatirim tavsiyesi niteligini tasimazHer turlu yatirim karari yatirimcinin kendi sorumlulugunadadir.`;

  return NextResponse.json({ analiz: mockAnaliz });
}
