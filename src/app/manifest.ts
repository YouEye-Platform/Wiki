/**
 * Web App Manifest — Wiki App PWA
 *
 * Dynamic manifest that uses the app's registered name and icon from the platform.
 * Falls back to defaults if the platform API is unreachable.
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.APP_NAME || "Wiki";
  const platformName = process.env.PLATFORM_NAME || "YouEye";

  return {
    name: `${appName} — ${platformName}`,
    short_name: appName,
    description: "Privacy-respecting Wikipedia reader",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#3b82f6",
    orientation: "any",
    icons: [
      {
        src: "/api/pwa/icon?size=192",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/api/pwa/icon?size=512",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/api/pwa/icon?size=512&maskable=1",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
