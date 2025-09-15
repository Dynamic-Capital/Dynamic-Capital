import { MessagesDashboard } from './components/MessagesDashboard';
import { BotStatus } from './components/BotStatus';
import { WebhookConfigurator } from './components/WebhookConfigurator';
import { WebhookTester } from './components/WebhookTester';
import { TelegramTester } from './components/TelegramTester';
import { BotSetup } from './components/BotSetup';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="telegram-bot-theme">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4 max-w-4xl">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="webhook">Webhook Tools</TabsTrigger>
              <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
              <TabsTrigger value="setup">Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <BotStatus />
              <MessagesDashboard />
            </TabsContent>

            <TabsContent value="webhook" className="space-y-6">
              <WebhookConfigurator />
              <WebhookTester />
            </TabsContent>

            <TabsContent value="diagnostics">
              <TelegramTester />
            </TabsContent>

            <TabsContent value="setup">
              <BotSetup />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;