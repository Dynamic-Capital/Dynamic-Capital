import {
  Bot,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Shield,
  TrendingUp,
  Workflow,
} from "lucide-react";

export interface NavItem {
  id: string;
  step: string;
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
  ariaLabel: string;
  href?: string;
  showOnMobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    step: "Step 1",
    label: "Workspace",
    description: "Preview the multi-LLM orchestration hub.",
    icon: Bot,
    path: "/",
    href: "/#overview",
    ariaLabel: "Step 1: Workspace. Preview the multi-LLM orchestration hub.",
    showOnMobile: true,
  },
  {
    id: "providers",
    step: "Step 2",
    label: "Providers",
    description: "Compare coverage and context windows.",
    icon: Layers,
    path: "/",
    href: "/#provider-matrix",
    ariaLabel:
      "Step 2: Providers. Compare coverage and context windows across vendors.",
    showOnMobile: true,
  },
  {
    id: "routing",
    step: "Step 3",
    label: "Routing",
    description: "Blend ensembles, fallbacks, and policies.",
    icon: Workflow,
    path: "/",
    href: "/#orchestration",
    ariaLabel: "Step 3: Routing. Blend ensembles, fallbacks, and policies.",
    showOnMobile: true,
  },
  {
    id: "analytics",
    step: "Step 4",
    label: "Analytics",
    description: "Inspect latency, quality, and spend traces.",
    icon: TrendingUp,
    path: "/",
    href: "/#analytics",
    ariaLabel: "Step 4: Analytics. Inspect latency, quality, and spend traces.",
    showOnMobile: true,
  },
  {
    id: "guardrails",
    step: "Step 5",
    label: "Guardrails",
    description: "Review compliance and escalation workflows.",
    icon: Shield,
    path: "/",
    href: "/#resilience",
    ariaLabel:
      "Step 5: Guardrails. Review compliance and escalation workflows.",
    showOnMobile: true,
  },
  {
    id: "studio",
    step: "Step 6",
    label: "LLM studio",
    description: "Run side-by-side provider benchmarks.",
    icon: LayoutDashboard,
    path: "/tools/multi-llm",
    ariaLabel: "Step 6: LLM studio. Run side-by-side provider benchmarks.",
    showOnMobile: true,
  },
  {
    id: "onboarding",
    step: "Step 7",
    label: "Onboarding",
    description: "Activate concierge setup and pricing.",
    icon: LifeBuoy,
    path: "/plans",
    ariaLabel: "Step 7: Onboarding. Activate concierge setup and pricing.",
    showOnMobile: true,
  },
];

export default NAV_ITEMS;
