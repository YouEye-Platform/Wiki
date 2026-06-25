import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { proxyMedia } from "@/lib/wikipedia/client";

// In-memory image cache to avoid re-fetching from Wikimedia on every request.
// Wikimedia responses can be slow (5+ seconds on cold), causing browser timeouts
// when many images load simultaneously on article pages.
const IMAGE_CACHE = new Map<string, { data: Buffer; contentType: string; expires: number }>();
const CACHE_TTL = 3600_000; // 1 hour
const MAX_CACHE_ENTRIES = 200;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getSession("ye-wiki").catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { path } = await params;
  const mediaPath = path.join("/");

  // Check memory cache first
  const cached = IMAGE_CACHE.get(mediaPath);
  if (cached && Date.now() < cached.expires) {
    return new NextResponse(new Uint8Array(cached.data), {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const result = await proxyMedia(mediaPath, session.userId);
  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  // Cache in memory (evict oldest if full)
  if (IMAGE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldest = IMAGE_CACHE.keys().next().value;
    if (oldest) IMAGE_CACHE.delete(oldest);
  }
  IMAGE_CACHE.set(mediaPath, {
    data: result.buffer,
    contentType: result.contentType,
    expires: Date.now() + CACHE_TTL,
  });

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
