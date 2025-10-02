export const walletData = {
  balance: "$18,200",
  profit: {
    amount: "$7,400",
    long: "$5,400",
    short: "$2,000",
  },
  loss: {
    amount: "$2,950",
    long: "$1,100",
    short: "$1,850",
  },
  wallet: "$2,075.57",
  trading: "$12,980.12",
  staking: "0.00",
};

export const dynamicSignals = {
  status: "Active",
  indicators: [
    { count: 5, color: "success" },
    { count: 2, color: "warning" },
    { count: 1, color: "error" },
  ],
};

export const currencies = [
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar" },
  { code: "CAD", flag: "🇨🇦", name: "Canadian Dollar" },
  { code: "CHF", flag: "🇨🇭", name: "Swiss Franc" },
  { code: "NZD", flag: "🇳🇿", name: "New Zealand Dollar" },
];

export const currencyStrength = [
  { code: "USD", strength: 65 },
  { code: "EUR", strength: -45 },
  { code: "GBP", strength: 30 },
  { code: "JPY", strength: -55 },
  { code: "AUD", strength: 20 },
  { code: "CAD", strength: -10 },
  { code: "CHF", strength: 40 },
  { code: "NZD", strength: -25 },
];

export const trendData = [
  { time: "00:00", value: 100 },
  { time: "04:00", value: 120 },
  { time: "08:00", value: 115 },
  { time: "12:00", value: 135 },
  { time: "16:00", value: 125 },
  { time: "20:00", value: 145 },
  { time: "24:00", value: 150 },
];

export const quadrantData = [
  { x: 65, y: 85, currency: "USD", size: 20 },
  { x: -45, y: 60, currency: "EUR", size: 18 },
  { x: 30, y: 70, currency: "GBP", size: 15 },
  { x: -55, y: 45, currency: "JPY", size: 16 },
  { x: 20, y: 55, currency: "AUD", size: 12 },
  { x: -10, y: 50, currency: "CAD", size: 11 },
  { x: 40, y: 75, currency: "CHF", size: 14 },
  { x: -25, y: 40, currency: "NZD", size: 10 },
];

export const poolTrading = {
  title: "Pool Trading",
  description: "Connect to Pool Trading Platform",
  chartData: [
    { value: 120 },
    { value: 150 },
    { value: 130 },
    { value: 180 },
    { value: 160 },
  ],
  growth: "+24.5%",
  successRate: "92%",
  balance: "$5,420.00",
};
