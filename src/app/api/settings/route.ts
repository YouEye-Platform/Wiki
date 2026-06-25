import { createSettingsHandlers } from "@/lib/routes/settings";
const { GET, PUT } = createSettingsHandlers("ye-wiki");
export { GET, PUT };
