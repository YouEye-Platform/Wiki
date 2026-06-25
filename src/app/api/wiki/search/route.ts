import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { searchWikipedia } from "@/lib/wikipedia/client";

export async function GET(request: Request) {
  const session = await getSession("ye-wiki").catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const lang = url.searchParams.get("lang") ?? "en";

  if (!q) return NextResponse.json({ results: [], total: 0 });

  const { results, total } = await searchWikipedia(q, limit, lang, session.userId);

  return NextResponse.json({ results, total });
}
