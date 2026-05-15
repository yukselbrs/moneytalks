import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { extractBearerToken } from "@/lib/utils";

const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{20,4096}$/;

export type AuthFailure = { user: null; response: NextResponse };
export type AuthSuccess = { user: User; response: null };
export type AuthResult = AuthSuccess | AuthFailure;

export async function requireUser(req: NextRequest, supabase: SupabaseClient): Promise<AuthResult> {
  const token = extractBearerToken(req);
  if (!token || !TOKEN_PATTERN.test(token)) {
    return { user: null, response: NextResponse.json({ error: "Giriş gerekli" }, { status: 401 }) };
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, response: NextResponse.json({ error: "Geçersiz token" }, { status: 401 }) };
  }
  return { user: data.user, response: null };
}
