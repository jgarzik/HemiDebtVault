import { useAccount, useBlockNumber } from 'wagmi';
import { useState, useEffect } from 'react';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, hemiNetwork } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens } from '@/lib/tokens';

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
  const [availableCredits, setAvailableCredits] = useState<AvailableCredit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const tokens = getAllTokens();

  // Create public client for event fetching
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  const fetchAvailableCredits = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching available credits for borrower:', address);
      
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
          
          // Skip if credit limit is 0 (credit line was deleted)
          if (creditLimit === BigInt(0)) continue;

          // For now, we'll assume 0 utilised credit since we'd need to track loans
          // In a full implementation, this would sum up active loan principals
          const utilisedCredit = BigInt(0);
          const availableCredit = creditLimit - utilisedCredit;

          // Find token info
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === eventData.token.toLowerCase());
          
          const credit: AvailableCredit = {
            lender: eventData.lender,
            token: eventData.token,
            tokenSymbol: tokenInfo?.symbol || 'Unknown',
            creditLimit,
            formattedCreditLimit: tokenInfo ? formatUnits(creditLimit, tokenInfo.decimals) : creditLimit.toString(),
            utilisedCredit,
            formattedUtilisedCredit: tokenInfo ? formatUnits(utilisedCredit, tokenInfo.decimals) : utilisedCredit.toString(),
            availableCredit,
            formattedAvailableCredit: tokenInfo ? formatUnits(availableCredit, tokenInfo.decimals) : availableCredit.toString(),
            minAPR,
            maxAPR,
            minAPRPercent: (Number(minAPR) / 100).toFixed(2),
            maxAPRPercent: (Number(maxAPR) / 100).toFixed(2),
            isActive: creditLimit > BigInt(0),
          };

          activeCredits.push(credit);
        } catch (error) {
          console.error('Error fetching credit data for', key, error);
        }
      }

      console.log('Available credits:', activeCredits);
      setAvailableCredits(activeCredits);
    } catch (error) {
      console.error('Error fetching available credits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available credits when address changes or new blocks are mined
  useEffect(() => {
    fetchAvailableCredits();
  }, [address, blockNumber]);

  return {
    availableCredits,
    isLoading,
    refetch: fetchAvailableCredits,
  };
}