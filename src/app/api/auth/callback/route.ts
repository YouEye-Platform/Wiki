import { initSession } from "@/lib/auth";
import { createCallbackHandler } from "@/lib/routes/auth";

initSession("ye-wiki");

export const GET = createCallbackHandler({ appId: "ye-wiki", externalUrlEnv: "WIKI_EXTERNAL_URL" });
