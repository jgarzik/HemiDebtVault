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
    public: { http: ['https://testnet.rpc.hemi.network/rpc'] },
    default: { http: ['https://testnet.rpc.hemi.network/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Hemi Explorer', url: 'https://testnet.explorer.hemi.xyz' },
  },
});

export const DEBT_VAULT_ADDRESS = '0x72F6185DcBb9c8415f01003ACc872f08B44FC292' as const;
