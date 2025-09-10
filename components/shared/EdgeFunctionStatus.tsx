import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface HealthResponse {
  overall_status?: "healthy" | "degraded" | "error";
}

export const EdgeFunctionStatus = () => {
  const [status, setStatus] = useState<
    "checking" | "healthy" | "degraded" | "error"
  >("checking");

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "web-app-health",
          { method: "GET" },
        );
        if (error) {
          setStatus("error");
          return;
        }
        const typedData = data as HealthResponse;
        setStatus(typedData?.overall_status || "degraded");
      } catch (_err) {
        setStatus("error");
      }
    };

    checkStatus();
  }, []);

  const variant =
    status === "healthy"
      ? "default"
      : status === "degraded"
      ? "secondary"
      : status === "checking"
      ? "outline"
      : "destructive";

  const label =
    status === "checking"
      ? "Checking edge functions..."
      : `Edge functions: ${status}`;

  return <Badge variant={variant}>{label}</Badge>;
};

export default EdgeFunctionStatus;
