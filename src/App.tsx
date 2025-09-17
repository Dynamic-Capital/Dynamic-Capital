import { type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  LayoutProvider as OnceLayoutProvider,
  ThemeProvider as OnceThemeProvider,
  DataThemeProvider as OnceDataThemeProvider,
  IconProvider as OnceIconProvider,
  ToastProvider as OnceToastProvider,
} from '@once-ui-system/core';
import { MotionConfigProvider } from '@/components/ui/motion-config';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { LandingPageShell } from '@/components/landing/LandingPageShell';
import Footer from '@/components/layout/Footer';

const queryClient = new QueryClient();

function OnceUIProviders({ children }: { children: ReactNode }) {
  return (
    <OnceLayoutProvider
      breakpoints={{
        s: 640,
        m: 1024,
        l: 1200,
      }}
    >
      <OnceThemeProvider>
        <OnceDataThemeProvider>
          <OnceToastProvider>
            <OnceIconProvider>
              <MotionConfigProvider>{children}</MotionConfigProvider>
            </OnceIconProvider>
          </OnceToastProvider>
        </OnceDataThemeProvider>
      </OnceThemeProvider>
    </OnceLayoutProvider>
  );
}

function HomePage() {
  return <LandingPageShell />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OnceUIProviders>
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
      </OnceUIProviders>
    </QueryClientProvider>
  );
}

export default App;
