import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, supabase);
  if (!auth.user) return auth.response;
  const user = auth.user;
  const { data } = await supabase.from("bildirimler").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req, supabase);
  if (!auth.user) return auth.response;
  const user = auth.user;
  const { id, tumunu } = await req.json();
  if (tumunu) {
    await supabase.from("bildirimler").update({ okundu: true }).eq("user_id", user.id);
  } else if (id) {
    await supabase.from("bildirimler").update({ okundu: true }).eq("id", id).eq("user_id", user.id);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req, supabase);
  if (!auth.user) return auth.response;
  const user = auth.user;
  const { id } = await req.json();
  await supabase.from("bildirimler").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
