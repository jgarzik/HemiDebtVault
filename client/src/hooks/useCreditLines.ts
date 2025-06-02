import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, hemiNetwork } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';

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
  isActive: boolean;
}

export function useCreditLines() {
  const { address } = useAccount();
  const tokens = getAllTokens();

  // Create public client for event fetching
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  const fetchCreditLines = async (): Promise<CreditLine[]> => {
    if (!address) return [];
    

    
    try {
      // Get CreditLineUpdated events where the current user is the lender
      const logs = await publicClient.getLogs({
        address: DEBT_VAULT_ADDRESS,
        event: parseAbiItem('event CreditLineUpdated(address indexed lender, address indexed borrower, address indexed token, uint256 creditLimit, uint256 minAPR, uint256 maxAPR)'),
        args: {
          lender: address,
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });



      // For each unique borrower-token combination, get the latest credit line data
      const uniqueCreditLines = new Map<string, any>();
      
      for (const log of logs) {
        const { borrower, token, creditLimit, minAPR, maxAPR } = log.args;
        const key = `${borrower}-${token}`;
        uniqueCreditLines.set(key, {
          borrower,
          token,
          creditLimit,
          minAPR,
          maxAPR,
        });
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

          const [creditLimit, minAPR, maxAPR] = creditLineData as [bigint, bigint, bigint];
          
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
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === eventData.token.toLowerCase());
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
    enabled: !!address,
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