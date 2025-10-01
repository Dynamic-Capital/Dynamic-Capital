"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  type AuthError,
  type OAuthResponse,
  type Provider,
  type Session,
  type User,
  type UserAttributes,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@/integrations/supabase/queries";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  sendEmailOtp: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithEmailOtp: (
    email: string,
    token: string,
  ) => Promise<{ error: AuthError | null }>;
  signUpWithPhone: (
    phone: string,
    password: string,
    metadata?: Record<string, unknown>,
  ) => Promise<{ error: AuthError | null }>;
  signInWithPhoneOtp: (phone: string) => Promise<{ error: AuthError | null }>;
  verifyPhoneOtp: (
    phone: string,
    token: string,
  ) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (
    provider: Provider,
    options?: { redirectTo?: string; scopes?: string },
  ) => Promise<OAuthResponse>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateUser: (updates: UserAttributes) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => user ? getProfile(user.id) : Promise.resolve(null),
    enabled: !!user?.id,
  });

  useEffect(() => {
    setIsAdmin(profile?.role === "admin");
  }, [profile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        setLoading(false);
      },
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const buildRedirectUrl = (path?: string) => {
    const resolveBase = () => {
      if (typeof window !== "undefined") {
        return window.location.origin;
      }
      return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
    };

    const base = resolveBase();
    if (!base) {
      return undefined;
    }

    const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
    if (!path || path === "/") {
      return `${normalizedBase}/`;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  };

  const signUp = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) => {
    const redirectUrl = buildRedirectUrl();
    if (!redirectUrl) {
      console.warn(
        "NEXT_PUBLIC_SITE_URL is not set; auth emails may contain an invalid redirect URL.",
      );
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const sendEmailOtp = async (email: string) => {
    const redirectUrl = buildRedirectUrl();
    if (!redirectUrl) {
      console.warn(
        "NEXT_PUBLIC_SITE_URL is not set; magic link emails may contain an invalid redirect URL.",
      );
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    return { error };
  };

  const signInWithEmailOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    return { error };
  };

  const signUpWithPhone = async (
    phone: string,
    password: string,
    metadata: Record<string, unknown> = {},
  ) => {
    const { error } = await supabase.auth.signUp({
      phone,
      password,
      options: {
        data: metadata,
      },
    });

    return { error };
  };

  const signInWithPhoneOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    return { error };
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    return { error };
  };

  const signInWithOAuth = (
    provider: Provider,
    options: { redirectTo?: string; scopes?: string } = {},
  ) => {
    const fallbackRedirect = buildRedirectUrl();
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: options.redirectTo ?? fallbackRedirect,
        scopes: options.scopes,
      },
    });
  };

  const resetPassword = async (email: string) => {
    const redirectTo = buildRedirectUrl("/login?mode=reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    return { error };
  };

  const updateUser = async (updates: UserAttributes) => {
    const redirectTo = buildRedirectUrl();
    const { error } = await supabase.auth.updateUser(updates, {
      emailRedirectTo: redirectTo,
    });

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    try {
      localStorage.removeItem("selectedPlanId");
      localStorage.removeItem("paymentId");
      localStorage.removeItem("pending_payment_id");
      queryClient.removeQueries({ queryKey: ["profile"] });
    } catch {
      /* ignore */
    }
    if (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    sendEmailOtp,
    signInWithEmailOtp,
    signUpWithPhone,
    signInWithPhoneOtp,
    verifyPhoneOtp,
    signInWithOAuth,
    resetPassword,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
