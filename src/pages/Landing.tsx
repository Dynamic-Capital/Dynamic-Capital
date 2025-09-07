import { Sparkles, Shield, Zap, Users, TrendingUp, CheckCircle, Star, ArrowRight, Crown, Award, Target, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import MiniAppPreview from "@/components/telegram/MiniAppPreview";
import { LivePlansSection } from "@/components/shared/LivePlansSection";
import { ServiceStack } from "@/components/shared/ServiceStack";
import { AnimatedWelcome } from "@/components/welcome/AnimatedWelcome";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TypewriterText, GradientText, MorphingText } from "@/components/ui/animated-text";
import { MotionFadeIn, MotionStagger, MotionCounter, MotionHoverCard, MotionScrollReveal } from "@/components/ui/motion-components";

const Landing = () => {
  const handleOpenTelegram = () => {
    // Use the actual Dynamic Capital VIP Bot
    const botUsername = "Dynamic_VIP_BOT";
    const telegramUrl = `https://t.me/${botUsername}`;
    window.open(telegramUrl, '_blank');
  };

  const handleOpenMiniApp = () => {
    // Open mini app directly
    window.location.href = '/miniapp';
  };

  const handleJoinNow = () => {
    // Check if in Telegram, otherwise go to plans page
    const isInTelegram = Boolean(
      window.Telegram?.WebApp?.initData || 
      window.Telegram?.WebApp?.initDataUnsafe ||
      window.location.search.includes('tgWebAppPlatform') ||
      navigator.userAgent.includes('TelegramWebApp')
    );
    
    if (isInTelegram) {
      window.location.href = '/miniapp?tab=plan';
    } else {
      window.location.href = '/plans';
    }
  };

  return (
    <div className="min-h-screen bg-background font-inter text-foreground">
      {/* Floating Theme Toggle */}
      <ThemeToggle floating large size="lg" />
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-primary/90 to-purple-900 min-h-screen flex items-center">
        {/* Dynamic Animated Background */}
        <div className="absolute inset-0">
          {/* Floating Orbs with Enhanced Animation */}
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 bg-white/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
              x: [0, 50, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-300/30 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.5, 0.2],
              x: [0, -60, 0],
              y: [0, 40, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-400/25 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: 2 }}
          />
          
          {/* Particle Effects */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut"
              }}
            />
          ))}
          
          {/* Gradient Overlay for Better Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />
        </div>
        
        <div className="relative container mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-5xl">
            {/* Dynamic Floating Badge */}
            <MotionFadeIn delay={0.2}>
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                className="mb-8"
              >
                <Badge className="bg-white/30 text-white border-white/50 hover:bg-white/40 text-base px-6 py-2 backdrop-blur-md shadow-xl">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Crown className="w-5 h-5 mr-2" />
                  </motion.div>
                  <MorphingText 
                    texts={[
                      "#1 Premium Trading Platform",
                      "5000+ Active VIP Members", 
                      "92% Success Rate Proven",
                      "24/7 Expert Support"
                    ]}
                    interval={4000}
                    morphDuration={0.6}
                  />
                </Badge>
              </motion.div>
            </MotionFadeIn>
            
            {/* Animated Welcome Message */}
            <AnimatedWelcome />

            {/* Enhanced CTA Buttons */}
            <MotionFadeIn delay={1.5} direction="up" distance={50}>
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg" 
                    className="bg-white text-gray-900 hover:bg-gray-100 shadow-2xl hover:shadow-white/25 text-lg px-8 py-4 font-bold border-2 border-white/20"
                    onClick={handleJoinNow}
                  >
                    <Crown className="w-6 h-6 mr-2" />
                    Start VIP Journey
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-2 border-white/60 text-white hover:bg-white/30 backdrop-blur-md text-lg px-8 py-4 font-semibold shadow-xl"
                    onClick={handleOpenTelegram}
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Open Telegram Bot
                  </Button>
                </motion.div>
              </div>
            </MotionFadeIn>

            {/* Enhanced Trust Indicators */}
            <MotionStagger staggerDelay={0.2} initialDelay={1.8}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white/90">
                <motion.div 
                  className="text-center group cursor-pointer"
                  whileHover={{ scale: 1.1, y: -5 }}
                >
                  <MotionCounter 
                    from={0} 
                    to={5000} 
                    suffix="+" 
                    className="text-3xl md:text-5xl font-black mb-2 text-yellow-300 block"
                    delay={2}
                  />
                  <div className="text-sm md:text-base font-medium">Active VIP Members</div>
                </motion.div>
                
                <motion.div 
                  className="text-center group cursor-pointer"
                  whileHover={{ scale: 1.1, y: -5 }}
                >
                  <MotionCounter 
                    from={0} 
                    to={92} 
                    suffix="%" 
                    className="text-3xl md:text-5xl font-black mb-2 text-green-300 block"
                    delay={2.2}
                  />
                  <div className="text-sm md:text-base font-medium">Success Rate</div>
                </motion.div>
                
                <motion.div 
                  className="text-center group cursor-pointer"
                  whileHover={{ scale: 1.1, y: -5 }}
                >
                  <div className="text-3xl md:text-5xl font-black mb-2 text-pink-300">24/7</div>
                  <div className="text-sm md:text-base font-medium">Expert Support</div>
                </motion.div>
                
                <motion.div 
                  className="text-center group cursor-pointer"
                  whileHover={{ scale: 1.1, y: -5 }}
                >
                  <div className="text-3xl md:text-5xl font-black mb-2 text-blue-300 flex items-center justify-center gap-1">
                    5
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      ★
                    </motion.div>
                  </div>
                  <div className="text-sm md:text-base font-medium">Customer Rating</div>
                </motion.div>
              </div>
            </MotionStagger>

            {/* Scroll Indicator */}
            <MotionFadeIn delay={2.5}>
              <motion.div 
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
                  <motion.div 
                    className="w-1 h-3 bg-white/70 rounded-full mt-2"
                    animate={{ y: [0, 15, 0], opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            </MotionFadeIn>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-gradient-to-b from-background via-muted/20 to-background relative">
        {/* Subtle Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, -90, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <GradientText 
                text="Trusted by Elite Traders Worldwide"
                gradient="from-foreground via-primary to-purple-600"
                className="text-3xl md:text-5xl font-bold mb-6 font-poppins block"
                animate={true}
                animationDuration={6}
              />
              <TypewriterText 
                text="See what our VIP members are saying about their trading success"
                className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed"
                delay={1000}
                speed={30}
              />
            </div>
          </MotionScrollReveal>

          <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                name: "Sarah M.",
                role: "Professional Trader",
                avatar: "💼",
                text: "Dynamic Capital's signals increased my portfolio by 340% in 6 months. The accuracy is incredible!",
                profit: "+$45,000"
              },
              {
                name: "James L.",
                role: "Investment Manager", 
                avatar: "📈",
                text: "Best trading signals I've ever used. The community support and analysis are unmatched.",
                profit: "+$78,000"
              },
              {
                name: "Maria K.",
                role: "Day Trader",
                avatar: "🎯",
                text: "From losing money to consistent profits. Dynamic Capital changed my trading game completely!",
                profit: "+$32,000"
              }
            ].map((testimonial, index) => (
              <MotionHoverCard 
                key={index} 
                hoverScale={1.05} 
                hoverY={-10}
              >
                <Card className="p-6 bg-gradient-to-br from-card via-primary/5 to-purple-500/5 border-primary/20 hover:shadow-2xl duration-500 backdrop-blur-sm hover:border-primary/40">
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center text-xl">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <h4 className="font-semibold font-poppins text-foreground">{testimonial.name}</h4>
                        <p className="text-sm text-muted-foreground font-inter">{testimonial.role}</p>
                      </div>
                      <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-inter font-semibold">
                        {testimonial.profit}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground italic font-inter leading-relaxed">"{testimonial.text}"</p>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </MotionHoverCard>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Award className="w-4 h-4 mr-2" />
                Premium Services
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 font-poppins text-foreground">Everything You Need to Succeed</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
                Comprehensive trading solutions designed for maximum profitability
              </p>
            </div>
          </MotionScrollReveal>

          <ServiceStack 
            services="📈 Real-time Trading Signals
📊 Daily Market Analysis  
🛡️ Risk Management Guidance
👨‍🏫 Personal Trading Mentor
💎 Exclusive VIP Community
📞 24/7 Customer Support" 
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background via-muted/10 to-background relative">
        {/* Interactive Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 font-poppins text-foreground">Why Choose Dynamic Capital VIP?</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
                Get exclusive access to premium features designed for elite traders
              </p>
            </div>
          </MotionScrollReveal>

          <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "Premium Signals",
                description: "Receive high-accuracy trading signals with detailed entry, exit, and stop-loss levels. Our signals have a proven 92% success rate.",
                color: "from-green-500 to-emerald-600"
              },
              {
                icon: Shield,
                title: "Risk Management",
                description: "Professional risk management strategies to protect your capital and maximize profits with expert guidance every step of the way.",
                color: "from-blue-500 to-cyan-600"
              },
              {
                icon: Users,
                title: "VIP Community",
                description: "Join an exclusive community of successful traders and learn from the best. Network, share strategies, and grow together.",
                color: "from-purple-500 to-pink-600"
              }
            ].map((feature, index) => (
              <MotionHoverCard key={index} hoverScale={1.05} hoverY={-10}>
                <Card className="bot-card group hover:shadow-2xl transition-all duration-500 hover:scale-105">
                  <CardContent className="p-8 text-center">
                    <div className={`bot-icon-wrapper w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${feature.color} transform group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors font-poppins">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed font-inter">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </MotionHoverCard>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* Live Plans Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Crown className="w-4 h-4 mr-2" />
                VIP Membership
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Choose Your Trading Plan</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Flexible plans designed to match your trading goals and experience level
              </p>
            </div>
          </MotionScrollReveal>
          
          <LivePlansSection showPromo={true} />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20 relative">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)/0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        <div className="container mx-auto px-6">
          <MotionScrollReveal>
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Target className="w-4 h-4 mr-2" />
                Simple Process
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Get Started in 3 Easy Steps</h2>
              <p className="text-xl text-muted-foreground">
                Join thousands of successful traders in minutes
              </p>
            </div>
          </MotionScrollReveal>

          <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: Crown,
                title: "Choose Your VIP Plan",
                description: "Select a subscription plan that fits your trading style and budget. All plans include premium signals and community access.",
                color: "from-blue-500 to-cyan-600"
              },
              {
                step: "2", 
                icon: DollarSign,
                title: "Secure Payment",
                description: "Pay securely via bank transfer, cryptocurrency, or other supported methods. Get instant access upon confirmation.",
                color: "from-green-500 to-emerald-600"
              },
              {
                step: "3",
                icon: TrendingUp,
                title: "Start Profiting",
                description: "Receive premium trading signals, join our VIP community, and start your journey to consistent trading profits.",
                color: "from-purple-500 to-pink-600"
              }
            ].map((item, index) => (
              <MotionHoverCard key={index} hoverScale={1.05} hoverY={-10}>
                <div className="text-center group hover:scale-105 transition-all duration-300">
                  <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center relative group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-3xl font-bold text-white">{item.step}</span>
                    <div className="absolute -inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className={`w-12 h-12 mx-auto mb-4 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </MotionHoverCard>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* Mini App Preview */}
      <section id="preview-section" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <MotionFadeIn direction="right" distance={50}>
                <Badge className="mb-4 bg-telegram/10 text-telegram border-telegram/20">
                  <Zap className="w-4 h-4 mr-2" />
                  Live Demo
                </Badge>
                
                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                  Experience Our Telegram Mini App
                </h2>
                
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  See how easy it is to access premium trading signals and manage your VIP subscription 
                  directly within Telegram. No downloads required!
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    "⚡ Instant access to trading signals",
                    "💳 Real-time payment processing", 
                    "📱 Seamless Telegram integration",
                    "🎯 Mobile-optimized interface"
                  ].map((feature, index) => (
                    <MotionFadeIn key={index} delay={index * 0.1}>
                      <div className="flex items-center group hover:scale-105 transition-transform duration-200">
                        <CheckCircle className="w-6 h-6 text-green-500 mr-4 group-hover:scale-110 transition-transform" />
                        <span className="text-lg">{feature}</span>
                      </div>
                    </MotionFadeIn>
                  ))}
                </div>

                <Button 
                  size="lg" 
                  className="bg-telegram hover:bg-telegram-dark shadow-lg hover:shadow-telegram/25 transform hover:scale-105 transition-all duration-300"
                  onClick={handleOpenTelegram}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Try It Now in Telegram
                </Button>
              </MotionFadeIn>
            </div>

            <MotionFadeIn delay={0.3} scale>
              <div className="lg:order-first">
                <MiniAppPreview className="mx-auto transform hover:scale-105 transition-transform duration-300" />
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-telegram to-purple-600 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-yellow-300/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative container mx-auto px-6 text-center">
          <div className="mx-auto max-w-4xl">
            <MotionFadeIn scale>
              <Badge className="mb-6 bg-white/20 text-white border-white/30 text-lg px-6 py-2">
                <Crown className="w-5 h-5 mr-2" />
                Limited Time Offer
              </Badge>
              
              <h2 className="text-4xl md:text-6xl font-black text-white mb-8">
                Ready to Transform Your Trading?
              </h2>
              
              <p className="text-xl md:text-2xl text-white/95 mb-12 leading-relaxed">
                Join thousands of successful traders who trust Dynamic Capital for premium signals and proven strategies. 
                <span className="block mt-2 text-yellow-300 font-bold">Start your VIP journey today!</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-telegram hover:bg-yellow-50 shadow-2xl hover:shadow-yellow-500/25 transform hover:scale-105 transition-all duration-300 text-xl px-10 py-5 font-bold"
                  onClick={handleJoinNow}
                >
                  <Sparkles className="w-6 h-6 mr-2" />
                  Get VIP Access Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-white/40 text-white hover:bg-white/20 backdrop-blur-sm text-xl px-10 py-5 font-semibold transform hover:scale-105 transition-all duration-300"
                  onClick={handleOpenTelegram}
                >
                  Start Free Trial
                </Button>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;