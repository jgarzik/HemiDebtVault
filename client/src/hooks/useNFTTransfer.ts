import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useLoans, useBorrowerLoans } from './useLoans';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { useTransactionBuilder } from './useTransactionBuilder';

interface TransferableLoan {
  loanId: bigint;
  tokenSymbol: string;
  principal: string;
  borrower: string;
  lender: string;
  canTransfer: boolean;
}

export function useNFTTransfer() {
  const { address } = useAccount();
  const { loans: lenderLoans } = useLoans();
  const { loans: borrowedLoans } = useBorrowerLoans();
  const { withSuspension } = useQuerySuspension();
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Get transferable loans (loans where user is current NFT owner)
  const getTransferableLoans = (): TransferableLoan[] => {
    const transferableLoans: TransferableLoan[] = [];

    // Add lender loans (user owns these NFTs as the lender)
    lenderLoans.forEach(loan => {
      transferableLoans.push({
        loanId: loan.loanId,
        tokenSymbol: loan.tokenSymbol,
        principal: loan.formattedPrincipal,
        borrower: loan.borrower,
        lender: loan.lender,
        canTransfer: true,
      });
    });

    // Add borrower loans (user owns these NFTs as current borrower)
    borrowedLoans.forEach((loan: any) => {
      transferableLoans.push({
        loanId: loan.loanId,
        tokenSymbol: loan.tokenSymbol,
        principal: loan.formattedPrincipal,
        borrower: loan.borrower,
        lender: loan.lender,
        canTransfer: true,
      });
    });

    return transferableLoans;
  };

  const transferLoanNFT = async (loanId: bigint, to: string) => {
    if (!address) throw new Error('Wallet not connected');

    return withSuspension(async () => {
      await writeContract({
        address: DEBT_VAULT_ADDRESS,
        abi: DEBT_VAULT_ABI,
        functionName: 'transferFrom',
        args: [address, to as `0x${string}`, loanId],
      });
    }, ['loans', 'borrowerLoans', 'loanNFTs']);
  };

  const { data: transferableLoans = [], isLoading } = useQuery({
    queryKey: ['transferableLoans', address, lenderLoans.length, borrowedLoans.length],
    queryFn: getTransferableLoans,
    enabled: !!address,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  });

  return {
    transferableLoans,
    transferLoanNFT,
    isLoading,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}