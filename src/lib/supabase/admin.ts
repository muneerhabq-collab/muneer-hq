import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** عميل بصلاحية كاملة - للكرون فقط، ممنوع يستخدم بالمتصفح */
export function supabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
