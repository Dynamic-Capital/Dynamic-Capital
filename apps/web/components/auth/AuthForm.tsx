"use client";

import { useState } from "react";

import {
  Button,
  Column,
  Heading,
  Input,
  PasswordInput,
  Row,
  Text,
} from "@once-ui-system/core";
import { brand } from "@/config/brand";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

interface AuthFormState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword: string;
}

type AuthMode = "signin" | "signup";

const INITIAL_STATE: AuthFormState = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  confirmPassword: "",
};

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AuthFormState>(INITIAL_STATE);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setError(null);
  };

  const resetForm = () => {
    setFormData(INITIAL_STATE);
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password");
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await signIn(
        formData.email,
        formData.password,
      );
      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError(
            "Check your inbox and confirm your email before signing in.",
          );
        } else {
          setError(signInError.message);
        }
      } else {
        resetForm();
        toast({
          title: "Welcome back",
          description: "You’re signed in. Head to the dashboard to continue.",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.email || !formData.password || !formData.firstName) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
      );

      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          setError(
            "An account with this email already exists. Please sign in instead.",
          );
        } else {
          setError(signUpError.message);
        }
      } else {
        toast({
          title: "Account created",
          description:
            "Check your email to confirm your account and unlock access.",
        });
        resetForm();
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = mode === "signin" ? handleSignIn : handleSignUp;

  return (
    <Column
      fillWidth
      horizontal="center"
      align="center"
      padding="xl"
      background="page"
      gap="32"
      style={{ minHeight: "100vh" }}
    >
      <Column
        maxWidth={28}
        fillWidth
        background="surface"
        border="neutral-alpha-medium"
        radius="l"
        padding="xl"
        gap="24"
        shadow="xl"
      >
        <Column gap="12" align="center">
          <Heading variant="display-strong-xs">{brand.identity.name}</Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="center"
          >
            Access your trading dashboard, manage VIP membership, and review
            your automation settings.
          </Text>
        </Column>
        <Row gap="12" horizontal="center" wrap>
          <Button
            size="s"
            variant="secondary"
            data-border="rounded"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            disabled={mode === "signin"}
          >
            Sign in
          </Button>
          <Button
            size="s"
            variant="secondary"
            data-border="rounded"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            disabled={mode === "signup"}
          >
            Create account
          </Button>
        </Row>
        <form onSubmit={onSubmit}>
          <Column gap="16">
            {mode === "signup"
              ? (
                <Row gap="12" wrap>
                  <Column flex={1} minWidth={12} gap="4">
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      First name
                    </Text>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Noah"
                      aria-label="First name"
                      required
                    />
                  </Column>
                  <Column flex={1} minWidth={12} gap="4">
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Last name
                    </Text>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Sterling"
                      aria-label="Last name"
                    />
                  </Column>
                </Row>
              )
              : null}
            <Column gap="4">
              <Text variant="body-default-s" onBackground="neutral-weak">
                Email
              </Text>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@dynamic.capital"
                aria-label="Email"
                required
              />
            </Column>
            <PasswordInput
              id="password"
              name="password"
              label="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
            {mode === "signup"
              ? (
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              )
              : null}
            {error
              ? (
                <Text variant="body-default-s" onBackground="brand-weak">
                  {error}
                </Text>
              )
              : null}
            <Button
              type="submit"
              size="m"
              variant="secondary"
              data-border="rounded"
              disabled={loading}
            >
              {loading
                ? "Processing…"
                : mode === "signin"
                ? "Sign in"
                : "Create account"}
            </Button>
          </Column>
        </form>
        <Column gap="8" align="center">
          <Text
            variant="body-default-s"
            onBackground="neutral-weak"
            align="center"
          >
            By continuing you agree to desk security policies and trading
            disclaimers.
          </Text>
        </Column>
      </Column>
    </Column>
  );
}

export default AuthForm;
