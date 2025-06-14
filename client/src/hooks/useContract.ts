import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { publicRpcClient } from '@/lib/rpcHelpers';
import { useTransactionBuilder } from './useTransactionBuilder';

// Direct RPC contract read helper
export async function contractRead(functionName: string, args?: any[]) {
  return await publicRpcClient.readContract({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: functionName as any,
    args: args as any,
  });
}

// Use centralized transaction builder for writes
export function useContractWrite() {
  return useTransactionBuilder();
}
