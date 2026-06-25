import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSuggestions } from "@/lib/wikipedia/client";

export async function GET(request: Request) {
  const session = await getSession("ye-wiki").catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const lang = url.searchParams.get("lang") ?? "en";

  if (!q) return NextResponse.json([]);

  const suggestions = await getSuggestions(q, lang, session.userId);
  return NextResponse.json(suggestions);
}
