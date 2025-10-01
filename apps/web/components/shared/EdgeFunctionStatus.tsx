"use client";

import {
  SYSTEM_HEALTH_STATUS_META,
  type SystemHealthDisplayStatus,
  SystemHealthStatusBadge,
} from "@/components/ui/system-health";
import { useSystemHealth } from "@/hooks/useSystemHealth";

export const EdgeFunctionStatus = () => {
  const { data, isLoading, isError } = useSystemHealth();

  const status: SystemHealthDisplayStatus = data
    ? data.overall_status
    : isLoading
    ? "loading"
    : isError
    ? "unknown"
    : "loading";

  const label = data
    ? `Edge functions: ${SYSTEM_HEALTH_STATUS_META[data.overall_status].label}`
    : status === "loading"
    ? "Checking edge functions…"
    : "Edge functions unavailable";

  return (
    <SystemHealthStatusBadge status={status} className="whitespace-nowrap">
      {label}
    </SystemHealthStatusBadge>
  );
};

export default EdgeFunctionStatus;
