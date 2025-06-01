import { useAccount, useSwitchChain } from 'wagmi';
import { hemiNetwork } from '@/lib/hemi';

export function useNetworkSwitching() {
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const isCorrectNetwork = chainId === hemiNetwork.id;
  const needsNetworkSwitch = !isCorrectNetwork;

  const switchToHemi = async () => {
    try {
      await switchChain({ chainId: hemiNetwork.id });
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  };

  return {
    chainId,
    isCorrectNetwork,
    needsNetworkSwitch,
    switchToHemi,
    targetNetwork: hemiNetwork
  };
}