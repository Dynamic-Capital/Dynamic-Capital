import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Activity,
  Database,
  Zap,
  Shield,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { callEdgeFunction } from "@/config/supabase";

interface HealthCheck {
  status: "ok" | "error" | "warning";
  error?: string;
  response_time: number;
  active_count?: number;
}

interface HealthStatus {
  overall_status: "healthy" | "degraded" | "error";
  timestamp: string;
  checks: {
    database: HealthCheck;
    bot_content: HealthCheck;
    promotions: HealthCheck;
    rpc_functions: HealthCheck;
  };
  performance: {
    average_response_time: number;
    total_checks: number;
    failed_checks: number;
  };
  recommendations: string[];
}

interface SystemHealthProps {
  className?: string;
  showDetails?: boolean;
}

export function SystemHealth({ className, showDetails = false }: SystemHealthProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const { data, status } = await callEdgeFunction('WEB_APP_HEALTH');

      if (status !== 200 || !data) {
        throw new Error('Health check failed');
      }

      setHealthStatus(data as HealthStatus);
      setLastCheck(new Date());

      if ((data as any).overall_status === 'degraded') {
        toast.warning('Some systems are experiencing issues');
      } else if ((data as any).overall_status === 'error') {
        toast.error('System health check failed');
      }
    } catch (error) {
      console.error('Health check error:', error);
      toast.error('Unable to check system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'degraded': return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-dc-brand" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-success/10 text-success border-success/30">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-warning/10 text-warning border-warning/30">Degraded</Badge>;
      case 'error':
        return <Badge className="bg-dc-brand/10 text-dc-brand-dark border-dc-brand/30">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getCheckIcon = (checkName: string) => {
    switch (checkName) {
      case 'database': return <Database className="h-4 w-4" />;
      case 'bot_content': return <Activity className="h-4 w-4" />;
      case 'promotions': return <Zap className="h-4 w-4" />;
      case 'rpc_functions': return <Shield className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (!showDetails && healthStatus?.overall_status === 'healthy') {
    return null; // Don't show anything when healthy and details not requested
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {healthStatus ? getStatusIcon(healthStatus.overall_status) : <Activity className="h-4 w-4" />}
            <CardTitle className="text-base">System Health</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {healthStatus && getStatusBadge(healthStatus.overall_status)}
            <Button
              variant="ghost"
              size="sm"
              onClick={checkHealth}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {lastCheck && (
          <CardDescription className="text-xs">
            Last checked: {lastCheck.toLocaleTimeString()}
          </CardDescription>
        )}
      </CardHeader>

      {showDetails && healthStatus && (
        <CardContent className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Response</p>
              <p className="text-sm font-medium">
                {healthStatus.performance.average_response_time}ms
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Checks</p>
              <p className="text-sm font-medium">
                {healthStatus.performance.total_checks}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-sm font-medium text-dc-brand">
                {healthStatus.performance.failed_checks}
              </p>
            </div>
          </div>

          {/* Individual Checks */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Component Status</p>
            {Object.entries(healthStatus.checks).map(([name, check]) => (
              <div key={name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div className="flex items-center gap-2">
                  {getCheckIcon(name)}
                  <span className="text-sm capitalize">
                    {name.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {check.response_time}ms
                  </span>
                  {check.status === 'ok' ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-dc-brand" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {healthStatus.recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recommendations</p>
              {healthStatus.recommendations.map((rec, index) => (
                <Alert key={index} className="border-warning/20 bg-warning/10">
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription className="text-warning text-sm">
                    {rec}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}