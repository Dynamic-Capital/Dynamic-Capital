import { ChatAssistantWidget } from '@/components/shared/ChatAssistantWidget';
import { OnceLandingPageClient } from '@/components/landing/OnceLandingPageClient';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen space-y-16 bg-gradient-to-br from-background via-card/10 to-background pb-24">
      <OnceLandingPageClient />
      <ChatAssistantWidget />
    </div>
  );
}
