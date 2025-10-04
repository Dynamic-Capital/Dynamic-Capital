"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { isRouteEnabled, protectedRoutes } from "@/resources";
import {
  Button,
  Column,
  Flex,
  Heading,
  PasswordInput,
  Spinner,
} from "@/components/dynamic-ui-system";
import NotFound from "@/app/not-found";

interface RouteGuardProps {
  children: React.ReactNode;
}

type CheckAuthResponse = {
  ok: boolean;
  authenticated?: boolean;
  passwordRequired?: boolean;
};

type AuthenticateResponse = {
  ok?: boolean;
  error?: string;
  passwordRequired?: boolean;
};

const normalizePathname = (value: string | null): string => {
  if (!value) {
    return "/";
  }

  let normalized = value;

  if (normalized.startsWith("/_sites/")) {
    const withoutPreviewPrefix = normalized.replace(/^\/_sites\/[\w-]+/, "");
    normalized = withoutPreviewPrefix || "/";
  }

  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.replace(/\/+$/, "");
  }

  return normalized || "/";
};

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();
  const normalizedPathname = useMemo(
    () => normalizePathname(pathname),
    [pathname],
  );
  const [isAllowed, setIsAllowed] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const performChecks = async () => {
      setLoading(true);
      setIsAllowed(false);
      setIsAuthenticated(false);
      setError(undefined);
      setPassword("");
      setIsSubmitting(false);

      try {
        const routeEnabled = Boolean(
          normalizedPathname && isRouteEnabled(normalizedPathname),
        );

        if (!routeEnabled) {
          if (!cancelled) {
            setIsPasswordRequired(false);
          }
          return;
        }

        if (!cancelled) {
          setIsAllowed(true);
        }

        const routeIsProtected = Boolean(
          protectedRoutes[normalizedPathname as keyof typeof protectedRoutes],
        );

        if (!routeIsProtected) {
          if (!cancelled) {
            setIsPasswordRequired(false);
            setIsAuthenticated(true);
          }
          return;
        }

        let requiresPassword = true;

        try {
          const response = await fetch("/api/check-auth", {
            cache: "no-store",
            signal: controller.signal,
          });

          if (response.ok) {
            const payload = (await response.json().catch(() => undefined)) as
              | CheckAuthResponse
              | undefined;

            if (payload?.authenticated) {
              setIsAuthenticated(true);
            }

            if (payload?.passwordRequired === false) {
              requiresPassword = false;
            }
          } else if (response.status === 401) {
            requiresPassword = true;
          }
        } catch (error) {
          if ((error as { name?: string }).name === "AbortError") {
            return;
          }
          // Ignore network failures and fall back to requiring a password.
        }

        if (!cancelled) {
          setIsPasswordRequired(requiresPassword);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void performChecks();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [normalizedPathname]);

  const handlePasswordSubmit = useCallback(async () => {
    const trimmed = password.trim();
    if (!trimmed) {
      setError("Password is required");
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      const response = await fetch("/api/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmed }),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => undefined)) as
        | AuthenticateResponse
        | undefined;

      if (response.ok && payload?.ok) {
        setIsAuthenticated(true);
        setIsPasswordRequired(payload?.passwordRequired ?? true);
        setPassword("");
        setError(undefined);
        return;
      }

      const message = payload?.error ??
        (response.status === 401 ? "Incorrect password" : undefined) ??
        "Unable to authenticate. Please try again.";
      setError(message);
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") {
        return;
      }
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [password]);

  if (loading) {
    return (
      <Flex fillWidth paddingY="128" horizontal="center">
        <Spinner />
      </Flex>
    );
  }

  if (!isAllowed) {
    return <NotFound />;
  }

  if (isPasswordRequired && !isAuthenticated) {
    return (
      <Column paddingY="128" maxWidth={24} gap="24" center>
        <Heading align="center" wrap="balance">
          This page is password protected
        </Heading>
        <Column fillWidth gap="8" horizontal="center">
          <PasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            errorMessage={error}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handlePasswordSubmit();
              }
            }}
          />
          <Button
            onClick={() => {
              void handlePasswordSubmit();
            }}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Submit
          </Button>
        </Column>
      </Column>
    );
  }

  return <>{children}</>;
};

export { RouteGuard };
