import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export function useWalletConnection() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const connect = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  return {
    address,
    isConnected,
    connect,
    needsConnection: !isConnected
  };
}