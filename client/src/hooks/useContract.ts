import { useReadContract, useWriteContract } from 'wagmi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';

export function useContractRead(functionName: string, args?: any[]) {
  return useReadContract({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName,
    args,
  });
}

export function useContractWrite() {
  return useWriteContract();
}
