import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, DEBT_VAULT_DEPLOYMENT_BLOCK } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens, findTokenByAddress } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { queryCreditLineUpdatedEvents } from '@/lib/eventQueries';

interface CreditLine {
  borrower: string;
  token: string;
  tokenSymbol: string;
  creditLimit: bigint;
  formattedCreditLimit: string;
  utilisedCredit: bigint;
  formattedUtilisedCredit: string;
  availableCredit: bigint;
  formattedAvailableCredit: string;
  utilizationPercent: string;
  minAPR: bigint;
  maxAPR: bigint;
  minAPRPercent: string;
  maxAPRPercent: string;
  originationFee: bigint;
  originationFeePercent: string;
  isActive: boolean;
}

export function useCreditLines() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const tokens = getAllTokens();

  const fetchCreditLines = async (): Promise<CreditLine[]> => {
    if (!address || !publicClient) return [];

    try {
      // Use shared event querying system
      const events = await queryCreditLineUpdatedEvents(publicClient, { lender: address });
      console.log('DEBUG: useCreditLines found events:', events.length);

      // For each unique borrower-token combination, get the latest credit line data
      const uniqueCreditLines = new Map<string, any>();
      
      for (const event of events) {
        const { borrower, token, creditLimit, minAPR, maxAPR } = event.args;
        if (borrower && token) {
          const key = `${borrower}-${token}`;
          uniqueCreditLines.set(key, {
            borrower,
            token,
            creditLimit,
            minAPR,
            maxAPR,
          });
        }
      }

      // Fetch current state for each credit line and format data
      const activeCreditLines: CreditLine[] = [];
      
      for (const [key, eventData] of Array.from(uniqueCreditLines.entries())) {
        try {
          // Get current credit line data from contract
          const creditLineData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'creditLines',
            args: [address, eventData.borrower, eventData.token],
          });

          const result = creditLineData as readonly [bigint, bigint, bigint, bigint];
          const creditLimit = result[0];
          const minAPR = result[1];
          const maxAPR = result[2];
          const originationFee = result[3] || BigInt(0);
          
          // Skip inactive credit lines (creditLimit = 0)
          if (creditLimit === BigInt(0)) continue;

          // Use contract's getAvailableCredit function for accurate utilization calculation
          const availableCredit = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'getAvailableCredit',
            args: [eventData.borrower, address, eventData.token],
          }) as bigint;

          // Calculate utilized credit (creditLimit - availableCredit)
          const utilisedCredit = creditLimit - availableCredit;

          // Get token info
          const tokenInfo = findTokenByAddress(eventData.token);
          if (!tokenInfo) continue;

          const creditLine: CreditLine = {
            borrower: eventData.borrower,
            token: eventData.token,
            tokenSymbol: tokenInfo.symbol,
            creditLimit,
            formattedCreditLimit: formatUnits(creditLimit, tokenInfo.decimals),
            utilisedCredit,
            formattedUtilisedCredit: formatUnits(utilisedCredit, tokenInfo.decimals),
            availableCredit,
            formattedAvailableCredit: formatUnits(availableCredit, tokenInfo.decimals),
            utilizationPercent: creditLimit > 0 ? ((Number(utilisedCredit) / Number(creditLimit)) * 100).toFixed(1) : '0.0',
            minAPR,
            maxAPR,
            minAPRPercent: (Number(minAPR) / 100).toFixed(2),
            maxAPRPercent: (Number(maxAPR) / 100).toFixed(2),
            originationFee: originationFee || BigInt(0),
            originationFeePercent: (Number(originationFee || 0) / 100).toFixed(2),
            isActive: true,
          };

          activeCreditLines.push(creditLine);
        } catch (error) {
          console.error('Error fetching credit line data:', error);
        }
      }

      return activeCreditLines;
    } catch (error) {
      console.error('Error fetching credit lines:', error);
      return [];
    }
  };

  const { data: creditLines = [], isLoading, refetch } = useQuery({
    queryKey: ['creditLines', address],
    queryFn: fetchCreditLines,
    enabled: !!address && !!publicClient,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  });

  return {
    creditLines,
    isLoading,
    refetch,
  };
}