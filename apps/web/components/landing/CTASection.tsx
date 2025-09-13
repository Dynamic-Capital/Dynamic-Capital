"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MotionFadeIn } from "@/components/ui/motion-components";
import { Crown, Sparkles, ArrowRight } from "lucide-react";
import { callEdgeFunction } from "@/config/supabase";

interface CTASectionProps { onJoinNow: () => void; onOpenTelegram: () => void; }

const CTASection = ({ onJoinNow, onOpenTelegram }: CTASectionProps) => {
  const defaultContent = {
    badge: "Limited Time Offer",
    title: "Ready to Transform Your Trading?",
    description:
      "Join thousands of successful traders who trust Dynamic Capital for premium signals and proven strategies.",
    highlight: "Start your VIP journey today!",
    primaryButton: "Get VIP Access Now",
    secondaryButton: "Start Free Trial",
  };

  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await callEdgeFunction('CONTENT_BATCH', {
          method: 'POST',
          body: {
            keys: [
              'cta_badge',
              'cta_title',
              'cta_description',
              'cta_highlight',
              'cta_primary_button',
              'cta_secondary_button',
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
            badge: lookup.cta_badge ?? defaultContent.badge,
            title: lookup.cta_title ?? defaultContent.title,
            description: lookup.cta_description ?? defaultContent.description,
            highlight: lookup.cta_highlight ?? defaultContent.highlight,
            primaryButton: lookup.cta_primary_button ?? defaultContent.primaryButton,
            secondaryButton: lookup.cta_secondary_button ?? defaultContent.secondaryButton,
          });
        } else if (error) {
          console.error('Failed to fetch CTA content:', error.message);
        }
      } catch (err) {
        console.error('Failed to fetch CTA content:', err);
      }
    };

    fetchContent();
  }, []);

  return (
      <section className="py-20 bg-gradient-to-br from-primary via-telegram to-[hsl(var(--dc-accent))] relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-[hsl(var(--accent-light)/0.1)] rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-[hsl(var(--accent-gold)/0.2)] rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative container mx-auto px-6 text-center">
          <div className="mx-auto max-w-4xl">
            <MotionFadeIn scale>
              <Badge className="mb-6 bg-[hsl(var(--accent-light)/0.2)] text-[hsl(var(--accent-light))] border-[hsl(var(--accent-light)/0.3)] text-lg px-6 py-2">
                <Crown className="w-5 h-5 mr-2" />
                {content.badge}
              </Badge>

              <h2 className="text-4xl md:text-6xl font-black text-[hsl(var(--accent-light))] mb-8">
                {content.title}
              </h2>

              <p className="text-xl md:text-2xl text-[hsl(var(--accent-light)/0.95)] mb-12 leading-relaxed">
                {content.description}
                <span className="block mt-2 text-[hsl(var(--accent-gold))] font-bold">{content.highlight}</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button 
                  size="lg" 
                  className="bg-[hsl(var(--accent-light))] text-[hsl(var(--telegram))] hover:bg-[hsl(var(--accent-gold)/0.05)] shadow-2xl hover:shadow-[0_0_15px_hsl(var(--accent-gold)/0.25)] transform hover:scale-105 transition-all duration-300 text-xl px-10 py-5 font-bold"
                  onClick={onJoinNow}
                >
                  <Sparkles className="w-6 h-6 mr-2" />
                  {content.primaryButton}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-[hsl(var(--accent-light)/0.4)] text-[hsl(var(--accent-light))] hover:bg-[hsl(var(--accent-light)/0.2)] backdrop-blur-sm text-xl px-10 py-5 font-semibold transform hover:scale-105 transition-all duration-300"
                  onClick={onOpenTelegram}
                >
                  {content.secondaryButton}
                </Button>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </section>
  );
};

export default CTASection;
