export interface MetricHighlight {
  icon: string;
  value: string;
  label: string;
  description: string;
}

export interface PlanPreset {
  id: string;
  name: string;
  price: string;
  icon: string;
  summary: string;
  badge?: string;
  turnaround: string;
  focus: string;
  benefits: string[];
}

export interface WorkflowStep {
  id: string;
  icon: string;
  title: string;
  short: string;
  description: string;
  highlights: string[];
  tip: string;
}
