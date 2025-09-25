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
};

type CatalogGroup = {
  title: string;
  items: CatalogItem[];
};

type CatalogCategory = {
  title: string;
  description: string;
  groups: CatalogGroup[];
};

const componentCatalog: CatalogCategory = {
  title: "Application UI",
  description:
    "Form layouts, tables, modal dialogs — everything you need to build beautiful responsive web applications.",
  groups: [
    {
      title: "Application Shells",
      items: [
        { name: "Stacked Layouts", count: 9 },
        { name: "Sidebar Layouts", count: 8 },
        { name: "Multi-Column Layouts", count: 6 },
      ],
    },
    {
      title: "Headings",
      items: [
        { name: "Page Headings", count: 9 },
        { name: "Card Headings", count: 6 },
        { name: "Section Headings", count: 10 },
      ],
    },
    {
      title: "Data Display",
      items: [
        { name: "Description Lists", count: 6 },
        { name: "Stats", count: 5 },
        { name: "Calendars", count: 8 },
      ],
    },
    {
      title: "Lists",
      items: [
        { name: "Stacked Lists", count: 15 },
        { name: "Tables", count: 19 },
        { name: "Grid Lists", count: 7 },
        { name: "Feeds", count: 3 },
      ],
    },
    {
      title: "Forms",
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
      items: [
        { name: "Alerts", count: 6 },
        { name: "Empty States", count: 6 },
      ],
    },
    {
      title: "Navigation",
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
      items: [
        { name: "Modal Dialogs", count: 6 },
        { name: "Drawers", count: 12 },
        { name: "Notifications", count: 6 },
      ],
    },
    {
      title: "Elements",
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

const catalogTotals = componentCatalog.groups.reduce<CatalogCounts>(
  (acc, group) => {
    group.items.forEach((item) => {
      const unit: CatalogUnit = item.unit ?? "components";
      acc[unit] += item.count;
    });
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
          <span className="inline-flex items-center gap-2 px-4 py-1 text-sm font-medium text-primary rounded-full border border-primary/30 bg-primary/10 shadow-sm shadow-primary/20 backdrop-blur-sm">
            Tailwind CSS Library
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            {componentCatalog.title} Component Index
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {componentCatalog.description}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground rounded-full border border-border/60 bg-background/80 shadow-sm">
              {formatCount(catalogTotals.components, "components")}
            </span>
            {catalogTotals.examples > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground rounded-full border border-border/60 bg-background/80 shadow-sm">
                {formatCount(catalogTotals.examples, "examples")}
              </span>
            )}
          </div>
        </header>

        <div className="grid gap-10">
          {componentCatalog.groups.map((group) => {
            const totals = aggregateGroupCounts(group);
            return (
              <article
                key={group.title}
                className="flex flex-col gap-8 p-8 rounded-3xl border border-border/60 bg-card/70 shadow-lg shadow-primary/5 backdrop-blur-xl transition-transform duration-300 ease-smooth hover:-translate-y-1 hover:shadow-primary/20"
              >
                <div className="flex flex-col gap-2 pb-6 border-b border-border/60 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-1 text-left">
                    <h2 className="text-2xl font-semibold text-foreground">
                      {group.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {formatCount(totals.components, "components")}
                      {totals.examples > 0 && (
                        <>
                          {" "}• {formatCount(totals.examples, "examples")}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-primary rounded-full bg-primary/10">
                      Tailwind ready
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-muted-foreground rounded-full border border-border/50 bg-background/60">
                      {group.items.length} patterns
                    </span>
                  </div>
                </div>

                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => {
                    const unit: CatalogUnit = item.unit ?? "components";
                    return (
                      <li
                        key={item.name}
                        className="group relative flex flex-col gap-4 p-6 rounded-2xl border border-border/50 bg-background/80 shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-primary/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-lg font-semibold text-foreground">
                            {item.name}
                          </h3>
                          <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-primary rounded-full bg-primary/10">
                            {formatCount(item.count, unit)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          Crafted with utility-first Tailwind classes for rapid
                          interface assembly.
                        </p>
                        <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="h-2 w-2 rounded-full bg-primary/70"
                              aria-hidden="true"
                            />
                            Ready for production
                          </span>
                          <span className="inline-flex items-center gap-1 text-primary opacity-0 transition-opacity duration-200 ease-smooth group-hover:opacity-100">
                            Explore components
                            <svg
                              aria-hidden="true"
                              className="h-4 w-4"
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
      </section>
    </main>
  );
}
