import { NextResponse } from "next/server";
import { getFeaturedContent } from "@/lib/wikipedia/client";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession("ye-wiki");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const featured = await getFeaturedContent(undefined, "en", session.userId);

  if (!featured.tfa) {
    return NextResponse.json({ title: "No featured article today", extract: "" });
  }

  return NextResponse.json({
    title: featured.tfa.title,
    extract: featured.tfa.extract,
    thumbnail: featured.tfa.thumbnail?.source,
    url: `/wiki/${encodeURIComponent(featured.tfa.title)}`,
  });
}
