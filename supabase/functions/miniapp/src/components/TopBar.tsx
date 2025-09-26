import SecondaryButton from "./SecondaryButton";

interface Props {
  title: string;
  onLogout?: () => void;
}

export default function TopBar({ title, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-20 mb-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-secondary/40 px-4 py-4 shadow-[0_16px_48px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/25 via-emerald-400/20 to-transparent"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25"
          aria-hidden
        />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.65)]" />
              <span>Dynamic Capital</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-foreground">
              {title}
            </h1>
          </div>

          {onLogout && (
            <SecondaryButton
              label="Log out"
              onClick={onLogout}
              className="bg-white/10 hover:bg-white/20"
            />
          )}
        </div>
      </div>
    </header>
  );
}
