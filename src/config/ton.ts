export type TonNetwork = 'mainnet' | 'testnet';

export interface TonConfig {
  network: TonNetwork;
  manifestUrl: string;
  walletConnectProjectId?: string;
}

export const TON_CONFIG: TonConfig = {
  network: 'mainnet',
  manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
};

export const TON_NETWORKS = {
  mainnet: {
    id: 'mainnet',
    label: 'TON Mainnet',
    apiEndpoint: 'https://toncenter.com/api/v2/jsonRPC',
  },
  testnet: {
    id: 'testnet',
    label: 'TON Testnet',
    apiEndpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  },
} as const;
