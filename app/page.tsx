export default function HomePage() {
  return (
    <div className="min-h-screen bg-background p-10 text-center font-sans">
      <h1 className="mb-4 text-4xl font-bold text-dc-brand">
        Dynamic Capital VIP Bot
      </h1>
      <p className="mb-8 text-lg text-muted-foreground">
        Telegram VIP Bot Management System
      </p>
      <div className="mx-auto max-w-xl rounded-xl bg-card p-8 shadow-elegant">
        <h2 className="mb-4 text-2xl text-foreground">
          Welcome to Dynamic Capital
        </h2>
        <p className="leading-relaxed text-muted-foreground">
          Your premium Telegram bot for VIP services and crypto management.
        </p>
      </div>
    </div>
  )
}