import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAvailableLanguages } from "@/lib/wikipedia/client";

export async function GET() {
  const session = await getSession("ye-wiki").catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const languages = await getAvailableLanguages(session.userId);
  return NextResponse.json({ languages });
}
