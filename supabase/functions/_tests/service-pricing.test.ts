import { assertEquals, assertStrictEquals } from "std/assert/mod.ts";

import {
  buildPricingBlueprint,
  describePackages,
  generateMentorshipPackages,
  generatePromoIncentives,
  generateVipPackages,
} from "../_shared/service-pricing.ts";

Deno.test("generateVipPackages applies deterministic pricing", () => {
  const packages = generateVipPackages({
    basePrice: 1200,
    tiers: 3,
    demandIndex: 0.6,
    loyaltyScore: 0.4,
    churnRisk: 0.2,
    seed: 42,
  });

  assertEquals(packages.map((pkg) => pkg.name), [
    "Insider",
    "Elite",
    "Premier",
  ]);
  assertEquals(packages.map((pkg) => pkg.price), [
    1404.29,
    1961.49,
    2518.42,
  ]);
  assertEquals(packages.map((pkg) => pkg.discountPct), [
    0.076,
    0.096,
    0.116,
  ]);
  assertStrictEquals(
    new Set(packages.map((pkg) => pkg.promoCode)).size,
    packages.length,
  );
  assertEquals(typeof describePackages(packages), "string");
});

Deno.test("generateMentorshipPackages scales sessions and pricing", () => {
  const packages = generateMentorshipPackages({
    baseSessionRate: 180,
    programWeeks: 4,
    sessionsPerWeek: 2,
    mentorExperience: 0.65,
    menteeIntensity: 0.55,
    loyaltyScore: 0.25,
    tiers: 3,
    seed: 21,
  });

  assertEquals(packages.map((pkg) => pkg.name), [
    "Focus Sprint",
    "Growth Pod",
    "Transformation Studio",
  ]);
  assertEquals(packages.map((pkg) => pkg.sessions), [8, 11, 14]);
  assertEquals(packages.map((pkg) => pkg.price), [1980.61, 3162.09, 4562.92]);
  assertStrictEquals(
    new Set(packages.map((pkg) => pkg.promoCode)).size,
    packages.length,
  );
});

Deno.test("generatePromoIncentives balances urgency and loyalty", () => {
  const offers = generatePromoIncentives({
    basePrice: 1200,
    urgencyIndex: 0.7,
    loyaltyScore: 0.4,
    inventoryPressure: 0.3,
    count: 3,
    seed: 5,
  });

  assertEquals(offers.map((offer) => offer.name), [
    "Launch Surge",
    "Loyalty Boost",
    "Win-back Revival",
  ]);
  assertEquals(offers.map((offer) => offer.price), [1071.6, 1068, 1064.4]);
  assertStrictEquals(
    new Set(offers.map((offer) => offer.promoCode)).size,
    offers.length,
  );
});

Deno.test("buildPricingBlueprint composes service catalog", () => {
  const blueprint = buildPricingBlueprint({
    vip: {
      basePrice: 1300,
      tiers: 2,
      demandIndex: 0.5,
      loyaltyScore: 0.3,
      churnRisk: 0.2,
    },
    mentorship: {
      baseSessionRate: 200,
      programWeeks: 3,
      sessionsPerWeek: 2,
      mentorExperience: 0.6,
      menteeIntensity: 0.5,
      loyaltyScore: 0.2,
      tiers: 2,
    },
    promo: {
      basePrice: 1300,
      urgencyIndex: 0.4,
      loyaltyScore: 0.35,
      inventoryPressure: 0.2,
      count: 2,
    },
    seed: 99,
  });

  assertEquals(blueprint.vipPackages.length, 2);
  assertEquals(blueprint.mentorshipPackages.length, 2);
  assertEquals(blueprint.promoOffers.length, 2);
  assertEquals(typeof blueprint.analytics.vipAveragePrice, "number");
  assertEquals(typeof blueprint.summary.vip, "string");
});
