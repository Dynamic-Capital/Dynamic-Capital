import React, { ReactNode } from "react";
export interface KbarItem {
  id: string;
  name: string;
  section: string;
  shortcut: string[];
  keywords: string;
  href?: string;
  perform?: () => void;
  icon?: string;
  description?: ReactNode;
  placeholder?: string;
}
interface KbarTriggerProps {
  onClick?: () => void;
  children: React.ReactNode;
  [key: string]: any;
}
export declare const KbarTrigger: React.FC<KbarTriggerProps>;
interface KbarContentProps {
  isOpen: boolean;
  onClose: () => void;
  items: KbarItem[];
  placeholder?: string;
}
export declare const KbarContent: React.FC<KbarContentProps>;
export interface KbarProps {
  items: KbarItem[];
  children: React.ReactNode;
  [key: string]: any;
}
export declare const Kbar: React.FC<KbarProps>;
export {};
//# sourceMappingURL=Kbar.d.ts.map
