import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  ArrowRight,
  CreditCard,
  MessageCircle,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import TopBar from "../components/TopBar";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/50 to-background">
      <TopBar title="Dynamic Capital" />

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-8 pb-6">
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-4">
              <Sparkles className="h-4 w-4" />
              Premium Trading Platform
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Unlock VIP Trading Signals
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
            Join thousands of successful traders with exclusive market insights,
            daily analysis, and premium investment opportunities powered by DCT.
          </p>
        </div>

        {/* CTA Section */}
        <div className="mb-8">
          <Link to="/plan">
            <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30 hover:from-primary/30 hover:to-accent/30 transition-all duration-200">
              <CardHeader className="text-center pb-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-primary" />
                  <CardTitle className="text-foreground">
                    Start Your VIP Journey
                  </CardTitle>
                </div>
                <CardDescription className="text-muted-foreground text-sm">
                  Choose your subscription plan
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <div className="inline-flex items-center gap-2 text-primary text-sm font-medium">
                  Get Started <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link to="/bank">
            <Card className="bg-card/50 backdrop-blur border-border hover:bg-card/70 transition-colors">
              <CardHeader className="text-center py-4">
                <CreditCard className="h-5 w-5 text-primary mx-auto mb-2" />
                <CardTitle className="text-sm text-foreground">
                  Bank Payment
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Secure transfer
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/crypto">
            <Card className="bg-card/50 backdrop-blur border-border hover:bg-card/70 transition-colors">
              <CardHeader className="text-center py-4">
                <TrendingUp className="h-5 w-5 text-primary mx-auto mb-2" />
                <CardTitle className="text-sm text-foreground">
                  Crypto Payment
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Digital assets
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/token" className="col-span-2">
            <Card className="bg-gradient-to-r from-accent/20 to-primary/20 border-accent/40 hover:from-accent/30 hover:to-primary/30 transition-all">
              <CardHeader className="text-center py-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm text-foreground">
                    Dynamic Capital Token
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Manage DCT deposits, withdrawals, and swaps
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Benefits */}
        <Card className="bg-card/30 backdrop-blur border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-foreground text-lg">
              Why Choose VIP?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-foreground text-sm font-medium">
                  Exclusive Signals
                </div>
                <div className="text-muted-foreground text-xs">
                  High-accuracy trading alerts
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-foreground text-sm font-medium">
                  Daily Analysis
                </div>
                <div className="text-muted-foreground text-xs">
                  Professional market insights
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-foreground text-sm font-medium">
                  VIP Community
                </div>
                <div className="text-muted-foreground text-xs">
                  Connect with top traders
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-foreground text-sm font-medium">
                  Risk Management
                </div>
                <div className="text-muted-foreground text-xs">
                  Professional risk strategies
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account & Bot Link */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Link to="/me" className="flex-1">
              <Card className="bg-card/50 backdrop-blur border-border hover:bg-card/70 transition-colors">
                <CardHeader className="text-center py-3">
                  <Users className="h-4 w-4 text-primary mx-auto mb-1" />
                  <CardTitle className="text-xs text-foreground">
                    Account
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Status
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/status" className="flex-1">
              <Card className="bg-card/50 backdrop-blur border-border hover:bg-card/70 transition-colors">
                <CardHeader className="text-center py-3">
                  <Shield className="h-4 w-4 text-primary mx-auto mb-1" />
                  <CardTitle className="text-xs text-foreground">
                    Status
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Payment
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/contact" className="flex-1">
              <Card className="bg-card/50 backdrop-blur border-border hover:bg-card/70 transition-colors">
                <CardHeader className="text-center py-3">
                  <MessageCircle className="h-4 w-4 text-primary mx-auto mb-1" />
                  <CardTitle className="text-xs text-foreground">
                    Contact
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Support
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Open Bot Link */}
          <Card className="bg-gradient-to-r from-accent/20 to-primary/20 border-accent/30">
            <CardHeader className="text-center py-4">
              <CardTitle className="text-foreground text-sm mb-2">
                Open @DynamicCapital_Support
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mb-3">
                Access full bot features and commands
              </CardDescription>
              <a
                href="https://t.me/DynamicCapital_Support"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:text-primary/80 transition-colors"
              >
                Open Bot <ArrowRight className="h-4 w-4" />
              </a>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
