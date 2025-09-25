import { AuthForm } from "@/components/auth/AuthForm";
import { brand } from "@/config/brand";

export const metadata = {
  title: `Login – ${brand.identity.name}`,
  description:
    `Access your ${brand.identity.name} trading dashboard and manage VIP membership settings.`,
};

export default function LoginPage() {
  return <AuthForm />;
}
