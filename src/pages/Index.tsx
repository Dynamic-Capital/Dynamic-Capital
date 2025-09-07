import BotDashboard from "@/components/telegram/BotDashboard";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SystemResetButton } from "@/components/admin/SystemResetButton";
import { LivePlansSection } from "@/components/shared/LivePlansSection";
import { SubscriptionStatusCard } from "@/components/shared/SubscriptionStatusCard";
import { MotionCard, MotionCardContainer } from "@/components/ui/motion-card";
import { AnimatedHeading } from "@/components/ui/enhanced-typography";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 md:p-8 max-w-4xl space-y-8 font-inter">
      <AnimatedHeading level={2} className="text-center">
        Manage Your Telegram Mini App
      </AnimatedHeading>

      <MotionCardContainer className="grid md:grid-cols-2 gap-6">
        <MotionCard className="bot-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚀 Telegram Mini App Setup
            </CardTitle>
            <CardDescription>
              Configure your Lovable app as a Telegram Mini App
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/telegram-setup')}
              className="w-full bg-telegram hover:bg-telegram/90"
              size="lg"
            >
              Setup Mini App Integration
            </Button>
          </CardContent>
        </MotionCard>

        <MotionCard className="bot-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📱 Preview Demo
            </CardTitle>
            <CardDescription>
              See how your Mini App will look in Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/miniapp-demo')}
              className="w-full"
              variant="outline"
              size="lg"
            >
              View Mini App Preview
            </Button>
          </CardContent>
        </MotionCard>
      </MotionCardContainer>

      <MotionCard>
        <CardHeader>
          <CardTitle>🔧 Build Mini App Content</CardTitle>
          <CardDescription>
            Update your mini app with the latest content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => navigate('/build-miniapp')}
            className="w-full"
            size="lg"
          >
            Build Mini App (Update Content)
          </Button>
        </CardContent>
      </MotionCard>

      <SystemResetButton />

      {/* Live Subscription Status */}
      <SubscriptionStatusCard 
        onUpgrade={() => {
          const plansSection = document.getElementById('live-plans-section');
          plansSection?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Live Plans Section */}
      <div id="live-plans-section">
        <LivePlansSection showPromo={true} />
      </div>
      
      <BotDashboard />
    </div>
  );
};

export default Index;
