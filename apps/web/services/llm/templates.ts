import { promptTemplateSchema } from "./schema";
import { type PromptTemplate } from "./types";

const templateCatalog = [
  {
    id: "balanced-analysis",
    label: "Balanced Market Analysis",
    description:
      "Summarize market movements with balanced qualitative and quantitative insights suitable for most providers.",
    providerSuitability: ["openai", "anthropic"],
    prompt:
      "You are a multi-asset research assistant. Provide a balanced analysis that covers macro trends, sector rotations, and actionable insights for portfolio adjustments. Highlight confidence levels and cite notable data points.",
  },
  {
    id: "risk-audit",
    label: "Risk Mitigation Audit",
    description:
      "Stress-test a proposed strategy with an emphasis on risk signals, liquidity considerations, and mitigation ideas.",
    providerSuitability: ["anthropic", "groq"],
    prompt:
      "You are a risk officer evaluating a trading plan. Identify hidden assumptions, downside scenarios, liquidity constraints, and regulatory considerations. Recommend mitigation tactics and signal gaps in available data.",
  },
  {
    id: "quant-drilldown",
    label: "Quantitative Drilldown",
    description:
      "Deliver a data-heavy exploration with calculations, metrics, and structured outputs optimized for deterministic models.",
    providerSuitability: ["openai", "groq"],
    prompt:
      "You are a quantitative analyst. Respond with structured sections including: 1) Problem framing, 2) Key variables and formulas, 3) Scenario table with base/bear/bull projections, and 4) Follow-up experiments with required datasets.",
  },
] satisfies PromptTemplate[];

const validatedTemplates: PromptTemplate[] = templateCatalog.map((template) => {
  const parsed = promptTemplateSchema.parse(template);
  return {
    id: parsed.id,
    label: parsed.label,
    description: parsed.description,
    providerSuitability: parsed.providerSuitability,
    prompt: parsed.prompt,
  };
});

export function listPromptTemplates(): PromptTemplate[] {
  return validatedTemplates.map((template) => ({ ...template }));
}

export function getPromptTemplateById(id: string): PromptTemplate | undefined {
  return validatedTemplates.find((template) => template.id === id);
}
