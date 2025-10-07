"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";

import {
  Button,
  Column,
  Heading,
  Input,
  PasswordInput,
  Row,
  Text,
} from "@/components/dynamic-ui-system";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    signIn,
    signUp,
    session,
    loading: authLoading,
    sendEmailOtp,
    signInWithEmailOtp,
    signUpWithPhone,
    signInWithPhoneOtp,
    verifyPhoneOtp,
    resetPassword,
    signInWithOAuth,
  } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AuthFormState>(INITIAL_STATE);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkToken, setMagicLinkToken] = useState("");
  const [magicLinkStatus, setMagicLinkStatus] = useState<string | null>(null);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [phoneAuth, setPhoneAuth] = useState({
    phone: "",
    password: "",
    otp: "",
  });
  const [phoneStatus, setPhoneStatus] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSubmitting, setPhoneSubmitting] = useState({
    signup: false,
    sendOtp: false,
    verify: false,
  });
  const [oauthLoading, setOauthLoading] = useState<Provider | null>(null);

  const redirectParam = searchParams?.get("redirect") ?? null;
  const redirectPath = useMemo(() => {
    if (!redirectParam) {
      return null;
    }

    if (!redirectParam.startsWith("/") || redirectParam.startsWith("//")) {
      return null;
    }

    return redirectParam;
  }, [redirectParam]);

  const resolvedRedirect = useMemo(
    () => redirectPath ?? "/investor",
    [redirectPath],
  );

  const resolvedRedirectLabel = useMemo(() => {
    if (resolvedRedirect === "/investor") {
      return "investor overview";
    }

    if (resolvedRedirect === "/") {
      return "home page";
    }

    const normalized = resolvedRedirect.startsWith("/")
      ? resolvedRedirect.slice(1)
      : resolvedRedirect;

    return `${normalized.replace(/-/g, " ")} page`;
  }, [resolvedRedirect]);

  const modeParam = searchParams?.get("mode") ?? null;
  useEffect(() => {
    if (modeParam === "signup" || modeParam === "signin") {
      setMode(modeParam);
      setError(null);
    }
  }, [modeParam]);

  useEffect(() => {
    if (!authLoading && session) {
      router.replace(resolvedRedirect);
      router.refresh();
    }
  }, [authLoading, resolvedRedirect, router, session]);

  const dynamicDescription = useMemo(() => {
    if (redirectPath?.startsWith("/investor")) {
      return "Sign in to review investor performance, token burns, and allocation analytics.";
    }

    if (redirectPath) {
      const normalized = redirectPath.startsWith("/")
        ? redirectPath.slice(1)
        : redirectPath;
      return `Sign in to continue to the ${
        normalized.replace(/-/g, " ")
      } page.`;
    }

    return "Access your trading dashboard, manage VIP membership, and review your automation settings.";
  }, [redirectPath]);

  const hasInvalidRedirect = redirectParam != null && !redirectPath;

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
    setIsSubmitting(true);
    setError(null);

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password");
      setIsSubmitting(false);
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
          description: resolvedRedirect === "/investor"
            ? "You’re signed in. Routing you to the investor overview."
            : `You’re signed in. Taking you to the ${resolvedRedirectLabel}.`,
        });
        router.replace(resolvedRedirect);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.email || !formData.password || !formData.firstName) {
      setError("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsSubmitting(false);
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
      setIsSubmitting(false);
    }
  };

  const onSubmit = mode === "signin" ? handleSignIn : handleSignUp;

  const oauthProviders: Array<{ provider: Provider; label: string }> = [
    { provider: "github", label: "Continue with GitHub" },
    { provider: "google", label: "Continue with Google" },
  ];

  const resolveRedirectTo = () => {
    if (typeof window === "undefined") {
      return undefined;
    }
    return `${window.location.origin}${resolvedRedirect}`;
  };

  const handleResetPassword = async () => {
    const targetEmail = formData.email || magicLinkEmail;
    if (!targetEmail) {
      setMagicLinkError("Enter your email to receive a reset link.");
      return;
    }

    setIsResettingPassword(true);
    setMagicLinkError(null);
    try {
      const { error: resetError } = await resetPassword(targetEmail);
      if (resetError) {
        setMagicLinkError(resetError.message);
      } else {
        toast({
          title: "Password reset email sent",
          description:
            "Check your inbox for a link to update your password securely.",
        });
      }
    } catch (err) {
      setMagicLinkError(
        err instanceof Error ? err.message : "Unexpected error",
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!magicLinkEmail) {
      setMagicLinkError("Enter an email address to send a magic link.");
      return;
    }

    setIsSendingMagicLink(true);
    setMagicLinkError(null);
    setMagicLinkStatus(null);
    try {
      const { error: otpError } = await sendEmailOtp(magicLinkEmail);
      if (otpError) {
        setMagicLinkError(otpError.message);
      } else {
        setMagicLinkStatus(
          "Magic link sent. Check your inbox for a secure login link.",
        );
        toast({
          title: "Magic link dispatched",
          description: `We sent a sign-in link to ${magicLinkEmail}.`,
        });
      }
    } catch (err) {
      setMagicLinkError(
        err instanceof Error ? err.message : "Unexpected error",
      );
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!magicLinkEmail || !magicLinkToken) {
      setMagicLinkError("Provide both your email and the code we sent you.");
      return;
    }

    setIsVerifyingEmailOtp(true);
    setMagicLinkError(null);
    try {
      const { error: verificationError } = await signInWithEmailOtp(
        magicLinkEmail,
        magicLinkToken,
      );
      if (verificationError) {
        setMagicLinkError(verificationError.message);
      } else {
        setMagicLinkStatus("Email OTP verified. You are now signed in.");
        toast({
          title: "Signed in",
          description: "OTP verified successfully.",
        });
        setMagicLinkToken("");
      }
    } catch (err) {
      setMagicLinkError(
        err instanceof Error ? err.message : "Unexpected error",
      );
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  const handlePhoneSignUp = async () => {
    if (!phoneAuth.phone || !phoneAuth.password) {
      setPhoneError("Enter a phone number and password to create an account.");
      return;
    }

    setPhoneSubmitting((prev) => ({ ...prev, signup: true }));
    setPhoneError(null);
    setPhoneStatus(null);
    try {
      const { error: signUpError } = await signUpWithPhone(
        phoneAuth.phone,
        phoneAuth.password,
      );
      if (signUpError) {
        setPhoneError(signUpError.message);
      } else {
        setPhoneStatus(
          "Phone sign-up initiated. Verify the SMS code to finish.",
        );
        toast({
          title: "Phone sign-up",
          description: "We sent an SMS with your verification code.",
        });
      }
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPhoneSubmitting((prev) => ({ ...prev, signup: false }));
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!phoneAuth.phone) {
      setPhoneError("Enter a phone number to request an SMS code.");
      return;
    }

    setPhoneSubmitting((prev) => ({ ...prev, sendOtp: true }));
    setPhoneError(null);
    setPhoneStatus(null);
    try {
      const { error: otpError } = await signInWithPhoneOtp(phoneAuth.phone);
      if (otpError) {
        setPhoneError(otpError.message);
      } else {
        setPhoneStatus("SMS code sent. Enter the 6-digit code to verify.");
        toast({
          title: "SMS sent",
          description: `We texted a verification code to ${phoneAuth.phone}.`,
        });
      }
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPhoneSubmitting((prev) => ({ ...prev, sendOtp: false }));
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneAuth.phone || !phoneAuth.otp) {
      setPhoneError("Enter both your phone number and the SMS code.");
      return;
    }

    setPhoneSubmitting((prev) => ({ ...prev, verify: true }));
    setPhoneError(null);
    try {
      const { error: verificationError } = await verifyPhoneOtp(
        phoneAuth.phone,
        phoneAuth.otp,
      );
      if (verificationError) {
        setPhoneError(verificationError.message);
      } else {
        setPhoneStatus("Phone verified. You're now authenticated.");
        toast({
          title: "Phone verified",
          description: "SMS code accepted successfully.",
        });
        setPhoneAuth((prev) => ({ ...prev, otp: "" }));
      }
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setPhoneSubmitting((prev) => ({ ...prev, verify: false }));
    }
  };

  const handleOAuthSignIn = async (provider: Provider) => {
    setOauthLoading(provider);
    try {
      const redirectTo = resolveRedirectTo();
      const { data, error: oauthError } = await signInWithOAuth(provider, {
        redirectTo,
      });
      if (oauthError) {
        toast({
          title: "OAuth sign-in failed",
          description: oauthError.message,
          variant: "destructive",
        });
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast({
        title: "Unexpected OAuth error",
        description: err instanceof Error
          ? err.message
          : "Unable to start provider sign-in.",
        variant: "destructive",
      });
    } finally {
      setOauthLoading(null);
    }
  };

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
          <Heading variant="display-strong-xs">Dynamic Capital</Heading>
          <Text
            variant="body-default-m"
            onBackground="neutral-weak"
            align="center"
          >
            {dynamicDescription}
          </Text>
          {hasInvalidRedirect
            ? (
              <Text
                variant="body-default-s"
                onBackground="brand-weak"
                align="center"
              >
                We couldn’t verify the requested redirect, so you’ll land on the
                {" "}
                {resolvedRedirectLabel} after signing in.
              </Text>
            )
            : null}
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
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Processing…"
                : mode === "signin"
                ? "Sign in"
                : "Create account"}
            </Button>
            <Button
              type="button"
              size="s"
              variant="tertiary"
              data-border="rounded"
              disabled={isResettingPassword}
              onClick={handleResetPassword}
            >
              {isResettingPassword
                ? "Sending reset link…"
                : "Email me a password reset link"}
            </Button>
          </Column>
        </form>
        <Column gap="16">
          <Column gap="8">
            <Text variant="body-strong-m">Passwordless email access</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Send yourself a magic link or verify a one-time passcode when you
              prefer passwordless sign-in.
            </Text>
          </Column>
          <Column gap="8">
            <Input
              id="magicLinkEmail"
              name="magicLinkEmail"
              type="email"
              value={magicLinkEmail}
              onChange={(event) => {
                setMagicLinkEmail(event.target.value);
                setMagicLinkError(null);
              }}
              placeholder="analyst@dynamic.capital"
              aria-label="Magic link email"
            />
            <Row gap="12" wrap>
              <Button
                type="button"
                size="s"
                variant="secondary"
                data-border="rounded"
                disabled={isSendingMagicLink}
                onClick={handleSendMagicLink}
              >
                {isSendingMagicLink ? "Sending…" : "Send magic link"}
              </Button>
              <Button
                type="button"
                size="s"
                variant="secondary"
                data-border="rounded"
                disabled={isVerifyingEmailOtp}
                onClick={handleVerifyEmailOtp}
              >
                {isVerifyingEmailOtp ? "Verifying…" : "Verify email OTP"}
              </Button>
            </Row>
            <Input
              id="magicLinkToken"
              name="magicLinkToken"
              value={magicLinkToken}
              onChange={(event) => {
                setMagicLinkToken(event.target.value);
                setMagicLinkError(null);
              }}
              placeholder="Enter 6-digit code"
              aria-label="Email OTP token"
            />
            {magicLinkError
              ? (
                <Text variant="body-default-s" onBackground="brand-weak">
                  {magicLinkError}
                </Text>
              )
              : null}
            {magicLinkStatus
              ? (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {magicLinkStatus}
                </Text>
              )
              : null}
          </Column>
        </Column>
        <Column gap="16">
          <Column gap="8">
            <Text variant="body-strong-m">SMS authentication</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Use phone-based codes when you cannot access email. Twilio
              credentials must be configured for SMS delivery.
            </Text>
          </Column>
          <Column gap="8">
            <Input
              id="phone"
              name="phone"
              value={phoneAuth.phone}
              onChange={(event) => {
                setPhoneAuth((previous) => ({
                  ...previous,
                  phone: event.target.value,
                }));
                setPhoneError(null);
              }}
              placeholder="+13334445555"
              aria-label="Phone number"
            />
            <PasswordInput
              id="phonePassword"
              name="phonePassword"
              label="Phone account password"
              value={phoneAuth.password}
              onChange={(event) => {
                setPhoneAuth((previous) => ({
                  ...previous,
                  password: event.target.value,
                }));
                setPhoneError(null);
              }}
              required={false}
            />
            <Row gap="12" wrap>
              <Button
                type="button"
                size="s"
                variant="secondary"
                data-border="rounded"
                disabled={phoneSubmitting.signup}
                onClick={handlePhoneSignUp}
              >
                {phoneSubmitting.signup
                  ? "Submitting…"
                  : "Create phone account"}
              </Button>
              <Button
                type="button"
                size="s"
                variant="secondary"
                data-border="rounded"
                disabled={phoneSubmitting.sendOtp}
                onClick={handleSendPhoneOtp}
              >
                {phoneSubmitting.sendOtp ? "Sending…" : "Send SMS code"}
              </Button>
            </Row>
            <Input
              id="phoneOtp"
              name="phoneOtp"
              value={phoneAuth.otp}
              onChange={(event) => {
                setPhoneAuth((previous) => ({
                  ...previous,
                  otp: event.target.value,
                }));
                setPhoneError(null);
              }}
              placeholder="123456"
              aria-label="SMS verification code"
            />
            <Button
              type="button"
              size="s"
              variant="secondary"
              data-border="rounded"
              disabled={phoneSubmitting.verify}
              onClick={handleVerifyPhoneOtp}
            >
              {phoneSubmitting.verify ? "Verifying…" : "Verify SMS OTP"}
            </Button>
            {phoneError
              ? (
                <Text variant="body-default-s" onBackground="brand-weak">
                  {phoneError}
                </Text>
              )
              : null}
            {phoneStatus
              ? (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {phoneStatus}
                </Text>
              )
              : null}
          </Column>
        </Column>
        <Column gap="12">
          <Text variant="body-strong-m">Sign in with a provider</Text>
          <Column gap="8">
            {oauthProviders.map(({ provider, label }) => (
              <Button
                key={provider}
                type="button"
                size="m"
                variant="secondary"
                data-border="rounded"
                disabled={oauthLoading === provider}
                loading={oauthLoading === provider}
                onClick={() => handleOAuthSignIn(provider)}
              >
                {label}
              </Button>
            ))}
          </Column>
        </Column>
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
