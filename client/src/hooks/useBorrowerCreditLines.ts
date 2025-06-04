import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, DEBT_VAULT_DEPLOYMENT_BLOCK } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens, findTokenByAddress } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { queryCreditLineUpdatedEvents } from '@/lib/eventQueries';

interface AvailableCredit {
  lender: string;
  token: string;
  tokenSymbol: string;
  creditLimit: bigint;
  formattedCreditLimit: string;
  utilisedCredit: bigint;
  formattedUtilisedCredit: string;
  availableCredit: bigint;
  formattedAvailableCredit: string;
  minAPR: bigint;
  maxAPR: bigint;
  minAPRPercent: string;
  maxAPRPercent: string;
  originationFee: bigint;
  originationFeePercent: string;
  isActive: boolean;
}

export function useBorrowerCreditLines() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const tokens = getAllTokens();

  const fetchAvailableCredits = async (): Promise<AvailableCredit[]> => {
    if (!address || !publicClient) return [];

    try {
      // Use shared event querying system starting from deployment block
      const events = await queryCreditLineUpdatedEvents(publicClient, { borrower: address }, { fromBlock: DEBT_VAULT_DEPLOYMENT_BLOCK });
      console.log('DEBUG: useBorrowerCreditLines found events:', events.length);

      // Process unique lender-token combinations to avoid duplicates
      const uniqueCredits = new Map<string, any>();
      
      for (const event of events) {
        const { lender, token, creditLimit, minAPR, maxAPR } = event.args;
        if (lender && token) {
          const key = `${lender}-${token}`;
          uniqueCredits.set(key, {
            lender,
            token,
            creditLimit,
            minAPR,
            maxAPR,
          });
        }
      }

      // Fetch current state for each credit line
      const activeCredits: AvailableCredit[] = [];
      
      for (const [key, eventData] of Array.from(uniqueCredits.entries())) {
        try {
          // Get current credit line data from contract
          const creditLineData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'creditLines',
            args: [eventData.lender, address, eventData.token],
          });

          const result = creditLineData as readonly [bigint, bigint, bigint, bigint];
          const [creditLimit, minAPR, maxAPR, originationFee] = result;
          
          // Skip inactive credit lines (creditLimit = 0)
          if (creditLimit === BigInt(0)) continue;

          // Query contract for credit limit availability and lender deposits
          const [creditAvailable, lenderBalance] = await Promise.all([
            publicClient.readContract({
              address: DEBT_VAULT_ADDRESS,
              abi: DEBT_VAULT_ABI,
              functionName: 'getAvailableCredit',
              args: [address, eventData.lender, eventData.token],
            }) as Promise<bigint>,
            publicClient.readContract({
              address: DEBT_VAULT_ADDRESS,
              abi: DEBT_VAULT_ABI,
              functionName: 'lenderDeposits',
              args: [eventData.lender, eventData.token],
            }) as Promise<bigint>
          ]);

          // Available credit is limited by both credit line and lender's actual deposits
          const availableCredit = creditAvailable < lenderBalance ? creditAvailable : lenderBalance;
          
          console.log('DEBUG Credit calculation:', {
            lender: eventData.lender,
            token: eventData.token,
            creditAvailable: creditAvailable.toString(),
            lenderBalance: lenderBalance.toString(),
            finalAvailableCredit: availableCredit.toString(),
            creditLimit: creditLimit.toString()
          });
          
          // Calculate utilized credit (creditLimit - credit line availability)
          const utilisedCredit = creditLimit - creditAvailable;

          // Get token info
          const tokenInfo = findTokenByAddress(eventData.token);
          if (!tokenInfo) continue;

          const credit: AvailableCredit = {
            lender: eventData.lender,
            token: eventData.token,
            tokenSymbol: tokenInfo.symbol,
            creditLimit,
            formattedCreditLimit: formatUnits(creditLimit, tokenInfo.decimals),
            utilisedCredit,
            formattedUtilisedCredit: formatUnits(utilisedCredit, tokenInfo.decimals),
            availableCredit,
            formattedAvailableCredit: formatUnits(availableCredit, tokenInfo.decimals),
            minAPR,
            maxAPR,
            minAPRPercent: (Number(minAPR) / 100).toFixed(2),
            maxAPRPercent: (Number(maxAPR) / 100).toFixed(2),
            originationFee,
            originationFeePercent: (Number(originationFee) / 100).toFixed(2),
            isActive: availableCredit > BigInt(0), // Only show as active if there's actually available credit
          };

          activeCredits.push(credit);
        } catch (error) {
          console.error('Error fetching available credit data:', error);
        }
      }

      return activeCredits;
    } catch (error) {
      console.error('Error fetching available credits:', error);
      return [];
    }
  };

  const { data: availableCredits = [], isLoading, refetch } = useQuery({
    queryKey: ['borrowerCreditLines', address],
    queryFn: fetchAvailableCredits,
    enabled: !!address && !!publicClient,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  });

  return {
    availableCredits,
    isLoading,
    refetch,
  };
}