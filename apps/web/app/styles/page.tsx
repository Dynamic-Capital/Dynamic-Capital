import { cn } from "@/lib/utils";

const UNIT_LABELS = {
  components: {
    singular: "component",
    plural: "components",
  },
  examples: {
    singular: "example",
    plural: "examples",
  },
} as const;

type CatalogUnit = keyof typeof UNIT_LABELS;

type CatalogItem = {
  name: string;
  count: number;
  unit?: CatalogUnit;
  description?: string;
};

type CatalogGroup = {
  title: string;
  tagline: string;
  items: CatalogItem[];
};

type CategoryBranding = {
  badge: {
    label: string;
    className: string;
  };
  tagline: string;
  accentTextClassName: string;
  countChipClassName: string;
  groupBadge: {
    label: string;
    className: string;
  };
  itemDescription: string;
  linkLabel: string;
  dotClassName: string;
  overlayClassName: string;
  cardHoverClassName: string;
};

type CatalogCategory = {
  title: string;
  description: string;
  branding: CategoryBranding;
  groups: CatalogGroup[];
};

const marketingCatalog: CatalogCategory = {
  title: "Marketing",
  description:
    "Dynamic Capital's marketing kit pairs hero narratives, feature storytelling, and social proof that feel on-brand from the first scroll.",
  branding: {
    badge: {
      label: "Campaign storytelling",
      className:
        "text-dc-brand border border-dc-brand/40 bg-dc-brand/10 shadow-sm shadow-dc-brand/20",
    },
    tagline:
      "Launch-ready journeys that move prospects from intrigue to action.",
    accentTextClassName: "text-dc-brand",
    countChipClassName:
      "text-dc-brand border border-dc-brand/30 bg-dc-brand/10",
    groupBadge: {
      label: "Brand forward",
      className: "text-dc-brand border border-dc-brand/30 bg-dc-brand/10",
    },
    itemDescription:
      "Story-driven modules tuned for launch campaigns, product drops, and investor updates.",
    linkLabel: "Preview marketing patterns",
    dotClassName: "bg-dc-brand/70",
    overlayClassName:
      "bg-gradient-to-tr from-dc-brand/20 via-dc-brand/5 to-transparent",
    cardHoverClassName: "hover:border-dc-brand/40 hover:shadow-dc-brand/20",
  },
  groups: [
    {
      title: "Page Sections",
      tagline:
        "Signature sections that frame your brand narrative from hero to conversion.",
      items: [
        { name: "Hero Sections", count: 12 },
        { name: "Feature Sections", count: 15 },
        { name: "CTA Sections", count: 11 },
        { name: "Bento Grids", count: 3 },
        { name: "Pricing Sections", count: 12 },
        { name: "Header Sections", count: 8 },
        { name: "Newsletter Sections", count: 6 },
        {
          name: "Stats",
          count: 8,
          description:
            "Use these Tailwind CSS stats components to include data insights, such as analytics, metrics, or financial information, in your interface. These components are designed and built by the Tailwind CSS team, and include a variety of different styles and layouts.",
        },
        { name: "Testimonials", count: 8 },
        { name: "Blog Sections", count: 7 },
        { name: "Contact Sections", count: 7 },
        { name: "Team Sections", count: 9 },
        { name: "Content Sections", count: 7 },
        { name: "Logo Clouds", count: 6 },
        { name: "FAQs", count: 7 },
        { name: "Footers", count: 7 },
      ],
    },
    {
      title: "Elements",
      tagline:
        "Navigation, promos, and accents that keep acquisition flows unmistakably yours.",
      items: [
        { name: "Headers", count: 11 },
        { name: "Flyout Menus", count: 7 },
        { name: "Banners", count: 13 },
      ],
    },
    {
      title: "Feedback",
      tagline:
        "Polished reassurance touchpoints for error states and empty journeys.",
      items: [
        { name: "404 Pages", count: 5 },
      ],
    },
    {
      title: "Page Examples",
      tagline:
        "Curated reference pages to accelerate brand launches and experiments.",
      items: [
        { name: "Landing Pages", count: 4, unit: "examples" },
        { name: "Pricing Pages", count: 3, unit: "examples" },
        { name: "About Pages", count: 3, unit: "examples" },
      ],
    },
  ],
};

