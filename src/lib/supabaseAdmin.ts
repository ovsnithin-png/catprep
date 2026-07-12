import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  // Exporting a client that may be undefined; callers must handle missing config.
}

export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export async function uploadImageServer(fileName: string, base64Data: string, userId: string) {
  if (!supabaseAdmin) throw new Error("Supabase admin client is not configured on the server.");
  const bucket = "cat-images";

  // Validate and parse data URL
  const matches = base64Data.match(/^data:(.+);base64,(.*)$/);
  if (!matches) throw new Error("Invalid base64 data URL");
  const mime = matches[1];
  const b64 = matches[2];
  const buffer = Buffer.from(b64, "base64");

  // Basic size and type limits to avoid abuse
  const MAX_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_MIMES = ["image/png", "image/jpeg", "image/webp"];
  if (!ALLOWED_MIMES.includes(mime)) throw new Error("Unsupported image type");
  if (buffer.length > MAX_BYTES) throw new Error("File too large");

  const filename = `${userId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabaseAdmin.storage.from(bucket).upload(filename, buffer, { contentType: mime, upsert: true });
  if (error) throw error;

  // Return the storage path. Client will request a signed URL for private buckets.
  return filename;
}
