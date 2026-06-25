import { initSession } from "@/lib/auth";
import { createSSOHandler } from "@/lib/routes/auth";

initSession("ye-wiki");

export const GET = createSSOHandler({ appId: "ye-wiki", externalUrlEnv: "WIKI_EXTERNAL_URL" });
