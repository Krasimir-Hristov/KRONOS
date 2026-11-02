import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/databaseTypes';
import { getSupabaseConfig } from '@/config/envConfig';

export const createBrowserSupabaseClient = () => {
  const { url, publishableKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
};
