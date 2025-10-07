"use client";

import { motion } from "framer-motion";

import {
  Button,
  Column,
  Heading,
  Row,
  Schema,
  Text,
} from "@/components/dynamic-ui-system";
import { baseURL, person } from "@/resources";

import { CTA_LINKS, LANDING_SECTION_IDS } from "./landing-config";

const SCHEMA_TITLE = "Dynamic Capital — Unified Desk";
const SCHEMA_DESCRIPTION =
  "All of Dynamic Capital now lives on a single adaptive page with real-time highlights.";

const HERO_CONTENT = {
  eyebrow: "Single page desk",
  title: "Everything you need, choreographed on one canvas",
  description:
    "A focused trading desk that pairs live momentum, portfolio vitals, and treasury calls in a single immersive animation.",
};

const FEATURE_CARDS = [
  {
    title: "Live market motion",
    description:
      "Track macro, crypto, and FX desks in one sweep with animated signals that highlight the strongest trend shifts.",
  },
  {
    title: "Treasury at a glance",
    description:
      "View current exposure, cash on hand, and the latest burns without hopping between dashboards.",
  },
  {
    title: "Contributor updates",
    description:
      "Surface roadmap wins, community votes, and policy changes directly beside the market story.",
  },
] as const;

const TIMELINE_STOPS = [
  {
    label: "Signal sync",
    detail:
      "Auto-refreshing indicators pulse every minute so the hero animation mirrors the live trading rhythm.",
  },
  {
    label: "Treasury digest",
    detail:
      "Balance movements, burns, and rewards slide into view with soft transitions to keep context intact.",
  },
  {
    label: "Community echo",
    detail:
      "Telegram highlights and announcements cascade at the tail of the animation to close the loop for contributors.",
  },
] as const;

