import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Bot, MessageSquare, Database, Zap, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function BotStatus() {
  const [messageCount, setMessageCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  const botToken = '8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc';
  const botUsername = 'Dynamic_Pool_BOT';

  useEffect(() => {
    checkBotStatus();
    fetchMessageCount();
  }, []);

  const checkBotStatus = async () => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const result = await response.json();
      setIsOnline(result.ok);
    } catch {
      setIsOnline(false);
    }
  };

  const fetchMessageCount = async () => {
    try {
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured. Using default count.');
        setMessageCount(0);
        return;
      }

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        setMessageCount(count);
      } else {
        setMessageCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch message count:', error);
      setMessageCount(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Telegram Bot Dashboard</h1>
            <p className="text-sm text-muted-foreground">Monitor your bot activity</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`https://t.me/${botUsername}`, '_blank')}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Open Bot
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="default">
                <Zap className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}