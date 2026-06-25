/**
 * Root Layout — Wiki App (Canvas SDK rebuild)
 */

import { InstallBanner } from "@/components/pwa/install-banner";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";
import {
  getThemeCSSVariables,
  getThemeMode,
  generateThemeStyle,
  generateSystemThemeScript,
} from "@/lib/theme";
import { WikiHeader } from "@/components/layout/wiki-header";
import { HeaderSearchBar } from "@/components/layout/header-search-bar";
import { LaunchRequirementsBanner } from "@/components/launch-requirements-banner";

export async function generateMetadata(): Promise<Metadata> {
  const appName = process.env.APP_NAME || "Wiki";
  return {
    title: appName,
    description: "Privacy-respecting Wikipedia reader",
    icons: { icon: "/api/pwa/icon?size=32" },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: appName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession("ye-wiki").catch(() => null);

  let headerConfig = null;
  let launchRequirements = null;
  let userLang = "en";
  if (session) {
    const api = createApiClient("ye-wiki");
    [headerConfig, launchRequirements] = await Promise.all([
      api.fetchHeaderConfig(session.userId),
      api.getLaunchRequirements(session.userId),
    ]);
    const settings = await api.getUserSettings(session.userId).catch(() => ({} as Record<string, unknown>));
    userLang = typeof settings.language === "string" ? settings.language : "en";
  }

  const cssVariables = getThemeCSSVariables(headerConfig);
  const themeStyle = generateThemeStyle(cssVariables);
  const themeMode = getThemeMode(headerConfig);
  const isSystemTheme = themeMode === "system";
  const htmlClass = isSystemTheme ? "" : themeMode;

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={htmlClass} suppressHydrationWarning>
      <head>
        {isSystemTheme && (
          <script dangerouslySetInnerHTML={{ __html: generateSystemThemeScript() }} />
        )}
        {themeStyle && (
          <style
            id="ye-theme"
            dangerouslySetInnerHTML={{ __html: themeStyle }}
          />
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <WikiHeader>
            <HeaderSearchBar lang={userLang} />
          </WikiHeader>
          <LaunchRequirementsBanner appName="Wiki" requirements={launchRequirements} />
          <main>{children}</main>
          <InstallBanner appName="Wiki" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