const applicationCatalog: CatalogCategory = {
  title: "Application UI",
  description:
    "Dynamic Capital's product surfaces blend clarity and pace so internal teams and customers stay aligned across every workflow.",
  branding: {
    badge: {
      label: "Operational excellence",
      className:
        "text-dc-secondary border border-dc-secondary/40 bg-dc-secondary/10 shadow-sm shadow-dc-secondary/20",
    },
    tagline: "Interface foundations that balance speed, precision, and trust.",
    accentTextClassName: "text-dc-secondary",
    countChipClassName:
      "text-dc-secondary border border-dc-secondary/30 bg-dc-secondary/10",
    groupBadge: {
      label: "Product ready",
      className:
        "text-dc-secondary border border-dc-secondary/30 bg-dc-secondary/10",
    },
    itemDescription:
      "Resilient product primitives adapted for analytics dashboards, investor tooling, and internal portals.",
    linkLabel: "Inspect product UI",
    dotClassName: "bg-dc-secondary/70",
    overlayClassName:
      "bg-gradient-to-tr from-dc-secondary/20 via-dc-secondary/5 to-transparent",
    cardHoverClassName:
      "hover:border-dc-secondary/40 hover:shadow-dc-secondary/20",
  },
  groups: [
    {
      title: "Application Shells",
      tagline:
        "Dashboard scaffolding that anchors data-rich investor and operations experiences.",
      items: [
        { name: "Stacked Layouts", count: 9 },
        { name: "Sidebar Layouts", count: 8 },
        { name: "Multi-Column Layouts", count: 6 },
      ],
    },
    {
      title: "Headings",
      tagline:
        "Typography systems that keep product narratives sharp and legible.",
      items: [
        { name: "Page Headings", count: 9 },
        { name: "Card Headings", count: 6 },
        { name: "Section Headings", count: 10 },
      ],
    },
    {
      title: "Data Display",
      tagline:
        "Insight panels engineered for snapshots, trends, and investor-ready reporting.",
      items: [
        { name: "Description Lists", count: 6 },
        {
          name: "Stats",
          count: 5,
          description:
            "Use these Tailwind CSS stats components to include data insights, such as analytics, metrics, or financial information, in your interface. These components are designed and built by the Tailwind CSS team, and include a variety of different styles and layouts.",
        },
        { name: "Calendars", count: 8 },
      ],
    },
    {
      title: "Lists",
      tagline:
        "Collection layouts that organize complex records without sacrificing clarity.",
      items: [
        { name: "Stacked Lists", count: 15 },
        { name: "Tables", count: 19 },
        { name: "Grid Lists", count: 7 },
        { name: "Feeds", count: 3 },
      ],
    },
    {
      title: "Forms",
      tagline:
        "Conversion-minded form patterns tuned for onboarding, compliance, and approvals.",
      items: [
        { name: "Form Layouts", count: 4 },
        { name: "Input Groups", count: 21 },
        { name: "Select Menus", count: 7 },
        { name: "Sign-in and Registration", count: 4 },
        { name: "Textareas", count: 5 },
        { name: "Radio Groups", count: 12 },
        { name: "Checkboxes", count: 4 },
        { name: "Toggles", count: 5 },
        { name: "Action Panels", count: 8 },
        { name: "Comboboxes", count: 4 },
      ],
    },
    {
      title: "Feedback",
      tagline:
        "Status messaging that keeps teams confident across long-running tasks.",
      items: [
        { name: "Alerts", count: 6 },
        { name: "Empty States", count: 6 },
      ],
    },
    {
      title: "Navigation",
      tagline:
        "Wayfinding systems for multi-surface products and finance operations.",
      items: [
        { name: "Navbars", count: 11 },
        { name: "Pagination", count: 3 },
        { name: "Tabs", count: 9 },
        { name: "Vertical Navigation", count: 6 },
        { name: "Sidebar Navigation", count: 5 },
        { name: "Breadcrumbs", count: 4 },
        { name: "Progress Bars", count: 8 },
        { name: "Command Palettes", count: 8 },
      ],
    },
    {
      title: "Overlays",
      tagline: "Modal layers and notifications that respect focus and urgency.",
      items: [
        { name: "Modal Dialogs", count: 6 },
        { name: "Drawers", count: 12 },
        { name: "Notifications", count: 6 },
      ],
    },
    {
      title: "Elements",
      tagline: "Reusable micro-interactions with Dynamic Capital polish.",
      items: [
        { name: "Avatars", count: 11 },
        { name: "Badges", count: 16 },
        { name: "Dropdowns", count: 5 },
        { name: "Buttons", count: 8 },
        { name: "Button Groups", count: 5 },
      ],
    },
    {
      title: "Layout",
      tagline:
        "Responsive primitives that make complex product stories feel effortless.",
      items: [
        { name: "Containers", count: 5 },
        { name: "Cards", count: 10 },
        { name: "List Containers", count: 7 },
        { name: "Media Objects", count: 8 },
        { name: "Dividers", count: 8 },
      ],
    },
    {
      title: "Page Examples",
      tagline:
        "Opinionated app screens ready to anchor roadmap-critical flows.",
      items: [
        { name: "Home Screens", count: 2, unit: "examples" },
        { name: "Detail Screens", count: 2, unit: "examples" },
        { name: "Settings Screens", count: 2, unit: "examples" },
      ],
    },
  ],
};

