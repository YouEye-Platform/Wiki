import {getTranslations} from "next-intl/server";
import { WikiSettingsPanel } from "./settings-panel";

export async function generateMetadata() {
  const translateInterface = await getTranslations("interface");
  return {title: translateInterface("m1a2d3e8555ce")};
}

export default async function SettingsPage() {
  return <WikiSettingsPanel />;
}
