import type { Metadata } from "next";

import { AppearanceSettingsPanel } from "@/components/settings/AppearanceSettingsPanel";

export const metadata: Metadata = {
  title: "Appearance settings",
  description:
    "Adjust theme preferences and apply Theme Pass palettes across the Dynamic Capital dashboard.",
};

export default function AppearanceSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <AppearanceSettingsPanel />
    </div>
  );
}
