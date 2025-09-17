import { Mail, MessageCircle } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border py-6 text-xs text-muted-foreground">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:flex-row">
        <p>© {year} Dynamic Capital. All rights reserved.</p>
        <div className="flex gap-4">
          <a
            href="mailto:support@dynamic.capital"
            aria-label="Email support"
            className="hover:text-primary"
          >
            <Mail className="h-4 w-4" />
          </a>
          <a
            href="https://t.me/dynamiccapital"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
            className="hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
