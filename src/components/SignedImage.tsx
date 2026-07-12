"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/supabase";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
};

type CacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, CacheEntry>();

export default function SignedImage({ src, alt = "", className = "" }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    if (src.startsWith("data:") || src.startsWith("http")) {
      setSignedUrl(src);
      return;
    }
    if (src.startsWith("supabase://")) {
      const path = src.replace("supabase://", "");
      const cached = signedUrlCache.get(path);
      const now = Date.now();
      if (cached && cached.expiresAt > now) {
        setSignedUrl(cached.url);
        return;
      }

      let cancelled = false;
      (async () => {
        try {
          const token = await getAccessToken();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch("/api/upload/signed-url", { method: "POST", headers, body: JSON.stringify({ path }) });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error || "Could not get signed URL");
          const url = json.url as string;
          // Cache for slightly less than server expiry (default server expiry is 60s)
          const ttl = (json.expiresIn || 60) * 1000;
          signedUrlCache.set(path, { url, expiresAt: Date.now() + ttl - 2000 });
          if (!cancelled) setSignedUrl(url);
        } catch (err) {
          console.error(err);
          if (!cancelled) setSignedUrl(null);
        }
      })();
      return () => { cancelled = true; };
    }
    setSignedUrl(null);
  }, [src]);

  if (!src) return null;
  if (!signedUrl) return <div className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={signedUrl} alt={alt} className={className} />;
}
