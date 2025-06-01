import { useAccount, useReadContract, useBlockNumber } from 'wagmi';
import { useState, useEffect } from 'react';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, hemiNetwork } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens } from '@/lib/tokens';

interface CreditLine {
  borrower: string;
  token: string;
  tokenSymbol: string;
  creditLimit: bigint;
  formattedCreditLimit: string;
  minAPR: bigint;
  maxAPR: bigint;
  minAPRPercent: string;
  maxAPRPercent: string;
  isActive: boolean;
}

export function useCreditLines() {
  const { address } = useAccount();
  const [creditLines, setCreditLines] = useState<CreditLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const tokens = getAllTokens();

  // Create public client for event fetching
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  const fetchCreditLines = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching credit lines for lender:', address);
      
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

      console.log('Found credit line events:', logs.length);

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
          
          // Skip if credit limit is 0 (credit line was deleted)
          if (creditLimit === BigInt(0)) continue;

          // Find token info
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === eventData.token.toLowerCase());
          
          const creditLine: CreditLine = {
            borrower: eventData.borrower,
            token: eventData.token,
            tokenSymbol: tokenInfo?.symbol || 'Unknown',
            creditLimit,
            formattedCreditLimit: tokenInfo ? formatUnits(creditLimit, tokenInfo.decimals) : creditLimit.toString(),
            minAPR,
            maxAPR,
            minAPRPercent: (Number(minAPR) / 100).toFixed(2),
            maxAPRPercent: (Number(maxAPR) / 100).toFixed(2),
            isActive: creditLimit > BigInt(0),
          };

          activeCreditLines.push(creditLine);
        } catch (error) {
          console.error('Error fetching credit line data for', key, error);
        }
      }

      console.log('Active credit lines:', activeCreditLines);
      setCreditLines(activeCreditLines);
    } catch (error) {
      console.error('Error fetching credit lines:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch credit lines when address changes or new blocks are mined
  useEffect(() => {
    fetchCreditLines();
  }, [address, blockNumber]);

  return {
    creditLines,
    isLoading,
    refetch: fetchCreditLines,
  };
}