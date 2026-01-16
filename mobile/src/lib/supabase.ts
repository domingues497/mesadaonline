import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../integrations/supabase/types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://xdgoplmfyeisvvfjltzg.supabase.co";
const key =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZ29wbG1meWVpc3Z2ZmpsdHpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDA3MjcsImV4cCI6MjA3MjUxNjcyN30.soWs3fNldMLShJpNP5pE7SZLPeNOvGgzx3v9ZIyI-L8";

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
