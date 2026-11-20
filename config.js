// Plan it out: sync settings.
//
// Fill these in from your Supabase project (Project Settings → API Keys / Data API):
//   supabaseUrl      e.g. "https://abcdefghijklmnop.supabase.co"
//   supabaseAnonKey  the *publishable* / "anon public" key.
//
// Both values are designed to be public, so committing them is safe. Your data is protected
// by the row-level security rules in supabase/schema.sql, not by keeping this key secret.
// NEVER put the "service_role" / secret key here: it bypasses all security rules.
//
// Leave them empty to use Plan it out on this device only (no sync).
window.PLAN_IT_OUT_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
};
