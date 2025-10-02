// Mock data for trading dashboard

export const currencies = [
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
];

export const currencyStrength = [
  { code: "NZD", strength: 85, sentiment: "bullish" },
  { code: "EUR", strength: 75, sentiment: "bullish" },
  { code: "CHF", strength: 65, sentiment: "bullish" },
  { code: "USD", strength: 35, sentiment: "neutral" },
  { code: "JPY", strength: -45, sentiment: "bearish" },
  { code: "GBP", strength: -55, sentiment: "bearish" },
  { code: "CAD", strength: -65, sentiment: "bearish" },
  { code: "AUD", strength: -75, sentiment: "bearish" },
];

export const quadrantData = [
  { code: "JPY", x: 1.1, y: 59.56, quadrant: "bullish-strong" },
  { code: "EUR", x: -1.0, y: 54.44, quadrant: "neutral" },
  { code: "CHF", x: 0.2, y: 55.22, quadrant: "bullish-weak" },
  { code: "GBP", x: -1.0, y: 47.94, quadrant: "neutral" },
  { code: "AUD", x: -1.2, y: 36.95, quadrant: "bearish" },
  { code: "USD", x: 1.3, y: 60.55, quadrant: "bullish-strong" },
  { code: "NZD", x: -1.1, y: 36.99, quadrant: "bearish-weak" },
  { code: "CAD", x: -1.2, y: 51.13, quadrant: "bearish" },
];

export const trendData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2024, 8, 5 + i);
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    AUD: 45 + Math.sin(i * 0.3) * 10 + Math.random() * 5,
    CAD: 50 + Math.cos(i * 0.25) * 8 + Math.random() * 5,
    CHF: 55 + Math.sin(i * 0.2) * 12 + Math.random() * 5,
    EUR: 52 + Math.cos(i * 0.35) * 10 + Math.random() * 5,
    GBP: 48 + Math.sin(i * 0.28) * 9 + Math.random() * 5,
    JPY: 43 + Math.cos(i * 0.3) * 11 + Math.random() * 5,
    NZD: 58 + Math.sin(i * 0.22) * 8 + Math.random() * 5,
    USD: 60 + Math.cos(i * 0.18) * 7 + Math.random() * 5,
  };
});

export const walletData = {
  balance: "$10,000",
  profit: {
    amount: "$10,000",
    long: "50%",
    short: "+10%",
  },
  loss: {
    amount: "$-250",
    long: "90%",
    short: "-40%",
  },
  address: "0x1234...5678",
  wallet: "+30K DCT",
  trading: "+120K DCT",
  staking: "Available",
};

export const dynamicSignals = {
  status: "Live",
  newSignals: 6,
  indicators: [
    { color: "success", count: 4 },
    { color: "warning", count: 3 },
    { color: "error", count: 8 },
  ],
};

export const poolTrading = {
  title: "Dynamic Pool Trading",
  description: "Learn about pool trading",
  growth: "+4500.5%",
  successRate: "98.9%",
  balance: "$10,000",
  chartData: Array.from({ length: 20 }, (_, i) => ({
    value: 100 + Math.random() * 50 + i * 3,
  })),
};
