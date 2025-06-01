import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { http } from 'viem';
import { hemiNetwork } from '@/lib/hemi';

const wagmiConfig = getDefaultConfig({
  appName: 'DebtVault',
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'default_project_id',
  chains: [hemiNetwork],
  transports: {
    [hemiNetwork.id]: http('https://rpc.hemi.network/rpc', {
      batch: false,
      fetchOptions: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
      // Disable polling filters to avoid RPC errors
      key: 'hemi-rpc',
      name: 'Hemi RPC',
      retryCount: 2,
      retryDelay: 1000,
    }),
  },
});

const customTheme = darkTheme({
  accentColor: '#3B82F6',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider 
        theme={customTheme}
        showRecentTransactions={true}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