type CatalogCounts = Record<CatalogUnit, number>;

const initialCounts: CatalogCounts = {
  components: 0,
  examples: 0,
};

const ecommerceCatalog: CatalogCategory = {
  title: "Ecommerce",
  description:
    "Dynamic Capital's commerce framework helps teams merchandise products with the same confidence they bring to financial experiences.",
  branding: {
    badge: {
      label: "Revenue storytelling",
      className:
        "text-dc-accent border border-dc-accent/40 bg-dc-accent/10 shadow-sm shadow-dc-accent/20",
    },
    tagline:
      "Conversion touchpoints that balance discovery, trust, and momentum.",
    accentTextClassName: "text-dc-accent",
    countChipClassName:
      "text-dc-accent border border-dc-accent/30 bg-dc-accent/10",
    groupBadge: {
      label: "Checkout ready",
      className: "text-dc-accent border border-dc-accent/30 bg-dc-accent/10",
    },
    itemDescription:
      "Merchandising patterns crafted for product drops, memberships, and experiential retail.",
    linkLabel: "Open commerce kits",
    dotClassName: "bg-dc-accent/70",
    overlayClassName:
      "bg-gradient-to-tr from-dc-accent/20 via-dc-accent/5 to-transparent",
    cardHoverClassName: "hover:border-dc-accent/40 hover:shadow-dc-accent/20",
  },
  groups: [
    {
      title: "Components",
      tagline:
        "Storefront essentials optimized for merchandising and high-velocity checkout journeys.",
      items: [
        { name: "Product Overviews", count: 5 },
        { name: "Product Lists", count: 11 },
        { name: "Category Previews", count: 6 },
        { name: "Shopping Carts", count: 6 },
        { name: "Category Filters", count: 5 },
        { name: "Product Quickviews", count: 4 },
        { name: "Product Features", count: 9 },
        { name: "Store Navigation", count: 5 },
        { name: "Promo Sections", count: 8 },
        { name: "Checkout Forms", count: 5 },
        { name: "Reviews", count: 4 },
        { name: "Order Summaries", count: 4 },
        { name: "Order History", count: 4 },
        { name: "Incentives", count: 8 },
      ],
    },
  ],
};

const catalogCategories: CatalogCategory[] = [
  marketingCatalog,
  applicationCatalog,
  ecommerceCatalog,
];

const catalogTotals = catalogCategories.reduce<CatalogCounts>(
  (acc, category) => {
    const categoryTotals = aggregateCategoryCounts(category);
    acc.components += categoryTotals.components;
    acc.examples += categoryTotals.examples;
    return acc;
  },
  { ...initialCounts },
);

function aggregateGroupCounts(group: CatalogGroup): CatalogCounts {
  return group.items.reduce<CatalogCounts>((acc, item) => {
    const unit: CatalogUnit = item.unit ?? "components";
    acc[unit] += item.count;
    return acc;
  }, { ...initialCounts });
}

function aggregateCategoryCounts(category: CatalogCategory): CatalogCounts {
  return category.groups.reduce<CatalogCounts>((acc, group) => {
    const groupTotals = aggregateGroupCounts(group);
    acc.components += groupTotals.components;
    acc.examples += groupTotals.examples;
    return acc;
  }, { ...initialCounts });
}

function formatCount(count: number, unit: CatalogUnit) {
  const label = count === 1
    ? UNIT_LABELS[unit].singular
    : UNIT_LABELS[unit].plural;
  return `${count} ${label}`;
}

