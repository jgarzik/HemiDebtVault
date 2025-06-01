import { useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { DEBT_VAULT_ABI, DEBT_VAULT_ADDRESS } from '@/lib/contract';

export function useContractRead(functionName: string, args?: any[]) {
  return useContractRead({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName,
    args,
  });
}

export function useContractWrite(functionName: string) {
  const { config } = usePrepareContractWrite({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName,
  });

  return useContractWrite(config);
}
