import { Sparkles, ArrowLeft, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LivePlansSection } from "@/components/shared/LivePlansSection";
import { useNavigate } from "react-router-dom";

const Plans = () => {
  const navigate = useNavigate();

  const handlePlanSelect = (planId: string) => {
    // For web users, open Telegram bot or show instructions
    const botUsername = "Dynamic_VIP_BOT";
    const telegramUrl = `https://t.me/${botUsername}?start=plan_${planId}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="w-4 h-4 mr-2" />
            VIP Trading Plans
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">VIP Plan</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Join Dynamic Capital's exclusive VIP community and get access to premium trading signals, 
            expert analysis, and profitable strategies.
          </p>

          {/* Web User Notice */}
          <Alert className="mb-8 max-w-2xl mx-auto border-blue-500/20 bg-blue-500/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-left">
              <strong>Complete your subscription in Telegram:</strong> After selecting a plan, 
              you'll be redirected to our Telegram bot to complete the secure payment process.
            </AlertDescription>
          </Alert>
        </div>

        {/* Plans Section */}
        <div className="max-w-5xl mx-auto">
          <LivePlansSection 
            showPromo={false}
            onPlanSelect={handlePlanSelect}
          />
        </div>

        {/* Why VIP Section */}
        <Card className="mt-12 bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Why Choose Dynamic Capital VIP?</CardTitle>
            <CardDescription className="text-center text-lg">
              Join thousands of successful traders who trust our premium signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">85%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <div className="text-sm text-muted-foreground">Expert Support</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">5000+</div>
                <div className="text-sm text-muted-foreground">VIP Members</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <div className="text-center mt-12">
          <h3 className="text-xl font-semibold mb-4">Need Help Choosing?</h3>
          <p className="text-muted-foreground mb-6">
            Contact our support team for personalized recommendations
          </p>
          <Button 
            variant="outline"
            onClick={() => window.open('https://t.me/Dynamic_VIP_BOT', '_blank')}
          >
            Contact Support on Telegram
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Plans;