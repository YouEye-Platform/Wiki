import { getTranslations as getInterfaceTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";
import { getAvailableLanguages } from "@/lib/wikipedia/client";
import { redirect } from "next/navigation";
import { LanguageSelector } from "./language-selector";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export async function WikiSettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const translateInterface = await getInterfaceTranslations("interface");

  const session = await getSession("ye-wiki");
  if (!session) redirect("/api/auth/sso");

  const api = createApiClient("ye-wiki");
  const [settings, languages] = await Promise.all([
    api.getUserSettings(session.userId),
    getAvailableLanguages(session.userId),
  ]);

  const currentLanguage = (settings.language as string) ?? "en";

  return (
    <div className={embedded ? "p-4" : "mx-auto max-w-2xl px-4 py-8"}>
      {!embedded && (
        <div className="mb-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {translateInterface("m76f5d2c331a8")}</Link>
          <h1 className="text-2xl font-bold text-foreground">{translateInterface("mcdd73b9178aa")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {translateInterface("mfb44b993f75c")}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <h2 className="mb-1 text-lg font-semibold">{translateInterface("m4955f8f17f6a")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {translateInterface("m87e666fc4785")}</p>
          <LanguageSelector languages={languages} currentLanguage={currentLanguage} />
        </div>
      </div>
    </div>
  );
}
