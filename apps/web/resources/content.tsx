import {
  About,
  Blog,
  Gallery,
  Home,
  Newsletter,
  Person,
  Social,
  Work,
} from "@/resources/types";
import { Line, Row, Text } from "@/components/dynamic-ui-system";

import { supabaseAsset } from "./assets";
import { ogDefaults } from "./og-defaults";

const person: Person = {
  firstName: "Abdul Mumin",
  lastName: "Ibun Aflhal",
  name: "Abdul Mumin Ibun Aflhal",
  role: "Founder",
  avatar: supabaseAsset("images/avatar.jpg"),
  email: "hello@dynamic.capital",
  location: "Africa/Accra",
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
    name: "Telegram",
    icon: "telegram",
    link: "https://t.me/Dynamic_VIP_BOT",
  },
  {
    name: "LinkedIn",
    icon: "linkedin",
    link: "https://www.linkedin.com/company/dynamic-capital-ai/",
  },
  {
    name: "X",
    icon: "x",
    link: "https://x.com/dynamiccapitalhq",
  },
  {
    name: "Email",
    icon: "email",
    link: `mailto:${person.email}`,
  },
];

const home: Home = {
  path: "/",
  image: supabaseAsset("images/og/home.jpg"),
  label: "Home",
  title: ogDefaults.title,
  description: ogDefaults.description,
  headline: <>Run a professional trading desk without hiring a team.</>,
  featured: {
    display: true,
    title: (
      <Row gap="12" vertical="center">
        <Text
          onBackground="brand-strong"
          className="ml-4 font-semibold tracking-tight"
        >
          Launch update: Adaptive desk automations
        </Text>
        <Line background="brand-alpha-strong" vert height="20" />
        <Text marginRight="4" onBackground="brand-medium">
          Spin up a done-for-you routine in minutes
        </Text>
      </Row>
    ),
    href: "/plans",
  },
  subline: (
    <>
      Personalized onboarding, live mentor cues, and automation guardrails align
      every session around a documented edge.
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
