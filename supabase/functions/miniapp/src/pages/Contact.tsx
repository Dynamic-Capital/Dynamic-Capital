import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import PrimaryButton from "../components/PrimaryButton";
import { useApi } from "../hooks/useApi";
import Toast from "../components/Toast";

interface ContactLink {
  id: string;
  platform: string;
  display_name: string;
  url: string;
  icon_emoji?: string;
  is_active: boolean;
  display_order: number;
}

export default function Contact() {
  const [contacts, setContacts] = useState<ContactLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<
    { message: string; type: "success" | "error" } | null
  >(null);
  const { get } = useApi();

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await get("/contact-links");

      if (response.ok && response.data) {
        const activeContacts = response.data
          .filter((contact: ContactLink) => contact.is_active)
          .sort((a: ContactLink, b: ContactLink) =>
            a.display_order - b.display_order
          );
        setContacts(activeContacts);
      } else {
        throw new Error("Failed to fetch contact links");
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setToast({
        message: "Failed to load contact information",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleContactClick = (url: string, platform: string) => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.openLink(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Error opening contact link:", error);
      setToast({ message: `Failed to open ${platform} link`, type: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center py-12">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-700 rounded w-64 mx-auto"></div>
              <div className="h-4 bg-slate-700 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary via-green-400 to-blue-400 bg-clip-text text-transparent">
            Contact Support
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Get in touch with our team through any of the channels below. We're
            here to help with your questions and support needs.
          </p>
        </div>

        {/* Contact Methods */}
        {contacts.length > 0
          ? (
            <div className="grid gap-4 mb-8">
              {contacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-colors"
                >
                  <CardHeader className="text-center pb-3">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      {contact.icon_emoji && (
                        <span className="text-2xl">{contact.icon_emoji}</span>
                      )}
                      <CardTitle className="text-white text-lg">
                        {contact.display_name}
                      </CardTitle>
                    </div>
                    <Badge className="w-fit mx-auto bg-primary/20 text-primary border-primary/30">
                      {contact.platform}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-center">
                    <PrimaryButton
                      label={`Contact via ${contact.platform}`}
                      onClick={() =>
                        handleContactClick(contact.url, contact.platform)}
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )
          : (
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur text-center py-12 mb-8">
              <CardContent>
                <div className="text-slate-400 mb-4">
                  <svg
                    className="h-16 w-16 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  No Contact Methods Available
                </h3>
                <p className="text-slate-400">
                  Contact information is being updated. Please check back later.
                </p>
              </CardContent>
            </Card>
          )}

        {/* Additional Info */}
        <Card className="bg-gradient-to-r from-primary/20 to-blue-500/20 border-primary/30 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-center text-xl text-white">
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-300">
              Our support team is available to assist you with any questions
              about our VIP services, payment processing, or technical issues.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
                Response within 24 hours
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
                Multiple languages supported
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
