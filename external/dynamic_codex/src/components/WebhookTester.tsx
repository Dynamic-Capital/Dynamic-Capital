import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Database, 
  Webhook, 
  Github,
  Bot,
  MessageSquare,
  Server
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function WebhookTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const botToken = '8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc';

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

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Supabase Connection
    updateResult('Supabase Connection', 'pending', 'Testing database connection...');
    try {
      const { error } = await supabase.from('messages').select('count').limit(1);
      if (error) throw error;
      updateResult('Supabase Connection', 'success', 'Database connection successful', 
        `Connected to Supabase. Table accessible.`);
    } catch (error) {
      updateResult('Supabase Connection', 'error', 'Database connection failed', 
        error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Bot Token Validation
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

    // Test 3: Webhook Status
    updateResult('Webhook Status', 'pending', 'Checking webhook configuration...');
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const result = await response.json();
      
      if (result.ok) {
        const info = result.result;
        if (info.url) {
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

    // Test 4: Edge Function Health
    updateResult('Edge Function', 'pending', 'Testing edge function availability...');
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

    // Test 5: Database Schema
    updateResult('Database Schema', 'pending', 'Verifying database schema...');
    try {
      const { error } = await supabase
        .from('messages')
        .select('id, user_id, username, text, date, created_at')
        .limit(1);

      if (error) throw error;
      updateResult('Database Schema', 'success', 'Database schema is correct', 
        'All required columns are present and accessible');
    } catch (error) {
      updateResult('Database Schema', 'error', 'Database schema issue', 
        error instanceof Error ? error.message : 'Schema validation failed');
    }

    // Test 6: Real-time Subscription
    updateResult('Real-time Subscription', 'pending', 'Testing real-time capabilities...');
    try {
      const channel = supabase.channel('test-channel');
      
      channel
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => {}
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            updateResult('Real-time Subscription', 'success', 'Real-time subscription active', 
              'Dashboard will update automatically when new messages arrive');
            channel.unsubscribe();
          } else if (status === 'CHANNEL_ERROR') {
            updateResult('Real-time Subscription', 'error', 'Real-time subscription failed', 
              'Real-time updates may not work properly');
            channel.unsubscribe();
          }
        });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (results.find(r => r.name === 'Real-time Subscription')?.status === 'pending') {
          updateResult('Real-time Subscription', 'warning', 'Real-time subscription timeout', 
            'Subscription took too long to establish');
          channel.unsubscribe();
        }
      }, 5000);
    } catch (error) {
      updateResult('Real-time Subscription', 'error', 'Real-time setup failed', 
        error instanceof Error ? error.message : 'Unknown error');
    }

    setIsRunning(false);
    toast.success('Comprehensive test completed!');
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
          <Server className="h-6 w-6" />
          <h2 className="text-2xl font-bold">System Health Check</h2>
        </div>
        <Button 
          onClick={runComprehensiveTest} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Run Full Test
            </>
          )}
        </Button>
      </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                GitHub integration is enabled. Database migrations and edge functions 
                will be automatically synced when you push changes.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
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
              <MessageSquare className="h-4 w-4 mr-2" />
              Open Bot Chat
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
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => window.open(`https://api.telegram.org/bot${botToken}/getUpdates`, '_blank')}
            >
              <Webhook className="h-4 w-4 mr-2" />
              Check Updates
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}