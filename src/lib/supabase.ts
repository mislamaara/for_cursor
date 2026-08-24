import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && url.startsWith("http"));
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("未配置 Supabase。请在 .env 或 GitHub Secrets 里设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。");
  }
  if (!client) {
    client = createClient(url!, anonKey!);
  }
  return client;
}

export function authRedirectUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  return `${window.location.origin}${base}me`;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
