import { initSession } from "@/lib/auth";
import { createLogoutHandler } from "@/lib/routes/auth";

initSession("ye-wiki");

export const POST = createLogoutHandler({ appId: "ye-wiki", externalUrlEnv: "WIKI_EXTERNAL_URL" });
