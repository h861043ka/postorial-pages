// Supabaseクライアント設定
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// anon keyは公開前提（RLSでデータ保護）。.envが優先、フォールバックは開発用
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://olzjjfmtpykgxmgyumji.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sempqZm10cHlrZ3htZ3l1bWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjM4ODUsImV4cCI6MjA4NjgzOTg4NX0.GlbZbXQAYLWBF5L98fLxZ2usVEOij3lRKaKXDuxu1cM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
