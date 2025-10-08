import {
  About,
  Blog,
  Gallery,
  Home,
  IANATimeZone,
  Newsletter,
  Person,
  Social,
  Work,
} from "./types";
import { Line, Row, Text } from "../components/dynamic-ui-system";
import tzdata from "tzdata";

import deskTimeZone from "../../../shared/time/desk-time-zone.json";
import { supabaseAsset } from "./assets";
import { ogDefaults } from "./og-defaults";
import { resolveTonSiteUrl } from "../../../shared/ton/site";

function isIANATimeZone(value: string): value is IANATimeZone {
  return Object.prototype.hasOwnProperty.call(zones, value);
}

function resolveServerTimeZone():
  | { timeZone: IANATimeZone; label: string }
  | undefined {
  try {
    const formatter = new Intl.DateTimeFormat();
    const options = formatter.resolvedOptions?.();
    const maybeZone = options?.timeZone;

    if (typeof maybeZone === "string" && isIANATimeZone(maybeZone)) {
      return {
        timeZone: maybeZone,
        label: maybeZone === "UTC"
          ? "Coordinated Universal Time"
          : `Server (${maybeZone})`,
      };
    }
  } catch (_error) {
    // Ignore runtime detection errors and fall back to UTC.
  }

  return undefined;
}

const { zones } = tzdata;

type DeskTimeZoneConfig = {
  iana?: unknown;
  label?: unknown;
};

const deskTimeZoneConfig = deskTimeZone as DeskTimeZoneConfig;

function coerceString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const serverTimeZone = resolveServerTimeZone();

const fallbackDeskTimeZone: IANATimeZone =
  (serverTimeZone?.timeZone ?? "UTC") as IANATimeZone;
const rawDeskTimeZone = coerceString(deskTimeZoneConfig?.iana);
const DESK_TIME_ZONE =
  (rawDeskTimeZone ?? fallbackDeskTimeZone) as IANATimeZone;

const DESK_TIME_ZONE_LABEL = coerceString(deskTimeZoneConfig?.label) ??
  serverTimeZone?.label ??
  "Server local time";

const person: Person = {
  firstName: "Abdul Mumin",
  lastName: "Ibun Aflhal",
  name: "Abdul Mumin Ibun Aflhal",
  role: "Founder",
  avatar: supabaseAsset("images/avatar.jpg"),
  email: "hello@dynamiccapital.ton",
  location: DESK_TIME_ZONE,
  locationLabel: DESK_TIME_ZONE_LABEL,
};

const newsletter: Newsletter = {
  display: true,
  title: <>Signal Room Dispatch</>,
  description: (
    <>
      Weekly desk notes covering macro catalysts, automation tweaks, and
      mentorship recaps.
    </>
  ),
};

const social: Social = [
  {
    name: "Website",
    icon: "globe",
    link: resolveTonSiteUrl(),
  },
  {
    name: "Telegram",
    icon: "telegram",
    link: "https://t.me/DynamicCapital_Support",
  },
  {
    name: "Instagram",
    icon: "instagram",
    link: "https://www.instagram.com/dynamic.capital",
  },
  {
    name: "Facebook",
    icon: "facebook",
    link: "https://www.facebook.com/dynamic.capital.fb",
  },
  {
    name: "TradingView",
    icon: "tradingview",
    link: "https://www.tradingview.com/u/DynamicCapital-FX/",
  },
  {
    name: "Email",
    icon: "email",
    link: `mailto:${person.email}`,
  },
  {
    name: "Phone",
    icon: "phone",
    link: "tel:+9609990615",
  },
  {
    name: "Location",
    icon: "location",
    link: "https://maps.google.com/?q=Mal%C3%A9,+Maldives",
  },
];

const home: Home = {
  path: "/",
  image: supabaseAsset("images/og/home.jpg"),
  label: "Home",
  title: ogDefaults.title,
  description: ogDefaults.description,
  headline: <>Orchestrate every LLM provider from one workspace.</>,
  featured: {
    display: true,
    title: (
      <Row gap="12" vertical="center">
        <Text
          onBackground="brand-strong"
          className="ml-4 font-semibold tracking-tight"
        >
          Launch update: Dynamic GUI optimizer
        </Text>
        <Line background="brand-alpha-strong" vert height="20" />
        <Text marginRight="4" onBackground="brand-medium">
          Diagnose readiness velocity and activation channels in real time
        </Text>
      </Row>
    ),
    href: "/tools/dynamic-ui-optimizer",
  },
  subline: (
    <>
      Benchmark responses, enforce routing policies, and stream observability
      metrics without juggling vendor dashboards or custom glue code.
    </>
  ),
};

