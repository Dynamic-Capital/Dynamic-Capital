import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Phone, Mail, MessageCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactLink {
  id: string;
  platform: string;
  display_name: string;
  url: string;
  icon_emoji?: string;
  is_active: boolean;
  display_order: number;
}

const Contact: React.FC = () => {
  const [contacts, setContacts] = useState<ContactLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
    
    // Set up real-time subscription
    const contactsChannel = supabase
      .channel('contact-links-changes')
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
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching contacts:', error);
        toast.error('Failed to load contact information');
        return;
      }

      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contact information');
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('telegram')) return <MessageCircle className="h-5 w-5" />;
    if (platformLower.includes('email')) return <Mail className="h-5 w-5" />;
    if (platformLower.includes('phone')) return <Phone className="h-5 w-5" />;
    if (platformLower.includes('whatsapp')) return <MessageCircle className="h-5 w-5" />;
    return <Users className="h-5 w-5" />;
  };

  const handleContactClick = (url: string, platform: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening contact link:', error);
      toast.error(`Failed to open ${platform} link`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-muted rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-telegram-light bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get in touch with our team through any of the channels below. We're here to help with your questions and support needs.
          </p>
        </div>

        {/* Contact Methods */}
        {contacts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <Card key={contact.id} className="bot-card hover:scale-105 cursor-pointer group">
                <CardHeader className="text-center pb-3">
                  <div className="bot-icon-wrapper w-16 h-16 bg-primary/10 mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                    {contact.icon_emoji ? (
                      <span className="text-2xl">{contact.icon_emoji}</span>
                    ) : (
                      <div className="text-primary">
                        {getPlatformIcon(contact.platform)}
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl">{contact.display_name}</CardTitle>
                  <Badge variant="secondary" className="w-fit mx-auto">
                    {contact.platform}
                  </Badge>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    onClick={() => handleContactClick(contact.url, contact.platform)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="lg"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Contact via {contact.platform}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Contact Methods Available</h3>
              <p className="text-muted-foreground">
                Contact information is being updated. Please check back later.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Additional Info */}
        <Card className="mt-12 bg-gradient-to-r from-primary/5 to-telegram-light/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Our support team is available to assist you with any questions about our VIP services, 
              payment processing, or technical issues.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Badge variant="outline" className="px-4 py-2">
                Response within 24 hours
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                Multiple languages supported
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contact;