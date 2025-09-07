import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, MessageCircle, Mail, Phone, Users, Instagram, Youtube, Facebook, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SocialLinks } from "@/components/ui/social-icons";

interface ContactLink {
  id: string;
  platform: string;
  display_name: string;
  url: string;
  icon_emoji?: string;
  is_active: boolean;
  display_order: number;
}

interface FooterProps {
  compact?: boolean;
}

const Footer: React.FC<FooterProps> = ({ compact = false }) => {
  const [contacts, setContacts] = useState<ContactLink[]>([]);

  useEffect(() => {
    fetchContacts();
    
    // Set up real-time subscription
    const contactsChannel = supabase
      .channel('footer-contact-links')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_links'
        },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contactsChannel);
    };
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_links')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(5); // Limit for footer display

      if (error) {
        console.error('Error fetching footer contacts:', error);
        return;
      }

      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching footer contacts:', error);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('telegram')) return <MessageCircle className="h-4 w-4" />;
    if (platformLower.includes('email')) return <Mail className="h-4 w-4" />;
    if (platformLower.includes('phone')) return <Phone className="h-4 w-4" />;
    if (platformLower.includes('whatsapp')) return <MessageCircle className="h-4 w-4" />;
    if (platformLower.includes('instagram')) return <Instagram className="h-4 w-4" />;
    if (platformLower.includes('youtube')) return <Youtube className="h-4 w-4" />;
    if (platformLower.includes('facebook')) return <Facebook className="h-4 w-4" />;
    if (platformLower.includes('tiktok')) return <TrendingUp className="h-4 w-4" />;
    if (platformLower.includes('tradingview')) return <TrendingUp className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  const socialLinks = [
    {
      platform: "instagram" as const,
      href: "https://instagram.com/dynamiccapital",
    },
    {
      platform: "facebook" as const,
      href: "https://facebook.com/dynamiccapital",
    },
    {
      platform: "tiktok" as const,
      href: "https://tiktok.com/@dynamiccapital",
    },
    {
      platform: "tradingview" as const,
      href: "https://tradingview.com/u/DynamicCapital",
    },
  ];

  const handleContactClick = (url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening contact link:', error);
    }
  };

  if (compact) {
    return (
      <footer className="bg-card/80 backdrop-blur-md border-t border-border/50 mt-4">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col items-center gap-2">
            {/* Social Media Icons Row */}
            {contacts.length > 0 && (
              <div className="flex gap-2">
                {contacts.slice(0, 4).map((contact) => (
                  <Button
                    key={contact.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleContactClick(contact.url)}
                    className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                    title={`Follow us on ${contact.platform}`}
                  >
                    {contact.icon_emoji ? (
                      <span className="text-xs">{contact.icon_emoji}</span>
                    ) : (
                      getPlatformIcon(contact.platform)
                    )}
                  </Button>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} Dynamic Capital. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Dynamic Capital VIP</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Premium trading signals and investment opportunities for VIP members. Join our community of successful traders.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-foreground">Quick Links</h4>
            <nav className="flex flex-col space-y-2" aria-label="Footer navigation">
              <Link 
                to="/plans" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                VIP Plans
              </Link>
              <Link 
                to="/checkout" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Checkout
              </Link>
              <Link 
                to="/contact" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact Us
              </Link>
              <Link 
                to="/education" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Education
              </Link>
            </nav>
          </div>

          {/* Contact Section */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-foreground">Connect With Us</h4>
            
            {/* Enhanced Social Media Links */}
            <div className="space-y-3">
              <SocialLinks 
                links={socialLinks} 
                variant="glass" 
                size="md" 
                className="justify-start" 
              />
              
              {/* Database Contact Links */}
              {contacts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {contacts.map((contact) => (
                    <Button
                      key={contact.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleContactClick(contact.url)}
                      className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                      title={`Follow us on ${contact.platform}`}
                    >
                      {contact.icon_emoji ? (
                        <span className="text-sm">{contact.icon_emoji}</span>
                      ) : (
                        getPlatformIcon(contact.platform)
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Contact Button */}
            <Link to="/contact">
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs w-full">
                <Mail className="h-3 w-3 mr-1" />
                Contact Support
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            © {new Date().getFullYear()} Dynamic Capital. All rights reserved.
          </p>
          <div className="hidden sm:block">
            <ThemeToggle size="sm" variant="ghost" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;