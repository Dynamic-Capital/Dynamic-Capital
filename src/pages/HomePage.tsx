import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-16">
          <section className="text-center">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              Dynamic Capital Concierge
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
              Fast funding, smarter operations, and an AI partner that never
              sleeps.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Launch deposits in minutes, sync payment status across desks, and
              get on-demand insights from our concierge chatbot whenever you
              need strategic or operational support.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/checkout"
                className="inline-flex items-center rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg"
              >
                Launch Checkout
              </Link>
              <Link
                to="/chat"
                className="inline-flex items-center rounded-full border border-primary/30 px-8 py-3 text-base font-semibold text-primary transition-colors duration-200 ease-out hover:border-primary hover:bg-primary/10"
              >
                Talk to the AI Concierge
              </Link>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            <article className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Instant Verification</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect bank or crypto wallets, run AML checks, and approve
                deposits from a single pane of glass.
              </p>
            </article>
            <article className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Guided Operations</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Automate customer follow-ups, surface risk alerts, and keep your
                operations team aligned with AI-powered playbooks.
              </p>
            </article>
            <article className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Always-On Support</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ask the concierge anything—product walkthroughs, compliance
                checklists, or account status—and receive contextual answers in
                seconds.
              </p>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
