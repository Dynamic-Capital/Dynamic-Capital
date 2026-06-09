import { AuthForm } from "@/components/auth/AuthForm";
import { PageShellVariant } from "@/components/layout/PageShell";

export const metadata = {
  title: "Login – Dynamic Capital",
  description:
    "Access your Dynamic Capital trading dashboard and manage VIP membership settings.",
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function LoginPage() {
  return (
    <>
      <PageShellVariant variant="workspace" />
      <AuthForm />
    </>
  );
}
