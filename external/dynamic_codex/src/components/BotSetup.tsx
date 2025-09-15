import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Copy, ExternalLink, CheckCircle, AlertCircle, Bot } from 'lucide-react';
import { toast } from 'sonner';

export function BotSetup() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const botToken = '8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc';
  const adminUserId = '225513686';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
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

  const testBot = async () => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const result = await response.json();
      
      if (result.ok) {
        toast.success(`Bot is active: @${result.result.username}`);
      } else {
        toast.error('Bot token is invalid');
      }
    } catch {
      toast.error('Failed to test bot connection');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Telegram Bot Setup</h2>
        <Badge variant="secondary">Configuration</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bot Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Bot Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Bot Token</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  value={`${botToken.substring(0, 20)}...`} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(botToken, 'Bot token')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Admin User ID</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  value={adminUserId} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(adminUserId, 'Admin user ID')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button onClick={testBot} className="w-full">
              Test Bot Connection
            </Button>
          </CardContent>
        </Card>

        {/* Webhook Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-project.supabase.co/functions/v1/telegram-webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your Supabase edge function URL
              </p>
            </div>

            <Button 
              onClick={setTelegramWebhook} 
              disabled={isSettingWebhook}
              className="w-full"
            >
              {isSettingWebhook ? 'Setting Webhook...' : 'Set Webhook'}
            </Button>

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
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">Connect to Supabase</p>
                <p className="text-sm text-muted-foreground">
                  Click "Connect to Supabase" in the top right to set up your database
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">Configure Environment Variables</p>
                <p className="text-sm text-muted-foreground">
                  Add the bot token and admin user ID to your Supabase edge function environment
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">Set Webhook URL</p>
                <p className="text-sm text-muted-foreground">
                  Use the form above to configure your Telegram webhook
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <div>
                <p className="font-medium">Test Your Bot</p>
                <p className="text-sm text-muted-foreground">
                  Send a message to your bot and watch it appear in the dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Need help? Check the{' '}
              <Button variant="link" className="p-0 h-auto" asChild>
                <a href="#readme" className="inline-flex items-center gap-1">
                  README file <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
              {' '}for detailed setup instructions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}