export type ImpactLevel = "High" | "Medium" | "Low";

export interface EconomicEvent {
  id: string;
  day: string;
  time: string;
  title: string;
  impact: ImpactLevel;
  marketFocus: string[];
  commentary: string;
  deskPlan: string[];
}
