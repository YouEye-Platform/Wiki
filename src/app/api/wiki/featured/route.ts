import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFeaturedContent } from "@/lib/wikipedia/client";

export async function GET(request: Request) {
  const session = await getSession("ye-wiki").catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") ?? "en";

  const featured = await getFeaturedContent(undefined, lang, session.userId);

  return NextResponse.json(featured);
}
