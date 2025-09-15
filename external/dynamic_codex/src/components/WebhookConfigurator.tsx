import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Webhook,
  Settings,
  Globe,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export function WebhookConfigurator() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [currentWebhookInfo, setCurrentWebhookInfo] = useState<Record<string, unknown> | null>(null);
  const [isCheckingWebhook, setIsCheckingWebhook] = useState(false);

  const botToken = '8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  // Generate the webhook URL
  const generatedWebhookUrl = supabaseUrl 
    ? `${supabaseUrl}/functions/v1/telegram-webhook`
    : 'https://YOUR_PROJECT.supabase.co/functions/v1/telegram-webhook';

  useEffect(() => {
    if (supabaseUrl) {
      setWebhookUrl(generatedWebhookUrl);
    }
    checkCurrentWebhook();
  }, [supabaseUrl]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const checkCurrentWebhook = async () => {
    setIsCheckingWebhook(true);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const result = await response.json();
      
      if (result.ok) {
        setCurrentWebhookInfo(result.result);
      } else {
        toast.error('Failed to get webhook info');
      }
    } catch {
      toast.error('Failed to check webhook status');
    } finally {
      setIsCheckingWebhook(false);
    }
  };

  const setTelegramWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }

    setIsSettingWebhook(true);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl.trim() })
      });

      const result = await response.json();
      
      if (result.ok) {
        setWebhookStatus('success');
        toast.success('Webhook set successfully!');
        // Refresh webhook info
        setTimeout(() => checkCurrentWebhook(), 1000);
      } else {
        setWebhookStatus('error');
        toast.error(`Failed to set webhook: ${result.description}`);
      }
    } catch {
      setWebhookStatus('error');
      toast.error('Failed to set webhook. Check your connection.');
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const deleteWebhook = async () => {
    setIsSettingWebhook(true);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (result.ok) {
        toast.success('Webhook deleted successfully!');
        setTimeout(() => checkCurrentWebhook(), 1000);
      } else {
        toast.error(`Failed to delete webhook: ${result.description}`);
      }
    } catch {
      toast.error('Failed to delete webhook');
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const testWebhookEndpoint = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }

    try {
      const response = await fetch(webhookUrl.trim(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 405) {
        toast.success('Webhook endpoint is responding correctly!');
      } else {
        toast.warning(`Webhook endpoint responded with status: ${response.status}`);
      }
    } catch {
      toast.error('Webhook endpoint is not accessible');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Webhook className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Webhook Configuration</h2>
        <Badge variant="secondary">Setup Required</Badge>
      </div>

      {/* Current Webhook Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Current Webhook Status
            <Button
              size="sm"
              variant="outline"
              onClick={checkCurrentWebhook}
              disabled={isCheckingWebhook}
            >
              {isCheckingWebhook ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentWebhookInfo ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Webhook URL</Label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm font-mono break-all">
                    {currentWebhookInfo.url || 'Not set'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge variant={currentWebhookInfo.url ? 'default' : 'secondary'}>
                      {currentWebhookInfo.url ? 'Active' : 'Not configured'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Pending Updates</Label>
                  <div className="mt-1 text-sm">{currentWebhookInfo.pending_update_count}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Max Connections</Label>
                  <div className="mt-1 text-sm">{currentWebhookInfo.max_connections || 'Default'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">IP Address</Label>
                  <div className="mt-1 text-sm">{currentWebhookInfo.ip_address || 'Not available'}</div>
                </div>
              </div>

              {currentWebhookInfo.last_error_date && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Last Error:</strong> {currentWebhookInfo.last_error_message}<br />
                    <strong>Date:</strong> {new Date(currentWebhookInfo.last_error_date * 1000).toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Loading webhook information...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook URL Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Webhook URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Your Webhook URL:</strong><br />
              <code className="text-sm bg-muted px-2 py-1 rounded">{generatedWebhookUrl}</code>
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-project.supabase.co/functions/v1/telegram-webhook"
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This should be your Supabase edge function URL
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={setTelegramWebhook} 
              disabled={isSettingWebhook}
              className="flex-1"
            >
              {isSettingWebhook ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Setting...
                </>
              ) : (
                <>
                  <Webhook className="h-4 w-4 mr-2" />
                  Set Webhook
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={testWebhookEndpoint}
            >
              Test Endpoint
            </Button>
            
            <Button 
              variant="destructive"
              onClick={deleteWebhook}
              disabled={isSettingWebhook}
            >
              Delete Webhook
            </Button>
          </div>

          {webhookStatus === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Webhook configured successfully! Your bot is ready to receive messages.
              </AlertDescription>
            </Alert>
          )}

          {webhookStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to set webhook. Please check your URL and try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Manual Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Using cURL</Label>
            <div className="mt-1 p-3 bg-muted rounded font-mono text-sm overflow-x-auto">
              {`curl "https://api.telegram.org/bot${botToken}/setWebhook" \\
  -d url=${webhookUrl || 'YOUR_WEBHOOK_URL'}`}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => copyToClipboard(
                `curl "https://api.telegram.org/bot${botToken}/setWebhook" -d url=${webhookUrl}`,
                'cURL command'
              )}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy cURL Command
            </Button>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-medium">Direct API Call</Label>
            <div className="mt-1 p-3 bg-muted rounded font-mono text-sm break-all">
              {`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl || 'YOUR_WEBHOOK_URL')}`}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => window.open(
                `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
                '_blank'
              )}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Browser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => window.open(`https://api.telegram.org/bot${botToken}/getWebhookInfo`, '_blank')}
          >
            <Globe className="h-4 w-4 mr-2" />
            Check Webhook Info (API)
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => window.open(`https://api.telegram.org/bot${botToken}/getUpdates`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Get Bot Updates
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
          >
            <Database className="h-4 w-4 mr-2" />
            Supabase Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}