"use client";

import type { SectionId } from "../lib/sections";

type NavItem = {
  id: SectionId;
  label: string;
  icon: (props: { active: boolean }) => JSX.Element;
};

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M12 2.5 13.6 8h5.4l-4.3 3.2L16.3 17 12 13.9 7.7 17l1.3-5.8L4.7 8h5.4z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RadarIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={active ? 1 : 0.8}
      />
      <path
        d="M12 4v4m0 4 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.2"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M4 13.5 8 9l3.5 5L14 6l2.5 8.5L20 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.8}
      />
    </svg>
  );
}

function PaletteIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <path
        d="M12 3a9 9 0 1 0 0 18c1.6 0 2.6-.92 2.6-2.06 0-1.27-.96-2-2.14-2.3-.94-.25-1.43-.86-1.43-1.62 0-.92.74-1.7 1.7-1.7h1.75c1.43 0 2.52-1.09 2.52-2.52A7 7 0 0 0 12 3Zm-4.4 8a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm2.7-3.9a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm5.4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm1.6 3.9a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LifebuoyIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 flex-shrink-0 transition-colors duration-150 ${
        active ? "text-sky-100" : "text-slate-400"
      }`}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={active ? 1 : 0.8}
      />
      <circle
        cx="12"
        cy="12"
        r="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.7 5.7 8.4 8.4M18.3 5.7l-2.7 2.7m2.7 11.6-2.7-2.7M5.7 18.3l2.7-2.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "plans", label: "Plans", icon: SparkIcon },
  { id: "intel", label: "Live intel", icon: RadarIcon },
  { id: "activity", label: "Timeline", icon: ActivityIcon },
  { id: "appearance", label: "Themes", icon: PaletteIcon },
  { id: "support", label: "Support", icon: LifebuoyIcon },
];

type StickyNavProps = {
  activeSection: SectionId;
  onNavigate: (section: SectionId) => void;
  items?: NavItem[];
};

export function StickyNav({
  activeSection,
  onNavigate,
  items = NAV_ITEMS,
}: StickyNavProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="fixed bottom-8 left-1/2 z-50 flex w-full max-w-xl -translate-x-1/2 justify-center px-4"
    >
      <div className="flex w-full items-center justify-center rounded-full border border-slate-500/50 bg-slate-900/80 px-4 py-3 text-[0.78rem] font-medium text-slate-300 shadow-[0_18px_46px_rgba(7,12,24,0.45)] backdrop-blur">
        <ol className="flex w-full items-center gap-1">
          {items.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <li
                key={id}
                className="flex min-w-0 flex-1 items-center after:mx-1 after:text-slate-600/70 after:content-['/'] last:after:hidden"
              >
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex w-full items-center gap-2 rounded-full px-3 py-2 transition-colors duration-150 ${
                    isActive
                      ? "bg-sky-500/20 text-sky-100"
                      : "text-slate-300/70 hover:bg-white/5 hover:text-sky-100"
                  }`}
                >
                  <Icon active={isActive} />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
