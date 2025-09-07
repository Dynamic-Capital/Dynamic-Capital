import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, MessageCircle, Mail, Phone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ContactLink {
  id: string;
  platform: string;
  display_name: string;
  url: string;
  icon_emoji?: string;
  is_active: boolean;
  display_order: number;
}

const Footer: React.FC = () => {
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
    return <Users className="h-4 w-4" />;
  };

  const handleContactClick = (url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening contact link:', error);
    }
  };

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Dynamic Capital VIP</h3>
            <p className="text-sm text-muted-foreground">
              Premium trading signals and investment opportunities for VIP members.
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
            {contacts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contacts.map((contact) => (
                  <Button
                    key={contact.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleContactClick(contact.url)}
                    className="h-8 px-3 text-xs"
                    title={`Contact via ${contact.platform}`}
                  >
                    {contact.icon_emoji ? (
                      <span className="mr-1 text-sm">{contact.icon_emoji}</span>
                    ) : (
                      <span className="mr-1">{getPlatformIcon(contact.platform)}</span>
                    )}
                    {contact.display_name}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                ))}
              </div>
            ) : (
              <Link to="/contact">
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  Contact Us
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Dynamic Capital VIP. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;