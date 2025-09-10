import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, ExternalLink, Copy, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { callEdgeFunction } from "@/config/supabase";

interface AdminGateProps {
  children: React.ReactNode;
}

export function AdminGate({ children }: AdminGateProps) {
  const { isAdmin, initData, loading } = useTelegramAuth();
  const [manualInitData, setManualInitData] = useState("");
  const [adminToken, setAdminToken] = useState(() => 
    localStorage.getItem('dc_admin_token')
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();

  // Check if we have a valid admin token
  const hasValidToken = () => {
    if (!adminToken) return false;
    try {
      const payload = JSON.parse(atob(adminToken.split('.')[1]));
      return payload.exp > Date.now() / 1000 && payload.admin;
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Checking admin access...</span>
        </CardContent>
      </Card>
    );
  }

  // If user is admin and has initData, or has valid token, allow access
  if ((isAdmin && initData) || hasValidToken()) {
    return <>{children}</>;
  }

  const authenticateWithInitData = async (initDataToUse: string) => {
    setIsAuthenticating(true);
    try {
      const { data, error } = await callEdgeFunction('ADMIN_SESSION', {
        method: 'POST',
        body: { initData: initDataToUse },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.token) {
        localStorage.setItem('dc_admin_token', (data as any).token);
        setAdminToken((data as any).token);
        toast({
          title: "Success",
          description: "Admin session authenticated successfully",
        });
      } else {
        throw new Error((data as any)?.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Admin auth failed:', error);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Failed to authenticate admin session",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleManualAuth = () => {
    if (!manualInitData.trim()) {
      toast({
        title: "Error",
        description: "Please enter valid initData",
        variant: "destructive",
      });
      return;
    }
    authenticateWithInitData(manualInitData);
  };

  const openInTelegram = () => {
    const miniAppUrl = `https://t.me/DynamicCapitalBot/app`;
    window.open(miniAppUrl, '_blank');
  };

  const copyInitData = () => {
    if (initData) {
      navigator.clipboard.writeText(initData);
      toast({
        title: "Copied",
        description: "initData copied to clipboard",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Access Required
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in with admin privileges to access the dashboard
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button 
              onClick={openInTelegram}
              className="w-full"
              variant="default"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Telegram
            </Button>
            
            {initData && !isAdmin && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 border rounded">
                  <Badge variant="outline">initData detected</Badge>
                  <Button size="sm" variant="ghost" onClick={copyInitData}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  onClick={() => authenticateWithInitData(initData)}
                  className="w-full"
                  variant="secondary"
                  disabled={isAuthenticating}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  {isAuthenticating ? "Authenticating..." : "Authenticate"}
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Advanced: Paste Telegram initData
              </p>
              <Input
                placeholder="Paste initData here..."
                value={manualInitData}
                onChange={(e) => setManualInitData(e.target.value)}
                className="text-xs"
              />
              <Button 
                onClick={handleManualAuth}
                className="w-full"
                variant="outline"
                disabled={!manualInitData.trim() || isAuthenticating}
              >
                {isAuthenticating ? "Authenticating..." : "Manual Auth"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}