export default function TailwindStylesPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-brand opacity-40 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
      </div>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 sm:py-20 lg:py-24">
        <header className="flex flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-dc-brand/40 bg-dc-brand/10 px-4 py-1 text-sm font-medium text-dc-brand shadow-sm shadow-dc-brand/20 backdrop-blur-sm">
            Dynamic Capital design system
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            Dynamic Capital Pattern Library
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            A brand-first catalog of marketing, product, and commerce components
            tailored for Dynamic Capital launches.
          </p>
          <p className="mx-auto max-w-xl text-sm font-medium text-muted-foreground">
            Every pattern is color-tuned to our gradient system so teams can
            ship polished experiences faster.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-dc-brand/30 bg-dc-brand/10 px-4 py-2 text-sm font-medium text-dc-brand shadow-sm">
              {formatCount(catalogTotals.components, "components")}
            </span>
            {catalogTotals.examples > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-dc-secondary/30 bg-dc-secondary/10 px-4 py-2 text-sm font-medium text-dc-secondary shadow-sm">
                {formatCount(catalogTotals.examples, "examples")}
              </span>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-16">
          {catalogCategories.map((category) => {
            const categoryTotals = aggregateCategoryCounts(category);
            const totalPatterns = category.groups.reduce(
              (total, group) => total + group.items.length,
              0,
            );

            return (
              <section key={category.title} className="flex flex-col gap-10">
                <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-lg shadow-primary/5 backdrop-blur-xl">
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0 -z-10 opacity-80 blur-3xl transition-opacity duration-500 ease-smooth",
                      category.branding.overlayClassName,
                    )}
                  />
                  <div className="relative flex flex-col gap-10 p-8">
                    <div className="flex flex-col gap-6 text-left lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex flex-col gap-4 lg:max-w-3xl">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                            category.branding.badge.className,
                          )}
                        >
                          {category.branding.badge.label}
                        </span>
                        <div className="flex flex-col gap-3">
                          <h2 className="text-3xl font-semibold text-foreground">
                            {category.title}
                          </h2>
                          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                            {category.description}
                          </p>
                          <p
                            className={cn(
                              "text-sm font-semibold uppercase tracking-wide",
                              category.branding.accentTextClassName,
                            )}
                          >
                            {category.branding.tagline}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 text-sm text-muted-foreground lg:items-end">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                              category.branding.countChipClassName,
                            )}
                          >
                            {formatCount(
                              categoryTotals.components,
                              "components",
                            )}
                          </span>
                          {categoryTotals.examples > 0 && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                                category.branding.countChipClassName,
                              )}
                            >
                              {formatCount(categoryTotals.examples, "examples")}
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase tracking-[0.18em]",
                            category.branding.accentTextClassName,
                          )}
                        >
                          {totalPatterns} curated patterns
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-10">
                      {category.groups.map((group) => {
                        const totals = aggregateGroupCounts(group);

                        return (
                          <article
                            key={group.title}
                            className={cn(
                              "flex flex-col gap-8 rounded-2xl border border-border/60 bg-background/80 p-6 shadow-md transition-transform duration-300 ease-smooth hover:-translate-y-1",
                              category.branding.cardHoverClassName,
                            )}
                          >
                            <div className="flex flex-col gap-4 border-b border-border/50 pb-5 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex flex-col gap-3 text-left">
                                <div className="flex flex-col gap-1">
                                  <h3 className="text-xl font-semibold text-foreground">
                                    {group.title}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {group.tagline}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-2 rounded-full px-3 py-1 shadow-sm",
                                      category.branding.countChipClassName,
                                    )}
                                  >
                                    {formatCount(
                                      totals.components,
                                      "components",
                                    )}
                                  </span>
                                  {totals.examples > 0 && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-2 rounded-full px-3 py-1 shadow-sm",
                                        category.branding.countChipClassName,
                                      )}
                                    >
                                      {formatCount(totals.examples, "examples")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-start gap-2 text-xs font-medium text-muted-foreground sm:items-end">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-2 rounded-full px-3 py-1 uppercase tracking-wide",
                                    category.branding.groupBadge.className,
                                  )}
                                >
                                  {category.branding.groupBadge.label}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1">
                                  {group.items.length} patterns
                                </span>
                              </div>
                            </div>

                            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                              {group.items.map((item) => {
                                const unit: CatalogUnit = item.unit ??
                                  "components";

                                return (
                                  <li
                                    key={item.name}
                                    className={cn(
                                      "group relative flex flex-col gap-4 rounded-xl border border-border/50 bg-background/80 p-5 shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5",
                                      category.branding.cardHoverClassName,
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <h4 className="text-base font-semibold text-foreground">
                                        {item.name}
                                      </h4>
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
                                          category.branding.countChipClassName,
                                        )}
                                      >
                                        {formatCount(item.count, unit)}
                                      </span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                      {item.description ??
                                        category.branding.itemDescription}
                                    </p>
                                    <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                                      <span className="inline-flex items-center gap-1">
                                        <span
                                          className={cn(
                                            "h-2 w-2 rounded-full",
                                            category.branding.dotClassName,
                                          )}
                                          aria-hidden="true"
                                        />
                                        Dynamic Capital ready
                                      </span>
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1 opacity-80 transition-all duration-200 ease-smooth group-hover:opacity-100 group-hover:translate-x-0.5",
                                          category.branding.accentTextClassName,
                                        )}
                                      >
                                        {category.branding.linkLabel}
                                        <svg
                                          aria-hidden="true"
                                          focusable="false"
                                          className="h-4 w-4 transition-transform duration-200 ease-smooth group-hover:translate-x-0.5"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="1.5"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M7 17L17 7" />
                                          <path d="M7 7H17V17" />
                                        </svg>
                                      </span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
