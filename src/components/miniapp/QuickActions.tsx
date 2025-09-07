import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Bell, Star, Headphones, BookOpen } from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

export function QuickActions() {
  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  const quickActions: QuickAction[] = [
    {
      id: "contact",
      title: "Contact Support",
      description: "Get help from our team",
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => window.open('https://t.me/DynamicCapital_Support', '_blank'),
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20"
    },
    {
      id: "community",
      title: "Join Community",
      description: "Connect with traders",
      icon: <Users className="h-5 w-5" />,
      action: () => window.open('https://t.me/DynamicCapital_Community', '_blank'),
      color: "bg-green-500/10 text-green-600 border-green-500/20"
    },
    {
      id: "notifications",
      title: "Signal Alerts",
      description: "Get instant notifications",
      icon: <Bell className="h-5 w-5" />,
      action: () => {
        if (isInTelegram && window.Telegram?.WebApp?.requestWriteAccess) {
          window.Telegram.WebApp.requestWriteAccess();
        }
      },
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20"
    },
    {
      id: "reviews",
      title: "Member Reviews",
      description: "See what others say",
      icon: <Star className="h-5 w-5" />,
      action: () => window.open('https://t.me/DynamicCapital_Reviews', '_blank'),
      color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
    },
    {
      id: "education",
      title: "Trading Academy",
      description: "Learn & improve skills",
      icon: <BookOpen className="h-5 w-5" />,
      action: () => {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'education');
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new PopStateEvent('popstate'));
      },
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20"
    },
    {
      id: "vip_support",
      title: "VIP Support",
      description: "Priority assistance",
      icon: <Headphones className="h-5 w-5" />,
      action: () => window.open('https://t.me/Dynamic_VIP_BOT', '_blank'),
      color: "bg-pink-500/10 text-pink-600 border-pink-500/20"
    }
  ];

  return (
    <FadeInOnView>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Access key features and get support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <FadeInOnView key={action.id} delay={index * 100}>
                <Card 
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${action.color} border`}
                  onClick={action.action}
                >
                  <CardContent className="p-4 text-center">
                    <div className="mb-2 flex justify-center">
                      {action.icon}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{action.title}</h4>
                    <p className="text-xs opacity-80">{action.description}</p>
                  </CardContent>
                </Card>
              </FadeInOnView>
            ))}
          </div>
        </CardContent>
      </Card>
    </FadeInOnView>
  );
}