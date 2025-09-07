import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Bell, Star, Headphones, BookOpen, ExternalLink, Zap, TrendingUp } from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import { toast } from "sonner";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  isExternal?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export function QuickActions() {
  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  const quickActions: QuickAction[] = [
    {
      id: "contact",
      title: "Contact Support",
      description: "Get help from our team",
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => {
        window.open('https://t.me/DynamicCapital_Support', '_blank');
        toast.success('Opening support chat...');
      },
      isExternal: true,
      priority: 'high'
    },
    {
      id: "vip_support",
      title: "VIP Support",
      description: "Priority assistance",
      icon: <Headphones className="h-5 w-5" />,
      action: () => {
        window.open('https://t.me/Dynamic_VIP_BOT', '_blank');
        toast.success('Opening VIP support...');
      },
      isExternal: true,
      priority: 'high'
    },
    {
      id: "community",
      title: "Join Community",
      description: "Connect with traders",
      icon: <Users className="h-5 w-5" />,
      action: () => {
        window.open('https://t.me/DynamicCapital_Community', '_blank');
        toast.success('Opening community...');
      },
      isExternal: true,
      priority: 'medium'
    },
    {
      id: "signals",
      title: "Signal Alerts",
      description: "Real-time notifications",
      icon: <Zap className="h-5 w-5" />,
      action: () => {
        if (isInTelegram) {
          toast.info('Enable notifications in Telegram settings for instant alerts');
        } else {
          toast.info('Download our Telegram bot for real-time signal alerts');
        }
      },
      priority: 'high'
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
        toast.success('Navigating to Trading Academy...');
      },
      priority: 'medium'
    },
    {
      id: "performance",
      title: "Track Performance",
      description: "Monitor your progress",
      icon: <TrendingUp className="h-5 w-5" />,
      action: () => {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'status');
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new PopStateEvent('popstate'));
        toast.success('Opening performance tracker...');
      },
      priority: 'medium'
    },
    {
      id: "reviews",
      title: "Member Reviews",
      description: "See what others say",
      icon: <Star className="h-5 w-5" />,
      action: () => {
        window.open('https://t.me/DynamicCapital_Reviews', '_blank');
        toast.success('Opening member reviews...');
      },
      isExternal: true,
      priority: 'low'
    }
  ];

  const getPriorityStyles = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:border-primary/50';
      case 'medium':
        return 'bg-gradient-to-br from-muted/50 to-background border-border hover:border-primary/30';
      case 'low':
        return 'bg-gradient-to-br from-muted/30 to-background border-border/50 hover:border-border';
      default:
        return 'bg-gradient-to-br from-muted/50 to-background border-border hover:border-primary/30';
    }
  };

  const getIconStyles = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return 'text-primary';
      case 'medium':
        return 'text-foreground';
      case 'low':
        return 'text-muted-foreground';
      default:
        return 'text-foreground';
    }
  };

  return (
    <FadeInOnView>
      <Card className="bg-gradient-to-br from-card/50 to-background border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Access key features and get support instantly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <FadeInOnView key={action.id} delay={index * 100}>
                <Card 
                  className={`
                    cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg
                    ${getPriorityStyles(action.priority)}
                    group relative overflow-hidden
                  `}
                  onClick={action.action}
                >
                  <CardContent className="p-4 text-center relative">
                    {action.isExternal && (
                      <ExternalLink className="absolute top-2 right-2 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    <div className={`mb-3 flex justify-center ${getIconStyles(action.priority)}`}>
                      <div className="p-2 rounded-full bg-background/50 group-hover:bg-background/80 transition-colors">
                        {action.icon}
                      </div>
                    </div>
                    <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                      {action.title}
                    </h4>
                    <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </FadeInOnView>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Pro Tip</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Join our VIP community for exclusive trading signals, market analysis, and 24/7 priority support.
            </p>
          </div>
        </CardContent>
      </Card>
    </FadeInOnView>
  );
}