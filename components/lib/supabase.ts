import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient (@supabase/ssr): oturum cookie'de tutulur — /auth/callback'in
// SSR ile yazdigi cookie'yle AYNI depo. Onceki createClient localStorage kullaniyordu;
// iki ayri oturum deposu vardi (OAuth cookie + form login localStorage).
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
