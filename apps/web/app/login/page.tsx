import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = {
  title: "Login – Dynamic Capital",
  description:
    "Access your Dynamic Capital trading dashboard and manage VIP membership settings.",
};

export default function LoginPage() {
  return <AuthForm />;
}
