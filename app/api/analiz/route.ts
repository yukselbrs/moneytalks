import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { ticker } = await req.json();

  const mockAnaliz = `**Şirket Profili**
${ticker}, Borsa İstanbul'da işlem gören köklü şirketlerden biridir. Sektöründe güçlü bir konuma sahip olup yurt içi ve yurt dışı pazarlarda faaliyet göstermektedir.

**Finansal Durum**
Temel finansal göstergeler analiz ediliyor. Güncel veriler için şirketin kamuya açık finansal raporlarını incelemenizi öneririz.

**Piyasa Konumu**
Sektör içindeki rekabet ortamı ve şirketin konumlanması değerlendiriliyor.

**Dikkat Noktaları**
Yatırım kararı almadan önce güncel gelişmeleri takip ediniz.`;

  return NextResponse.json({ analiz: mockAnaliz });
}
