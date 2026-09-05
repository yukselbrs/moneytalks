export function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/dashboard";
  try {
    const target = new URL(value, "https://www.parakonusur.com");
    return target.origin === "https://www.parakonusur.com" ? target.pathname + target.search + target.hash : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
