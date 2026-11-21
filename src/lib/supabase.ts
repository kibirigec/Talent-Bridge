import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_KEY = 'talent_bridge_supabase_config';

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
}

export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed
      .replace(/\/rest\/v1\/?.*$/i, '')
      .replace(/\/auth\/v1\/?.*$/i, '')
      .replace(/\/storage\/v1\/?.*$/i, '')
      .replace(/\/+$/, '');
  }
}

export function getSavedSupabaseConfig(): SupabaseRuntimeConfig | null {
  const envUrl = normalizeSupabaseUrl(
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) || ''
  );
  const envKey = (
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || ''
  ).trim();
  if (envUrl && envKey && envUrl.startsWith('http')) {
    return { url: envUrl, anonKey: envKey };
  }

  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupabaseRuntimeConfig;
    const cleanUrl = normalizeSupabaseUrl(parsed.url || '');
    const cleanKey = (parsed.anonKey || '').trim();
    if (cleanUrl && cleanKey && cleanUrl.startsWith('http')) {
      return { url: cleanUrl, anonKey: cleanKey };
    }
  } catch {
    return null;
  }
  return null;
}

export function saveSupabaseConfig(config: SupabaseRuntimeConfig | null): void {
  if (!config) {
    localStorage.removeItem(SUPABASE_CONFIG_KEY);
    cachedClient = null;
    cachedSignature = '';
    return;
  }
  const normalized: SupabaseRuntimeConfig = {
    url: normalizeSupabaseUrl(config.url),
    anonKey: config.anonKey.trim(),
  };
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(normalized));
  cachedClient = null;
  cachedSignature = '';
}

let cachedClient: SupabaseClient | null = null;
let cachedSignature = '';

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSavedSupabaseConfig();
  if (!cfg) return null;
  const signature = `${cfg.url}::${cfg.anonKey}`;
  if (!cachedClient || cachedSignature !== signature) {
    cachedClient = createClient(cfg.url, cfg.anonKey);
    cachedSignature = signature;
  }
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return getSavedSupabaseConfig() !== null;
}
