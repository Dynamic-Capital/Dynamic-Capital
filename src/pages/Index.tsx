import BotDashboard from "@/components/telegram/BotDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bot-card">
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
        </Card>

        <Card className="bot-card">
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
        </Card>
      </div>

      <Card>
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
      </Card>
      
      <BotDashboard />
    </div>
  );
};

export default Index;