const about: About = {
  path: "/about",
  label: "About",
  title: "About – Dynamic Capital",
  description: `Meet ${person.name}, ${person.role} at Dynamic Capital`,
  tableOfContent: {
    display: true,
    subItems: true,
  },
  avatar: {
    display: true,
  },
  calendar: {
    display: false,
    link: "",
  },
  intro: {
    display: true,
    title: "Why we exist",
    description: (
      <>
        Abdul Mumin Ibun Aflhal leads Dynamic Capital's trading desk, keeping
        member strategies grounded in documented research and disciplined risk
        controls. He focuses on helping operators adopt automation responsibly
        so every signal has an auditable process behind it.
      </>
    ),
  },
  work: {
    display: true,
    title: "Desk leadership",
    experiences: [
      {
        company: "Dynamic Capital",
        timeframe: "Present",
        role: "Founder & Portfolio Lead",
        achievements: [
          <>
            Chairs the investment committee that reviews every trading playbook
            before it reaches the desk.
          </>,
          <>
            Built the automation stack that keeps allocations, risk parameters,
            and reporting aligned for members.
          </>,
        ],
        images: [
          {
            src: supabaseAsset("images/projects/liquidity-desk/cover-01.jpg"),
            alt: "Dynamic Capital desks",
            width: 16,
            height: 9,
          },
        ],
      },
    ],
  },
  studies: {
    display: false,
    title: "Studies",
    institutions: [],
  },
  technical: {
    display: true,
    title: "Capabilities",
    skills: [
      {
        title: "Execution stack engineering",
        description: (
          <>
            Architecting exchange connectivity, risk throttles, and automation
            for multi-venue trading.
          </>
        ),
        tags: [
          { name: "Python" },
          { name: "Supabase", icon: "supabase" },
        ],
        images: [
          {
            src: supabaseAsset("images/projects/liquidity-desk/cover-02.jpg"),
            alt: "Automated execution dashboards",
            width: 16,
            height: 9,
          },
        ],
      },
      {
        title: "Macro research",
        description: (
          <>
            Structuring playbooks that blend discretionary reads with
            quantitative confirmation.
          </>
        ),
        tags: [
          { name: "Quant" },
          { name: "FX" },
          { name: "Commodities" },
        ],
        images: [
          {
            src: supabaseAsset("images/projects/alpha-lab/cover-02.jpg"),
            alt: "Macro research workspace",
            width: 16,
            height: 9,
          },
        ],
      },
      {
        title: "Mentorship frameworks",
        description: (
          <>
            Designing accountability cadences and review rituals for scaling
            traders and funds.
          </>
        ),
        tags: [
          { name: "Coaching" },
          { name: "Risk" },
        ],
        images: [
          {
            src: supabaseAsset("images/projects/mentor-suite/cover-01.jpg"),
            alt: "Mentorship session",
            width: 16,
            height: 9,
          },
        ],
      },
    ],
  },
};

const blog: Blog = {
  path: "/blog",
  label: "Blog",
  title: "Desk insights & execution playbooks",
  description:
    "Trading psychology, macro structure, and automation updates from the Dynamic Capital desk.",
};

const work: Work = {
  path: "/work",
  label: "Work",
  title: "Desk projects",
  description:
    "Signal, automation, and mentorship programs launched by Dynamic Capital.",
};

const gallery: Gallery = {
  path: "/gallery",
  label: "Gallery",
  title: "Inside the desk",
  description:
    "Scenes from Dynamic Capital's research, execution, and mentorship sessions.",
  images: [
    {
      src: supabaseAsset("images/gallery/horizontal-1.jpg"),
      alt: "Night view of the trading floor monitors",
      orientation: "horizontal",
    },
    {
      src: supabaseAsset("images/gallery/vertical-4.jpg"),
      alt: "Mentor walking through a chart setup",
      orientation: "vertical",
    },
    {
      src: supabaseAsset("images/gallery/horizontal-3.jpg"),
      alt: "Quant desk with liquidity dashboards",
      orientation: "horizontal",
    },
    {
      src: supabaseAsset("images/gallery/vertical-1.jpg"),
      alt: "Strategy review with client cohort",
      orientation: "vertical",
    },
    {
      src: supabaseAsset("images/gallery/vertical-2.jpg"),
      alt: "Macro research boards in the war room",
      orientation: "vertical",
    },
    {
      src: supabaseAsset("images/gallery/horizontal-2.jpg"),
      alt: "Automation lab running test builds",
      orientation: "horizontal",
    },
    {
      src: supabaseAsset("images/gallery/horizontal-4.jpg"),
      alt: "Team stand-up before London open",
      orientation: "horizontal",
    },
    {
      src: supabaseAsset("images/gallery/vertical-3.jpg"),
      alt: "Portfolio review on transparent wall displays",
      orientation: "vertical",
    },
  ],
};

export { about, blog, gallery, home, newsletter, person, social, work };
