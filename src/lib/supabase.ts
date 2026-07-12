import { createClient } from "@supabase/supabase-js";
import type { CatAppState } from "./cat-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function isSupabaseConfigured() {
  return Boolean(supabase);
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured yet. Add your URL and anon key first.") };
  }

  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured yet. Add your URL and anon key first.") };
  }

  return supabase.auth.signUp({ email, password });
}

export async function signOutFromSupabase() {
  if (!supabase) {
    return { error: new Error("Supabase is not configured yet. Add your URL and anon key first.") };
  }

  return supabase.auth.signOut();
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

export async function loadStateFromSupabase(userId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("cat_app_state")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.data as CatAppState | null) ?? null;
}

export async function syncStateToSupabase(userId: string, state: CatAppState) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("cat_app_state")
    .upsert(
      {
        id: userId,
        user_id: userId,
        data: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function uploadImageToStorage(file: File, userId: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const bucket = "cat-images";
  const filename = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filename, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
  return urlData.publicUrl;
}

export async function removeImageFromStorage(path: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const bucket = "cat-images";
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
  return true;
}
