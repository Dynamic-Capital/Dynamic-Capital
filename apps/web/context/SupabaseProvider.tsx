"use client";

import { createContext, ReactNode, useContext } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { SupabaseClient } from "@supabase/supabase-js";

interface SupabaseContextValue {
  supabase: SupabaseClient;
  session: ReturnType<typeof useSession>;
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(
  undefined,
);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabaseClient();
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
