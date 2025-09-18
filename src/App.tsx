import { type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Removed Once UI system dependencies
import { MotionConfigProvider } from '@/components/ui/motion-config';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { LandingPageShell } from '@/components/landing/LandingPageShell';
import Footer from '@/components/layout/Footer';

const queryClient = new QueryClient();

function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfigProvider>{children}</MotionConfigProvider>
  );
}

function HomePage() {
  return <LandingPageShell />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Router>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster />
          <Sonner />
        </Router>
      </AppProviders>
    </QueryClientProvider>
  );
}

export default App;
