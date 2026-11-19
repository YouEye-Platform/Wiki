import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: false,
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(withNextIntl({
  // The release line and git tree (.youeye/build/lib.sh), never a build name.
  env: { YOUEYE_LINE: process.env.YOUEYE_LINE || "0.0.0", YOUEYE_SOURCE_TREE: process.env.YOUEYE_SOURCE_TREE || "" },
  generateBuildId: async () => process.env.YOUEYE_BUILD_ID || null,
  output: "standalone" as const,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
}));
