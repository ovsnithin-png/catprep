import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { uploadImageServer, supabaseAdmin } from "@/lib/supabaseAdmin";

function isDataUrl(value: any) {
  return typeof value === "string" && value.startsWith("data:");
}

function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

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
    const { state } = body as { state: any };
    if (!state) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    const out = clone(state);
    const uploads: Array<Promise<void>> = [];

    const handleValue = (parent: any, key: string) => {
      const val = parent[key];
      if (!isDataUrl(val)) return;
      const fileName = `migrated-${Date.now()}.png`;
      const p = uploadImageServer(fileName, val, userId).then((path) => {
        parent[key] = `supabase://${path}`;
      });
      uploads.push(p);
    };

    // importantQuestions
    if (Array.isArray(out.importantQuestions)) {
      out.importantQuestions.forEach((q: any) => { if (q && q.imageUrl) handleValue(q, "imageUrl"); });
    }

    // notes
    if (Array.isArray(out.notes)) {
      out.notes.forEach((n: any) => { if (n && n.imageUrl) handleValue(n, "imageUrl"); });
    }

    // revisionTopics
    if (Array.isArray(out.revisionTopics)) {
      out.revisionTopics.forEach((r: any) => { if (r && r.imageUrl) handleValue(r, "imageUrl"); });
    }

    // topics (possible unexpected imageUrl on topics or subsections)
    if (Array.isArray(out.topics)) {
      out.topics.forEach((t: any) => {
        if (t && t.imageUrl) handleValue(t, "imageUrl");
        if (Array.isArray(t.subSections)) {
          t.subSections.forEach((s: any) => { if (s && s.imageUrl) handleValue(s, "imageUrl"); });
        }
      });
    }

    await Promise.all(uploads);

    return NextResponse.json({ state: out });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
