import { MessagesDashboard } from './components/MessagesDashboard';
import { BotStatus } from './components/BotStatus';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="telegram-bot-theme">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4 max-w-4xl">
          <div className="space-y-6">
            <BotStatus />
            <MessagesDashboard />
          </div>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;