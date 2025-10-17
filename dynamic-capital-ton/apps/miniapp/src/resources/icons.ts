import type { IconType } from "react-icons";
import {
  HiOutlineBolt,
  HiOutlineChartBar,
  HiOutlineChatBubbleLeftRight,
  HiOutlineFire,
  HiOutlineGlobeAlt,
  HiOutlineHome,
  HiOutlineSparkles,
  HiOutlineSwatch,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { PiCurrencyCircleDollarLight, PiLightningFill } from "react-icons/pi";

export const iconLibrary: Record<string, IconType> = {
  home: HiOutlineHome,
  plans: HiOutlineSparkles,
  intel: HiOutlineChartBar,
  activity: HiOutlineBolt,
  appearance: HiOutlineSwatch,
  support: HiOutlineChatBubbleLeftRight,
  wallet: PiCurrencyCircleDollarLight,
  rocket: HiOutlineFire,
  globe: HiOutlineGlobeAlt,
  community: HiOutlineUserGroup,
  pulse: PiLightningFill,
};

export type IconLibrary = typeof iconLibrary;
export type IconName = keyof IconLibrary;
