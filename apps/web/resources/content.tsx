import { About, Blog, Gallery, Home, Newsletter, Person, Social, Work } from "@/resources/types";
import { Line, Row, Text } from "@once-ui-system/core";

import { supabaseAsset } from "./assets";
import { ogDefaults } from "./og-defaults";

const person: Person = {
  firstName: "Noah",
  lastName: "Sterling",
  name: "Noah Sterling",
  role: "Chief Investment Officer",
  avatar: supabaseAsset("images/avatar.jpg"),
  email: "noah@dynamic.capital",
  location: "Europe/London",
  languages: ["English"],
};

const newsletter: Newsletter = {
  display: true,
  title: <>Signal Room Dispatch</>,
  description: <>Weekly desk notes covering macro catalysts, automation tweaks, and mentorship recaps.</>,
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
  headline: <>Trade with institutional precision, without building the desk yourself.</>,
  featured: {
    display: true,
    title: (
      <Row gap="12" vertical="center">
        <Text onBackground="brand-strong" className="ml-4 font-semibold tracking-tight">
          VIP packages now available on-site
        </Text>
        <Line background="brand-alpha-strong" vert height="20" />
        <Text marginRight="4" onBackground="brand-medium">
          Checkout without leaving dynamic.capital
        </Text>
      </Row>
    ),
    href: "/plans",
  },
  subline: (
    <>
      Dynamic Capital combines quantitative research, human mentorship, and automation to guide every position. Explore VIP
      membership packages, mentorship programs, and managed pools directly from the site.
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
        Noah leads Dynamic Capital's institutional desk, pairing fundamental research with automation so traders can scale
        responsibly. After a decade building quant workflows for prop firms, he now mentors founders, funds, and operators
        looking to professionalise their execution.
      </>
    ),
  },
  work: {
    display: true,
    title: "Desk leadership",
    experiences: [
      {
        company: "Dynamic Capital",
        timeframe: "2021 – Present",
        role: "Chief Investment Officer",
        achievements: [
          <>Built the VIP signal desk that now serves 8,500 members with 24/7 macro and crypto coverage.</>,
          <>Scaled managed pools to $42M AUM with automated drawdown controls and transparent allocation reporting.</>,
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
      {
        company: "Helios Partners",
        timeframe: "2016 – 2021",
        role: "Director of Quantitative Strategy",
        achievements: [
          <>Deployed cross-exchange market making infrastructure overseeing $1.2B in monthly volume.</>,
          <>Launched mentorship cohorts for portfolio founders to harden risk frameworks and trade review rituals.</>,
        ],
        images: [
          {
            src: supabaseAsset("images/projects/alpha-lab/cover-01.jpg"),
            alt: "Helios execution terminals",
            width: 16,
            height: 9,
          },
        ],
      },
    ],
  },
  studies: {
    display: true,
    title: "Studies",
    institutions: [
      {
        name: "London School of Economics",
        description: <>MSc in Financial Mathematics focused on systematic macro strategies.</>,
      },
      {
        name: "CMT Association",
        description: <>Chartered Market Technician — applied discretionary pattern work to automation.</>,
      },
    ],
  },
  technical: {
    display: true,
    title: "Capabilities",
    skills: [
      {
        title: "Execution stack engineering",
        description: <>Architecting exchange connectivity, risk throttles, and automation for multi-venue trading.</>,
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
        description: <>Structuring playbooks that blend discretionary reads with quantitative confirmation.</>,
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
        description: <>Designing accountability cadences and review rituals for scaling traders and funds.</>,
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
  description: "Trading psychology, macro structure, and automation updates from the Dynamic Capital desk.",
};

const work: Work = {
  path: "/work",
  label: "Work",
  title: "Desk projects",
  description: "Signal, automation, and mentorship programs launched by Dynamic Capital.",
};

const gallery: Gallery = {
  path: "/gallery",
  label: "Gallery",
  title: "Inside the desk",
  description: "Scenes from Dynamic Capital's research, execution, and mentorship sessions.",
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

export { person, social, newsletter, home, about, blog, work, gallery };
