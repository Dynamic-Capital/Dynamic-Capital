import { Sparkles, Activity, Database, GitBranch } from "lucide-react";

export const navItems = [
  {
    title: "AGI Chat",
    to: "/agi-chat",
    icon: <Sparkles className="h-4 w-4" />,
    page: null,
  },
  {
    title: "Analytics",
    to: "/analytics",
    icon: <Activity className="h-4 w-4" />,
    page: null,
  },
  {
    title: "Memory",
    to: "/memory",
    icon: <Database className="h-4 w-4" />,
    page: null,
  },
  {
    title: "Procedures",
    to: "/procedures",
    icon: <GitBranch className="h-4 w-4" />,
    page: null,
  },
];
