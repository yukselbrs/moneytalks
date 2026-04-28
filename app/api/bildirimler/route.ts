import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  const { data } = await supabase.from("bildirimler").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  const { id, tumunu } = await req.json();
  if (tumunu) {
    await supabase.from("bildirimler").update({ okundu: true }).eq("user_id", user.id);
  } else if (id) {
    await supabase.from("bildirimler").update({ okundu: true }).eq("id", id).eq("user_id", user.id);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Giris gerekli" }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Gecersiz token" }, { status: 401 });
  const { id } = await req.json();
  await supabase.from("bildirimler").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
