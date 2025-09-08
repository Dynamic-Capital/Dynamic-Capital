import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

interface VipGateProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function VipGate({ children, redirectTo = "/plans" }: VipGateProps) {
  const { isVip, loading } = useTelegramAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isVip) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, isVip, navigate, redirectTo]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-2">Checking VIP status...</span>
        </CardContent>
      </Card>
    );
  }

  if (!isVip) {
    return null;
  }

  return <>{children}</>;
}

export default VipGate;
