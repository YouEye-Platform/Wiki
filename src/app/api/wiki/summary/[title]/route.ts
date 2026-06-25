import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getArticleSummary } from "@/lib/wikipedia/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ title: string }> }
) {
  const session = await getSession("ye-wiki").catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title } = await params;
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") ?? "en";

  const summary = await getArticleSummary(
    decodeURIComponent(title),
    lang,
    session.userId,
  );

  return NextResponse.json(summary);
}
