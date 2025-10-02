export const mockWalletData = {
  balance: 1250.50,
  currency: 'USD',
  change: 12.5,
  changePercent: 1.02,
};

export const mockSignals = [
  { id: 1, type: 'buy', asset: 'BTC/USD', confidence: 85, timestamp: new Date() },
  { id: 2, type: 'sell', asset: 'ETH/USD', confidence: 72, timestamp: new Date() },
];

export const mockStrengthData = {
  current: 75,
  trend: 'up' as const,
};

export const mockTrendData = [
  { date: '2024-01', value: 1200 },
  { date: '2024-02', value: 1350 },
  { date: '2024-03', value: 1250 },
];

export const mockQuadrantData = [
  { x: 10, y: 20, label: 'Asset A' },
  { x: 30, y: 40, label: 'Asset B' },
];