const STATS = [
  { label: "Markets tracked", value: "30k+" },
  { label: "Latency", value: "<1s refresh" },
  { label: "Contributors", value: "180+" },
] as const;

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerChild = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function MultiLlmLandingPage() {
  return (
    <Column
      as="main"
      fillWidth
      gap="48"
      horizontal="center"
      align="center"
      className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8"
    >
      <Schema
        as="webPage"
        baseURL={baseURL}
        path="/"
        title={SCHEMA_TITLE}
        description={SCHEMA_DESCRIPTION}
        image={`/api/og/generate?title=${encodeURIComponent(SCHEMA_TITLE)}`}
        author={{
          name: person.name,
          url: `${baseURL}/about`,
          image: person.avatar,
        }}
      />

      <motion.section
        id={LANDING_SECTION_IDS.hero}
        aria-labelledby="landing-hero-heading"
        initial={fadeIn.initial}
        animate={fadeIn.animate}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex w-full flex-col items-center gap-6 text-center"
      >
        <motion.span
          className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium uppercase tracking-[0.32em] text-white/90"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {HERO_CONTENT.eyebrow}
        </motion.span>
        <Heading
          id="landing-hero-heading"
          variant="heading-strong-l"
          className="max-w-3xl text-balance text-4xl sm:text-5xl"
        >
          {HERO_CONTENT.title}
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-weak"
          className="max-w-2xl text-pretty"
        >
          {HERO_CONTENT.description}
        </Text>
        <Row gap="12" wrap horizontal="center" className="gap-4">
          <Button
            size="m"
            href={CTA_LINKS.telegram}
            target="_blank"
            rel="noreferrer"
            variant="primary"
            data-border="rounded"
            arrowIcon
          >
            Join Telegram
          </Button>
          <Button
            size="m"
            href={CTA_LINKS.invest}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
            data-border="rounded"
          >
            Launch desk
          </Button>
        </Row>
        <motion.div
          className="relative mt-12 w-full overflow-hidden rounded-3xl bg-gradient-to-r from-brand/80 via-sky-500/70 to-indigo-600/80 p-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="relative flex min-h-[260px] w-full items-center justify-center overflow-hidden rounded-[1.4rem] bg-slate-950 p-6">
            <motion.div
              className="absolute -left-24 h-72 w-72 rounded-full bg-brand/60 blur-3xl"
              animate={{
                x: [0, 120, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -right-16 top-10 h-64 w-64 rounded-full bg-sky-500/60 blur-3xl"
              animate={{
                y: [0, -80, 0],
                opacity: [0.25, 0.5, 0.25],
              }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="relative z-10 grid w-full max-w-3xl gap-4 text-left text-slate-100"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Heading variant="heading-strong-s">
                The desk breathes with your strategy
              </Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Watch liquidity pulses, risk envelopes, and contributor updates
                merge into a single cinematic animation. No extra tabs. No
                scattered context.
              </Text>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        id={LANDING_SECTION_IDS.highlights}
        aria-labelledby="landing-highlights-heading"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.12 }}
        className="grid w-full grid-cols-1 gap-6 md:grid-cols-3"
      >
        <span id="landing-highlights-heading" className="sr-only">
          Highlights
        </span>
        {FEATURE_CARDS.map((feature) => (
          <motion.article
            key={feature.title}
            variants={staggerChild}
            className="flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur"
          >
            <Heading variant="heading-strong-xs" className="text-xl">
              {feature.title}
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {feature.description}
            </Text>
          </motion.article>
        ))}
      </motion.section>

      <motion.section
        id={LANDING_SECTION_IDS.rhythm}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.16 }}
        className="flex w-full flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 text-left backdrop-blur"
      >
        <motion.div
          variants={staggerChild}
          className="grid gap-3 sm:grid-cols-[minmax(0,0.6fr),1fr] sm:items-start"
        >
          <Heading
            id="landing-rhythm-heading"
            variant="heading-strong-m"
            className="text-3xl"
          >
            A morning-to-evening rhythm
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Each stage of the animation mirrors how the desk actually flows, so
            you always know what just happened and what is next.
          </Text>
        </motion.div>
        <motion.ol
          variants={staggerChild}
          className="grid gap-6 sm:grid-cols-3"
        >
          {TIMELINE_STOPS.map((stop, index) => (
            <li key={stop.label} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 font-semibold text-brand">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <Heading variant="heading-strong-xs" className="text-xl">
                  {stop.label}
                </Heading>
              </div>
              <Text variant="body-default-m" onBackground="neutral-weak">
                {stop.detail}
              </Text>
            </li>
          ))}
        </motion.ol>
      </motion.section>

      <motion.section
        id={LANDING_SECTION_IDS.stakeholders}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.14 }}
        className="flex w-full flex-col items-center gap-8 text-center"
      >
        <motion.div
          variants={staggerChild}
          className="grid w-full max-w-3xl gap-4"
        >
          <Heading
            id="landing-stakeholders-heading"
            variant="heading-strong-m"
            className="text-3xl sm:text-4xl"
          >
            Built for investors, analysts, and community guardians alike
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            One animation stitches together strategy, treasury, and governance
            so every stakeholder shares the same frame of reference.
          </Text>
        </motion.div>
        <motion.ul
          variants={staggerChild}
          className="grid w-full gap-4 sm:grid-cols-3"
        >
          {STATS.map((stat) => (
            <li
              key={stat.label}
              className="flex flex-col items-center gap-2 rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-center backdrop-blur"
            >
              <Heading variant="heading-strong-m" className="text-3xl">
                {stat.value}
              </Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {stat.label}
              </Text>
            </li>
          ))}
        </motion.ul>
      </motion.section>

      <motion.section
        id={LANDING_SECTION_IDS.join}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.12 }}
        className="flex w-full flex-col items-center gap-6 text-center"
        aria-labelledby="landing-join-heading"
      >
        <motion.div
          variants={staggerChild}
          className="grid w-full max-w-2xl gap-3"
        >
          <Heading
            id="landing-join-heading"
            variant="heading-strong-m"
            className="text-3xl"
          >
            Join the desk cadence
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Launch the live desk to feel the flow or drop into Telegram to
            follow treasury moves as they happen.
          </Text>
        </motion.div>
        <Row gap="12" wrap horizontal="center" className="gap-4">
          <Button
            size="m"
            href={CTA_LINKS.invest}
            target="_blank"
            rel="noreferrer"
            variant="primary"
            data-border="rounded"
            arrowIcon
          >
            Launch the experience
          </Button>
          <Button
            size="m"
            href={CTA_LINKS.telegram}
            target="_blank"
            rel="noreferrer"
            variant="tertiary"
            data-border="rounded"
          >
            Join the conversation
          </Button>
        </Row>
      </motion.section>
    </Column>
  );
}

export default MultiLlmLandingPage;
