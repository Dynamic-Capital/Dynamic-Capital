import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  MessageSquare, 
  Send,
  Bot,
  Webhook,
  Database,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function TelegramTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [testMessage, setTestMessage] = useState('Hello from webhook test!');
  const [webhookUrl, setWebhookUrl] = useState('');

  const botToken = '8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc';
  const adminUserId = '225513686';

  const updateResult = (name: string, status: TestResult['status'], message: string, details?: string) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      const newResult = { name, status, message, details };
      
      if (existing) {
        return prev.map(r => r.name === name ? newResult : r);
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runFullTelegramTest = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Bot Token Validation
    updateResult('Bot Token', 'pending', 'Validating Telegram bot token...');
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const result = await response.json();
      
      if (result.ok) {
        updateResult('Bot Token', 'success', `Bot active: @${result.result.username}`, 
          `Bot ID: ${result.result.id}, Name: ${result.result.first_name}`);
      } else {
        updateResult('Bot Token', 'error', 'Invalid bot token', result.description);
      }
    } catch (error) {
      updateResult('Bot Token', 'error', 'Failed to validate bot token',
        error instanceof Error ? error.message : 'Network error');
    }

    // Test 2: Webhook Status
    updateResult('Webhook Status', 'pending', 'Checking webhook configuration...');
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const result = await response.json();
      
      if (result.ok) {
        const info = result.result;
        if (info.url) {
          setWebhookUrl(info.url);
          updateResult('Webhook Status', 'success', `Webhook configured: ${info.url}`, 
            `Pending updates: ${info.pending_update_count}, Last error: ${info.last_error_message || 'None'}`);
        } else {
          updateResult('Webhook Status', 'warning', 'No webhook configured', 
            'Webhook URL is not set. Bot will not receive messages.');
        }
      } else {
        updateResult('Webhook Status', 'error', 'Failed to get webhook info', result.description);
      }
    } catch (error) {
      updateResult('Webhook Status', 'error', 'Failed to check webhook', 
        error instanceof Error ? error.message : 'Network error');
    }

    // Test 3: Database Connection
    updateResult('Database Connection', 'pending', 'Testing Supabase connection...');
    try {
      const { error } = await supabase.from('messages').select('count').limit(1);
      if (error) throw error;
      updateResult('Database Connection', 'success', 'Database connection successful', 
        'Supabase connection and messages table accessible');
    } catch (error) {
      updateResult('Database Connection', 'error', 'Database connection failed', 
        error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 4: Edge Function Health
    updateResult('Edge Function', 'pending', 'Testing edge function...');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        const functionUrl = `${supabaseUrl}/functions/v1/telegram-webhook`;
        const response = await fetch(functionUrl, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 405) {
          updateResult('Edge Function', 'success', 'Edge function is deployed and responding', 
            `Function URL: ${functionUrl}`);
        } else {
          updateResult('Edge Function', 'warning', 'Edge function responding unexpectedly', 
            `Status: ${response.status}, Expected: 405 (Method Not Allowed)`);
        }
      } else {
        updateResult('Edge Function', 'error', 'Supabase URL not configured', 
          'VITE_SUPABASE_URL environment variable is missing');
      }
    } catch (error) {
      updateResult('Edge Function', 'error', 'Edge function not accessible', 
        error instanceof Error ? error.message : 'Network error');
    }

    // Test 5: Send Test Message to Bot
    updateResult('Test Message', 'pending', 'Sending test message to bot...');
    try {
      const testResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminUserId,
          text: `🧪 Test message from dashboard: ${testMessage}\n\nTime: ${new Date().toLocaleString()}`
        })
      });

      const testResult = await testResponse.json();
      if (testResult.ok) {
        updateResult('Test Message', 'success', 'Test message sent successfully', 
          `Message ID: ${testResult.result.message_id}`);
      } else {
        updateResult('Test Message', 'error', 'Failed to send test message', testResult.description);
      }
    } catch (error) {
      updateResult('Test Message', 'error', 'Failed to send test message', 
        error instanceof Error ? error.message : 'Network error');
    }

    setIsRunning(false);
    toast.success('Telegram bot test completed!');
  };

  const setWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl.trim() })
      });

      const result = await response.json();
      
      if (result.ok) {
        toast.success('Webhook set successfully!');
        runFullTelegramTest(); // Re-run tests after setting webhook
      } else {
        toast.error(`Failed to set webhook: ${result.description}`);
      }
    } catch {
      toast.error('Failed to set webhook. Check your connection.');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'pending':
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Telegram Bot Testing</h2>
        </div>
        <Button 
          onClick={runFullTelegramTest} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Run Full Test
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Message Sender */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-message">Test Message</Label>
              <Input
                id="test-message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter test message..."
                className="mt-1"
              />
            </div>
            <Button 
              onClick={runFullTelegramTest} 
              disabled={isRunning}
              className="w-full"
            >
              Send Test & Run All Tests
            </Button>
          </CardContent>
        </Card>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-project.supabase.co/functions/v1/telegram-webhook"
                className="mt-1"
              />
            </div>
            <Button onClick={setWebhook} className="w-full">
              Set Webhook
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={result.name}>
                  <div className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}>
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                      <Badge variant={result.status === 'success' ? 'default' : 
                                   result.status === 'error' ? 'destructive' : 'secondary'}>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-gray-500 font-mono bg-white/50 p-2 rounded">
                        {result.details}
                      </p>
                    )}
                  </div>
                  {index < results.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => window.open(`https://t.me/bot${botToken.split(':')[0]}`, '_blank')}
          >
            <Bot className="h-4 w-4 mr-2" />
            Open Bot Chat
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => window.open(`https://api.telegram.org/bot${botToken}/getUpdates`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Check Bot Updates
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