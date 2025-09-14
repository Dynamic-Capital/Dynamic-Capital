"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MotionHoverCard, MotionStagger, MotionScrollReveal } from "@/components/ui/motion-components";
import { TrendingUp, Shield, Users } from "lucide-react";
import { callEdgeFunction } from "@/config/supabase";
import { motion } from "framer-motion";

const FeatureGrid = () => {
  const defaultContent = {
    heading: "Why Choose Dynamic Capital?",
    subheading: "Get exclusive access to premium features designed for elite traders",
    features: [
      {
        icon: TrendingUp,
        title: "Premium Signals",
        description:
          "Receive high-accuracy trading signals with detailed entry, exit, and stop-loss levels. Our signals have a proven 92% success rate.",
        color: "from-[hsl(var(--accent-green-light))] to-[hsl(var(--accent-green))]",
      },
      {
        icon: Shield,
        title: "Risk Management",
        description:
          "Professional risk management strategies to protect your capital and maximize profits with expert guidance every step of the way.",
        color: "from-[hsl(var(--dc-secondary))] to-[hsl(var(--accent-teal))]",
      },
      {
        icon: Users,
        title: "VIP Community",
        description:
          "Join an exclusive community of successful traders and learn from the best. Network, share strategies, and grow together.",
        color: "from-[hsl(var(--dc-accent))] to-[hsl(var(--accent-pink))]",
      },
    ],
  };

  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await callEdgeFunction('CONTENT_BATCH', {
          method: 'POST',
          body: {
            keys: [
              'features_heading',
              'features_subheading',
              'feature1_title',
              'feature1_description',
              'feature2_title',
              'feature2_description',
              'feature3_title',
              'feature3_description',
            ],
          },
        });

        if (!error && data) {
          const items = (data as any).contents || [];
          const lookup: Record<string, string> = {};
          items.forEach((c: any) => {
            lookup[c.content_key] = c.content_value;
          });

          setContent({
            heading: lookup.features_heading ?? defaultContent.heading,
            subheading: lookup.features_subheading ?? defaultContent.subheading,
            features: [
              {
                ...defaultContent.features[0],
                title: lookup.feature1_title ?? defaultContent.features[0].title,
                description:
                  lookup.feature1_description ?? defaultContent.features[0].description,
              },
              {
                ...defaultContent.features[1],
                title: lookup.feature2_title ?? defaultContent.features[1].title,
                description:
                  lookup.feature2_description ?? defaultContent.features[1].description,
              },
              {
                ...defaultContent.features[2],
                title: lookup.feature3_title ?? defaultContent.features[2].title,
                description:
                  lookup.feature3_description ?? defaultContent.features[2].description,
              },
            ],
          });
        } else if (error) {
          console.error('Failed to fetch feature content:', error.message);
        }
      } catch (err) {
        console.error('Failed to fetch feature content:', err);
      }
    };

    fetchContent();
  }, []);

  return (
    <section className="py-24 bg-gradient-to-b from-background via-card/20 to-background relative overflow-hidden">
      {/* Enhanced Interactive Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-dc-secondary/15 via-accent-teal/10 to-transparent rounded-full blur-3xl animate-pulse opacity-60" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-dc-accent/15 via-accent-pink/10 to-transparent rounded-full blur-3xl animate-pulse opacity-60" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-primary/8 via-transparent to-dc-accent/8 rounded-full blur-3xl animate-pulse opacity-40" style={{ animationDelay: '4s' }} />
        
        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-3 h-3 bg-primary rounded-full animate-bounce opacity-60" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-32 w-2 h-2 bg-dc-accent rounded-full animate-bounce opacity-60" style={{ animationDelay: '3s' }} />
        <div className="absolute top-40 left-1/4 w-4 h-4 bg-accent-teal rounded-full animate-bounce opacity-60" style={{ animationDelay: '5s' }} />
      </div>
      <div className="container mx-auto px-6">
        <MotionScrollReveal>
          <div className="text-center mb-20">
            <motion.h2 
              className="text-4xl md:text-6xl font-bold mb-8 font-poppins relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <span className="bg-gradient-to-r from-foreground via-primary to-dc-accent bg-clip-text text-transparent">
                {content.heading}
              </span>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-dc-accent/10 to-primary/10 blur-2xl opacity-50 -z-10" />
            </motion.h2>
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto font-inter leading-relaxed font-light"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {content.subheading}
            </motion.p>
          </div>
        </MotionScrollReveal>

        <MotionStagger staggerDelay={0.15} className="grid md:grid-cols-3 gap-10">
          {content.features.map((feature, index) => (
            <MotionHoverCard key={index} hoverScale={1.02} hoverY={-8}>
              <motion.div
                className="relative group"
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl border border-border/30 shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:border-primary/40">
                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-dc-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardContent className="relative p-10 text-center">
                    <motion.div
                      className={`bot-icon-wrapper w-20 h-20 mx-auto mb-8 bg-gradient-to-br ${feature.color} shadow-lg group-hover:shadow-xl`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <feature.icon className="w-10 h-10 text-white" />
                    </motion.div>
                    
                    <h3 className="text-2xl font-bold mb-5 group-hover:text-primary transition-colors font-poppins tracking-tight">
                      {feature.title}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed font-inter text-lg group-hover:text-foreground/80 transition-colors">
                      {feature.description}
                    </p>
                    
                    {/* Decorative Element */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent group-hover:via-primary transition-all duration-500" />
                  </CardContent>
                </Card>
                
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10`} />
              </motion.div>
            </MotionHoverCard>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
};

export default FeatureGrid;
