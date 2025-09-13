"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MotionHoverCard, MotionStagger, MotionScrollReveal } from "@/components/ui/motion-components";
import { TrendingUp, Shield, Users } from "lucide-react";
import { callEdgeFunction } from "@/config/supabase";

const FeatureGrid = () => {
  const defaultContent = {
    heading: "Why Choose Dynamic Capital VIP?",
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
    <section className="py-20 bg-gradient-to-b from-background via-muted/10 to-background relative">
      {/* Interactive Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-[hsl(var(--dc-secondary)/0.1)] to-[hsl(var(--accent-teal)/0.1)] rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-[hsl(var(--dc-accent)/0.1)] to-[hsl(var(--accent-pink)/0.1)] rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>
      <div className="container mx-auto px-6">
        <MotionScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 font-poppins text-foreground">{content.heading}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-inter leading-relaxed">
              {content.subheading}
            </p>
          </div>
        </MotionScrollReveal>

        <MotionStagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-8">
          {content.features.map((feature, index) => (
            <MotionHoverCard key={index} hoverScale={1.05} hoverY={-10}>
              <Card className="bot-card group hover:shadow-2xl transition-all duration-500 hover:scale-105">
                <CardContent className="p-8 text-center">
                  <div
                    className={`bot-icon-wrapper w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${feature.color} transform group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-8 h-8 text-[hsl(var(--accent-light))]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors font-poppins">
                    {feature.title}
                  </h3>
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
  );
};

export default FeatureGrid;
