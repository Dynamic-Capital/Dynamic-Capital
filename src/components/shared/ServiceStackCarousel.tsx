import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, Star, Shield, Users, Sparkles, MessageSquare, Award } from "lucide-react";
import { FadeInOnView } from "@/components/ui/fade-in-on-view";
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from "@/lib/utils";

interface ServiceStackCarouselProps {
  services: string;
  className?: string;
}

interface ServiceItem {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

export function ServiceStackCarousel({ services, className }: ServiceStackCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'start',
    skipSnaps: false,
    dragFree: true
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const parseServices = (servicesText: string): ServiceItem[] => {
    const serviceLines = servicesText.split('\n').filter(service => service.trim());
    
    return serviceLines.map((service, index) => {
      const cleanService = service.replace(/[📈📊🛡️👨‍🏫💎📞]/g, '').replace('•', '').trim();
      
      const getServiceData = (text: string) => {
        if (text.includes('Signal')) return { 
          icon: TrendingUp, 
          title: 'Trading Signals', 
          description: 'Real-time market signals with entry and exit points',
          color: 'text-green-500'
        };
        if (text.includes('Analysis')) return { 
          icon: Star, 
          title: 'Market Analysis', 
          description: 'Daily comprehensive market research and insights',
          color: 'text-blue-500'
        };
        if (text.includes('Risk')) return { 
          icon: Shield, 
          title: 'Risk Management', 
          description: 'Professional guidance on protecting your capital',
          color: 'text-purple-500'
        };
        if (text.includes('Mentor')) return { 
          icon: Users, 
          title: 'Personal Mentor', 
          description: 'One-on-one guidance from experienced traders',
          color: 'text-orange-500'
        };
        if (text.includes('VIP')) return { 
          icon: Sparkles, 
          title: 'VIP Community', 
          description: 'Exclusive access to premium trading community',
          color: 'text-pink-500'
        };
        if (text.includes('Support')) return { 
          icon: MessageSquare, 
          title: '24/7 Support', 
          description: 'Round-the-clock customer support and assistance',
          color: 'text-cyan-500'
        };
        
        return { 
          icon: Award, 
          title: cleanService, 
          description: 'Premium service for VIP members',
          color: 'text-primary'
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
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <FadeInOnView delay={500} animation="slide-in-right">
      <Card className={cn("liquid-glass hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-subheading">
              <Award className="icon-sm text-primary animate-pulse-glow" />
              Our Services
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={scrollNext}
                disabled={!canScrollNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {serviceItems.map((service, index) => {
                const Icon = service.icon;
                const isActive = index === selectedIndex;
                
                return (
                  <div
                    key={index}
                    className="flex-[0_0_85%] min-w-0 mr-4 sm:flex-[0_0_45%] lg:flex-[0_0_30%]"
                  >
                    <div 
                      className={cn(
                        "relative p-4 rounded-lg border transition-all duration-500 hover:scale-[1.02] group cursor-pointer",
                        isActive 
                          ? "bg-primary/10 border-primary/30 shadow-lg scale-[1.02]" 
                          : "bg-muted/30 border-border hover:bg-muted/50"
                      )}
                      style={{
                        transform: isActive ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                        zIndex: isActive ? 10 : 1
                      }}
                    >
                      {/* Stack effect for non-active cards */}
                      {!isActive && (
                        <>
                          <div className="absolute inset-0 bg-muted/20 rounded-lg transform translate-x-1 translate-y-1 -z-10" />
                          <div className="absolute inset-0 bg-muted/10 rounded-lg transform translate-x-2 translate-y-2 -z-20" />
                        </>
                      )}
                      
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-full transition-all duration-300",
                          isActive ? "bg-primary/20 scale-110" : "bg-background group-hover:bg-primary/10"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5 transition-all duration-300",
                            isActive ? "text-primary animate-pulse-glow" : service.color + " group-hover:scale-110"
                          )} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className={cn(
                            "font-medium text-sm transition-colors duration-300",
                            isActive ? "text-primary" : "text-foreground"
                          )}>
                            {service.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {serviceItems.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === selectedIndex 
                    ? "bg-primary scale-125" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </FadeInOnView>
  );
}