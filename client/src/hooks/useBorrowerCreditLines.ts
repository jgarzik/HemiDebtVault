import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, hemiNetwork } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';

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
  isActive: boolean;
}

export function useBorrowerCreditLines() {
  const { address } = useAccount();
  const tokens = getAllTokens();

  // Create public client for event fetching
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  const fetchAvailableCredits = async (): Promise<AvailableCredit[]> => {
    if (!address) return [];
    
    console.log('Fetching available credits for borrower:', address);
    
    try {
      // Get CreditLineUpdated events where the current user is the borrower
      const logs = await publicClient.getLogs({
        address: DEBT_VAULT_ADDRESS,
        event: parseAbiItem('event CreditLineUpdated(address indexed lender, address indexed borrower, address indexed token, uint256 creditLimit, uint256 minAPR, uint256 maxAPR)'),
        args: {
          borrower: address,
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      console.log('Found available credit events:', logs.length);

      // For each unique lender-token combination, get the latest credit line data
      const uniqueCredits = new Map<string, any>();
      
      for (const log of logs) {
        const { lender, token, creditLimit, minAPR, maxAPR } = log.args;
        const key = `${lender}-${token}`;
        uniqueCredits.set(key, {
          lender,
          token,
          creditLimit,
          minAPR,
          maxAPR,
        });
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

          const [creditLimit, minAPR, maxAPR] = creditLineData as [bigint, bigint, bigint];
          
          // Skip inactive credit lines (creditLimit = 0)
          if (creditLimit === BigInt(0)) continue;

          // Use contract's getAvailableCredit function for accurate calculation
          const availableCredit = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'getAvailableCredit',
            args: [address, eventData.lender, eventData.token],
          }) as bigint;

          // Calculate utilized credit (creditLimit - availableCredit)
          const utilisedCredit = creditLimit - availableCredit;

          // Get token info
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === eventData.token.toLowerCase());
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
            isActive: true,
          };

          activeCredits.push(credit);
        } catch (error) {
          console.error('Error fetching available credit data:', error);
        }
      }

      console.log('Processed available credits:', activeCredits);
      return activeCredits;
    } catch (error) {
      console.error('Error fetching available credits:', error);
      return [];
    }
  };

  const { data: availableCredits = [], isLoading, refetch } = useQuery({
    queryKey: ['borrowerCreditLines', address],
    queryFn: fetchAvailableCredits,
    enabled: !!address,
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