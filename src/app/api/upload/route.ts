import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { uploadImageServer, supabaseAdmin } from "@/lib/supabaseAdmin";

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
    const body = await req.json();
    const { fileName, dataUrl } = body as { fileName: string; dataUrl: string };
    if (!fileName || !dataUrl) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    const userId = await getUserIdFromReq(req);
    const storagePath = await uploadImageServer(fileName, dataUrl, userId);
    return NextResponse.json({ path: storagePath });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
