import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getUserIdFromReq(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.split(" ")[1];
  if (!token) throw new Error("Missing Authorization token");
  if (!supabaseAdmin) throw new Error("Server not configured");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) throw error;
  return data.user?.id as string;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromReq(req);
    const body = await req.json();
    const { path, expires = 60 } = body as { path: string; expires?: number };
    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });
    if (!supabaseAdmin) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    const bucket = "cat-images";
    // Optional: ensure path is under user's folder
    if (!path.startsWith(`${userId}/`)) return NextResponse.json({ error: "Not authorized for this file" }, { status: 403 });

    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expires);
    if (error) throw error;
    return NextResponse.json({ url: data.signedUrl, expiresIn: expires });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
