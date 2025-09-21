export type SystemHealthOverallStatus = "healthy" | "degraded" | "error";

export type SystemHealthCheckStatus = "ok" | "warning" | "error";

export interface SystemHealthCheck {
  status: SystemHealthCheckStatus;
  error?: string;
  response_time: number;
  active_count?: number;
}

export type SystemHealthCheckKey =
  | "database"
  | "bot_content"
  | "promotions"
  | "rpc_functions";

export interface SystemHealthPerformance {
  average_response_time: number;
  total_checks: number;
  failed_checks: number;
}

export interface SystemHealthResponse {
  overall_status: SystemHealthOverallStatus;
  timestamp: string;
  checks: Record<SystemHealthCheckKey, SystemHealthCheck>;
  performance: SystemHealthPerformance;
  recommendations: string[];
}
