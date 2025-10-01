"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { callEdgeFunction } from "@/config/supabase";

interface NetworkStatusProps {
  className?: string;
}

export function NetworkStatus({ className }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastCheck(new Date());
      toast.success("Connection restored");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastCheck(new Date());
      toast.error("Connection lost");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const testConnection = async () => {
    setTesting(true);
    try {
      const { error } = await callEdgeFunction("CONTENT_BATCH", {
        method: "POST",
        body: { keys: ["network_test"] },
      });

      if (!error) {
        setIsOnline(true);
        toast.success("Connection test successful");
      } else {
        setIsOnline(false);
        toast.error("Connection test failed");
      }
    } catch {
      setIsOnline(false);
      toast.error("Network error");
    } finally {
      setTesting(false);
      setLastCheck(new Date());
    }
  };

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <Alert className={`border-dc-brand/20 bg-dc-brand/10 ${className}`}>
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-dc-brand-dark">
          Connection lost. Some features may not work properly.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={testConnection}
          disabled={testing}
          className="ml-2"
        >
          <RefreshCw
            className={`h-4 w-4 mr-1 ${testing ? "animate-spin" : ""}`}
          />
          Test
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(
    props: { children: React.ReactNode; fallback?: React.ReactNode },
  ) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Alert className="border-dc-brand/20 bg-dc-brand/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-dc-brand-dark">
            Something went wrong. Please refresh the page.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner(
  { message = "Loading...", size = "md" }: LoadingSpinnerProps,
) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <RefreshCw className={`${sizeClasses[size]} animate-spin text-primary`} />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}

interface RetryableComponentProps {
  children: React.ReactNode;
  onRetry: () => void;
  error?: string;
  loading?: boolean;
}

export function RetryableComponent(
  { children, onRetry, error, loading }: RetryableComponentProps,
) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert className="border-dc-brand/20 bg-dc-brand/10">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-dc-brand-dark">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}
