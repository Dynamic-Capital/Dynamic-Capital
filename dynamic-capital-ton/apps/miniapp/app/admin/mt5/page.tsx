import Link from "next/link";

const MT5_TERMINAL_URL = "https://webtrading.exness.com/mt5";

export default function AdminMt5Page() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950/95 px-4 pb-10 pt-10 text-slate-100">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-3xl border border-slate-800/80 bg-slate-900/80 px-6 py-6 shadow-[0_24px_60px_rgba(5,7,15,0.65)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Dynamic Capital Desk
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-50">
              Exness MT5 Trading Terminal
            </h1>
            <p className="text-sm text-slate-300">
              Use the embedded Exness MT5 terminal below to execute trades without
              leaving the mini app shell. Platform styling is managed by
              Exness.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            ← Return to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto mt-6 flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/70 shadow-[0_32px_80px_rgba(4,6,12,0.72)]">
        <iframe
          src={MT5_TERMINAL_URL}
          title="Exness MT5 Web Terminal"
          className="h-[82vh] min-h-[600px] w-full flex-1"
          style={{ border: "none" }}
          allow="clipboard-read; clipboard-write;"
        />
      </div>

      <p className="mx-auto mt-4 max-w-5xl text-xs text-slate-500">
        The MT5 interface is hosted by Exness and cannot be restyled directly.
        This wrapper keeps it consistent with the Dynamic Capital admin
        experience.
      </p>
    </div>
  );
}
