-- Profil kimliği, e-posta ve Pro hakları yalnız sunucu tarafından yönetilir.
BEGIN;
REVOKE INSERT, UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, email, username, full_name, avatar_url, created_at, updated_at, is_pro, pro_until),
       UPDATE (id, email, username, full_name, avatar_url, created_at, updated_at, is_pro, pro_until)
ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, username, full_name, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (username, full_name, avatar_url) ON public.profiles TO authenticated;
COMMIT;
