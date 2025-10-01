"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/utils";
import { StackCard } from "@/components/ui/stack-card";
import { PatternCard } from "@/components/ui/pattern-card";

interface ServiceStackCarouselProps {
  services: string;
  className?: string;
}

interface ServiceItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

export function ServiceStackCarousel(
  { services, className }: ServiceStackCarouselProps,
) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    skipSnaps: false,
    dragFree: true,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const parseServices = (servicesText: string): ServiceItem[] => {
    const serviceLines = servicesText.split("\n").filter((service) =>
      service.trim()
    );

    return serviceLines.map((service, index) => {
      const cleanService = service
        .replace(/\p{Extended_Pictographic}/gu, "")
        .replace("•", "")
        .trim();

      const getServiceData = (text: string) => {
        if (text.includes("Signal")) {
          return {
            icon: TrendingUp,
            title: "Trading Signals",
            description: "Real-time market signals with entry and exit points",
            color: "text-green-500",
          };
        }
        if (text.includes("Analysis")) {
          return {
            icon: Star,
            title: "Market Analysis",
            description: "Daily comprehensive market research and insights",
            color: "text-blue-500",
          };
        }
        if (text.includes("Risk")) {
          return {
            icon: Shield,
            title: "Risk Management",
            description: "Professional guidance on protecting your capital",
            color: "text-primary",
          };
        }
        if (text.includes("Mentor")) {
          return {
            icon: Users,
            title: "Personal Mentor",
            description: "One-on-one guidance from experienced traders",
            color: "text-orange-500",
          };
        }
        if (text.includes("VIP")) {
          return {
            icon: Sparkles,
            title: "VIP Community",
            description: "Exclusive access to premium trading community",
            color: "text-accent",
          };
        }
        if (text.includes("Support")) {
          return {
            icon: MessageSquare,
            title: "24/7 Support",
            description: "Round-the-clock customer support and assistance",
            color: "text-cyan-500",
          };
        }

        return {
          icon: Award,
          title: cleanService,
          description: "Premium service for VIP members",
          color: "text-primary",
        };
      };

      return getServiceData(cleanService);
    });
  };

  const serviceItems = parseServices(services);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <FadeInOnView delay={500} animation="slide-in-right">
      <Card
        className={cn(
          "liquid-glass hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] ui-rounded-lg ui-shadow ui-border-glass",
          className,
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading text-center justify-center">
            <span className="text-lg">⚡</span>
            Our Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden snap-x snap-mandatory" ref={emblaRef}>
            <div className="flex">
              {serviceItems.map((service, index) => {
                const Icon = service.icon;
                const isActive = index === selectedIndex;

                return (
                  <div
                    key={index}
                    className="flex-none w-full snap-start"
                  >
                    <StackCard
                      className="h-full"
                      stackSize={isActive ? 1 : 3}
                      spreadOnHover={true}
                      rotateOnHover={true}
                      scaleOnHover={true}
                      stackOffset={4}
                      stackRotation={2}
                      depth={20}
                    >
                      <PatternCard
                        pattern={index % 3 === 0
                          ? "dots"
                          : index % 3 === 1
                          ? "circuit"
                          : "grid"}
                        patternOpacity={0.05}
                        animated={true}
                        hover3d={true}
                        className={cn(
                          "transition-all duration-500 group cursor-pointer",
                          isActive
                            ? "bg-primary/10 border-primary/30 shadow-lg"
                            : "bg-muted/30 border-border hover:bg-muted/50",
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "p-2 rounded-full transition-all duration-300",
                                isActive
                                  ? "bg-primary/20 scale-110"
                                  : "bg-background group-hover:bg-primary/10",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-5 w-5 transition-all duration-300",
                                  isActive
                                    ? "text-primary animate-pulse-glow"
                                    : service.color + " group-hover:scale-110",
                                )}
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <h4
                                className={cn(
                                  "font-semibold text-subheading transition-colors duration-300 leading-tight",
                                  isActive ? "text-primary" : "text-foreground",
                                )}
                              >
                                {service.title}
                              </h4>
                              <p className="text-body-sm text-muted-foreground leading-relaxed break-words">
                                {service.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </PatternCard>
                    </StackCard>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simplified Dots indicator - max 4-6 dots */}
          <div className="flex justify-center gap-2 mt-4">
            {serviceItems.slice(0, Math.min(6, serviceItems.length)).map((
              _,
              index,
            ) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                aria-current={index === selectedIndex ? "true" : "false"}
                aria-label={`View service ${index + 1}`}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === selectedIndex
                    ? "bg-primary scale-125"
                    : "bg-muted-foreground/40 hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </FadeInOnView>
  );
}
