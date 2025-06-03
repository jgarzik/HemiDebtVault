import { defineChain } from 'viem';

export const hemiNetwork = defineChain({
  id: 43111,
  name: 'Hemi Network',
  network: 'hemi',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://rpc.hemi.network/rpc'] },
    default: { http: ['https://rpc.hemi.network/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Hemi Explorer', url: 'https://explorer.hemi.xyz' },
  },
  // Add custom configuration to handle RPC limitations
  fees: undefined,
  formatters: undefined,
  serializers: undefined,
});

export const DEBT_VAULT_ADDRESS = '0xB4ED059A662073381e64c1eDE861bC6aBE655FB0' as const;
