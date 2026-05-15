import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireUser(req, supabaseAuth);
    if (!auth.user) return auth.response;

    const { error } = await supabaseAdmin.auth.admin.deleteUser(auth.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatasi" }, { status: 500 });
  }
}
