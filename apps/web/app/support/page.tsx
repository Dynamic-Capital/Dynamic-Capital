import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Headphones,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewTabAnnouncement } from "@/components/ui/accessibility-utils";
import { buildMetadata } from "@/lib/seo";

const pagePath = "/support";

export const metadata = buildMetadata({
  title: "Support | Dynamic Capital",
  description:
    "Reach the Dynamic Capital concierge desk, explore guides, and access Telegram VIP support.",
  canonicalPath: pagePath,
});

const conciergeUrl = "https://t.me/DynamicCapital_Support";

const RESOURCE_LINKS = [
  {
    icon: MessageCircle,
    title: "Ping the concierge",
    description:
      "Talk directly with a desk lead for billing, VIP upgrades, or trade execution requests.",
    action: (
      <Button asChild variant="telegram" className="mt-6">
        <a href={conciergeUrl} target="_blank" rel="noopener noreferrer">
          Message on Telegram
          <NewTabAnnouncement />
          <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </a>
      </Button>
    ),
  },
  {
    icon: Headphones,
    title: "Desk coverage",
    description:
      "Submit a help request and the rotation lead responds within minutes—24/7, every trading day.",
    action: (
      <Button
        asChild
        variant="outline"
        className="mt-6 border-telegram text-telegram hover:text-white"
      >
        <a href={conciergeUrl} target="_blank" rel="noopener noreferrer">
          Request a callback
          <NewTabAnnouncement />
          <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </a>
      </Button>
    ),
  },
  {
    icon: BookOpen,
    title: "Quick-start library",
    description:
      "Browse trading playbooks, automation templates, and onboarding checklists for every membership tier.",
    action: (
      <Button asChild variant="link" className="mt-6 text-telegram">
        <Link href="/blog">
          <span className="contents">
            Explore guides
            <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      </Button>
    ),
  },
] as const;

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background/90 to-background">
      <section className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16 md:gap-16 md:py-24">
        <header className="space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-white/80">
            <ShieldCheck className="h-4 w-4 text-telegram" aria-hidden="true" />
            Always-on support
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Concierge support for every VIP member
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Tap a path below to connect with a human instantly, review
              onboarding resources, or hand off a desk task to the Dynamic
              Capital team.
            </p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {RESOURCE_LINKS.map((resource) => (
            <Card
              key={resource.title}
              className="border border-white/10 bg-white/5 backdrop-blur transition hover:border-telegram/40 hover:bg-white/10"
            >
              <CardHeader className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-telegram/10 text-telegram">
                  <resource.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle className="text-2xl font-semibold text-foreground">
                  {resource.title}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed text-muted-foreground">
                  {resource.description}
                </CardDescription>
              </CardHeader>
              <CardContent>{resource.action}</CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-white/10 bg-white/[0.04] backdrop-blur">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold text-foreground">
                Need the operations console?
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Admins can still access the Telegram Bot Dashboard for
                automation and analytics.
              </CardDescription>
            </div>
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-foreground"
            >
              <Link href="/telegram">
                <span className="contents">
                  Open bot dashboard
                  <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </Button>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}
