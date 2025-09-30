"use client";

import { createContext, ReactNode, useContext } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import type { Database } from "@/integrations/supabase/types";

type SupabaseClientValue = ReturnType<typeof useSupabaseClient<Database>>;

interface SupabaseContextValue {
  supabase: SupabaseClientValue;
  session: ReturnType<typeof useSession>;
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(
  undefined,
);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabaseClient<Database>();
  const session = useSession();
  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};
