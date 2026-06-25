import { NextResponse } from "next/server";
import { getFeaturedContent } from "@/lib/wikipedia/client";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession("ye-wiki");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const featured = await getFeaturedContent(undefined, "en", session.userId);
  const events = (featured.onthisday ?? []).slice(0, 5).map((e) => ({
    year: e.year,
    text: e.text,
    articles: e.pages.slice(0, 2).map((p) => ({
      title: p.title,
      url: `/wiki/${encodeURIComponent(p.title)}`,
    })),
  }));

  return NextResponse.json({ events });
}
