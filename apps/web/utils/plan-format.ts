import type { Plan } from "@/types/plan";

function formatYearLabel(years: number): string {
  const roundedYears = Number.isFinite(years) ? years : 0;
  return `${roundedYears} year${roundedYears === 1 ? "" : "s"}`;
}

export function formatPlanDuration(plan: Plan): string {
  if (plan.is_lifetime) {
    return "Lifetime access";
  }

  const months = plan.duration_months;

  if (!Number.isFinite(months) || months <= 1) {
    return "Monthly";
  }

  if (months === 3) {
    return "Quarterly";
  }

  if (months === 6) {
    return "Semi-annual";
  }

  if (months === 12) {
    return "Annual";
  }

  if (months % 12 === 0) {
    const years = months / 12;
    return formatYearLabel(years);
  }

  return `${months} months`;
}

export function describePlanFrequency(plan: Plan): string {
  if (plan.is_lifetime) {
    return "one-time";
  }

  const months = plan.duration_months;

  if (!Number.isFinite(months) || months <= 1) {
    return "per month";
  }

  if (months === 3) {
    return "every quarter";
  }

  if (months === 6) {
    return "every 6 months";
  }

  if (months === 12) {
    return "per year";
  }

  if (months % 12 === 0) {
    const years = months / 12;
    return `every ${formatYearLabel(years)}`;
  }

  return `every ${months} months`;
}

export function getMonthlyEquivalent(plan: Plan): number | null {
  if (plan.is_lifetime) {
    return null;
  }

  const months = plan.duration_months;

  if (!Number.isFinite(months) || months <= 1) {
    return null;
  }

  const value = plan.price / months;
  return Number.isFinite(value) ? value : null;
}
