import { createCanvasMiddleware } from "@/lib/middleware";
import { initSession } from "@/lib/auth";

initSession("ye-wiki");

export const middleware = createCanvasMiddleware({
  appId: "ye-wiki",
  publicRoutes: ["/embed/", "/api/wiki/suggest", "/api/wiki/media/"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"],
};
