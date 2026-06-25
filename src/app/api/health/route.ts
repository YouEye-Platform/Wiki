import { createHealthHandler } from "@/lib/routes/health";
export const GET = createHealthHandler({ appId: "ye-wiki" });
