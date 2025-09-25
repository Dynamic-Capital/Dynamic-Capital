"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isRouteEnabled, protectedRoutes } from "@/resources";
import {
  Button,
  Column,
  Flex,
  Heading,
  PasswordInput,
  Spinner,
} from "@once-ui-system/core";
import NotFound from "@/app/not-found";

interface RouteGuardProps {
  children: React.ReactNode;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();

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

  const normalizedPathname = normalizePathname(pathname);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const performChecks = async () => {
      setLoading(true);
      setIsAllowed(false);
      setIsPasswordRequired(false);
      setIsAuthenticated(false);

      const routeEnabled = Boolean(
        normalizedPathname && isRouteEnabled(normalizedPathname),
      );
      setIsAllowed(routeEnabled);

      if (protectedRoutes[normalizedPathname as keyof typeof protectedRoutes]) {
        setIsPasswordRequired(true);

        const response = await fetch("/api/check-auth");
        if (response.ok) {
          setIsAuthenticated(true);
        }
      }

      setLoading(false);
    };

    performChecks();
  }, [normalizedPathname, pathname]);

  const handlePasswordSubmit = async () => {
    const response = await fetch("/api/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      setIsAuthenticated(true);
      setError(undefined);
    } else {
      setError("Incorrect password");
    }
  };

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
          />
          <Button onClick={handlePasswordSubmit}>Submit</Button>
        </Column>
      </Column>
    );
  }

  return <>{children}</>;
};

export { RouteGuard };
