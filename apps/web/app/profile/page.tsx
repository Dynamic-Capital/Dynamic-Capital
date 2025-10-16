import { redirect } from "next/navigation";

import { Column, Heading, Text } from "@/components/dynamic-ui-system";
import { ProfileSettingsForm } from "@/components/auth/ProfileSettingsForm";
import { PageShellVariant } from "@/components/layout/PageShell";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { buildMetadata } from "@/lib/seo";

const pagePath = "/profile";

export const metadata = buildMetadata({
  title: "Profile Settings – Dynamic Capital",
  description:
    "Update your Dynamic Capital profile details, including name and workspace identity metadata.",
  canonicalPath: pagePath,
  noIndex: true,
  noFollow: true,
});

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/profile")}`);
  }

  return (
    <>
      <PageShellVariant variant="workspace" />
      <Column gap="24" paddingY="32" horizontal="stretch" fillWidth>
        <Column maxWidth={32} gap="12" horizontal="stretch">
          <Heading variant="display-strong-s" align="start">
            Profile settings
          </Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="start"
          >
            Maintain the identity that appears across investor dashboards and
            administrative tooling.
          </Text>
        </Column>
        <Column maxWidth={36} fillWidth horizontal="stretch">
          <ProfileSettingsForm />
        </Column>
      </Column>
    </>
  );
}
