import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQueryClient } from '@tanstack/react-query';
import { TRANSACTION_CONFIG } from '@/lib/constants';
import { useCacheInvalidation } from '@/lib/cacheInvalidation';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionButton } from "@/components/TransactionButton";
import { Loader2, ArrowRight } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { parseUnits, formatUnits, createPublicClient, http, isAddress } from "viem";
import { useAccount } from "wagmi";
import { type Token, getAllTokens } from "@/lib/tokens";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useDebtVault } from "@/hooks/useDebtVault";
import { useQuerySuspension } from "@/hooks/useQuerySuspension";
import { DEBT_VAULT_ADDRESS, hemiNetwork } from "@/lib/hemi";
import { DEBT_VAULT_ABI } from "@/lib/contract";

interface RepaymentDetails {
  loanId: bigint;
  token: string;
  tokenSymbol: string;
  currentPrincipal: string;
  currentInterest: string;
  totalOwed: string;
}

interface PaymentBreakdown {
  paymentAmount: string;
  interestPaid: string;
  principalPaid: string;
  remainingInterest: string;
  remainingPrincipal: string;
  isFullPayoff: boolean;
}

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  repaymentDetails: RepaymentDetails;
  isLoading?: boolean;
}

export function RepaymentModal({
  isOpen,
  onClose,
  repaymentDetails,
  isLoading = false
}: RepaymentModalProps) {
  const { address } = useAccount();
  const { repay } = useDebtVault();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [currentPrincipal, setCurrentPrincipal] = useState<string>('0');
  const [currentInterest, setCurrentInterest] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const queryClient = useQueryClient();
  const cacheManager = useCacheInvalidation(queryClient);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isSuspended } = useQuerySuspension();
  
  // Get the token info and fetch balance via direct RPC (no wallet queries)
  const tokens = getAllTokens();
  const tokenInfo = tokens.find(t => t.address.toLowerCase() === repaymentDetails.token.toLowerCase());
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null);
  const [formattedWalletBalance, setFormattedWalletBalance] = useState<string>('0');

  // Create public client for contract calls
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  // Fetch data via direct RPC calls (no wallet involvement)
  useEffect(() => {
    if (!isOpen || !address || !tokenInfo) return;
    
    const fetchDataDirectly = async () => {
      try {
        setIsLoadingBalance(true);
        
        // Fetch outstanding balance via direct RPC
        const outstandingBalance = await publicClient.readContract({
          address: DEBT_VAULT_ADDRESS,
          abi: DEBT_VAULT_ABI,
          functionName: 'getOutstandingBalance',
          args: [repaymentDetails.loanId],
        });

        const [principal, interest] = outstandingBalance as [bigint, bigint];
        setCurrentPrincipal(formatUnits(principal, tokenInfo.decimals));
        setCurrentInterest(formatUnits(interest, tokenInfo.decimals));

        // Fetch wallet balance via direct RPC (no wallet query)
        const balance = await publicClient.readContract({
          address: tokenInfo.address as `0x${string}`,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }]
            }
          ],
          functionName: 'balanceOf',
          args: [address],
        });

        setWalletBalance(balance as bigint);
        setFormattedWalletBalance(formatUnits(balance as bigint, tokenInfo.decimals));
        
      } catch (error) {
        console.error('Error fetching data via RPC:', error);
        // Fallback to passed values
        setCurrentPrincipal(repaymentDetails.currentPrincipal);
        setCurrentInterest(repaymentDetails.currentInterest);
        setWalletBalance(BigInt(0));
        setFormattedWalletBalance('0');
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchDataDirectly();
  }, [isOpen, address, tokenInfo, repaymentDetails.loanId, publicClient]);
  
  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);
  
  // Calculate payment breakdown as user types
  const paymentBreakdown: PaymentBreakdown = useMemo(() => {
    if (!paymentAmount || parseFloat(paymentAmount) === 0) {
      return {
        paymentAmount: '0',
        interestPaid: '0',
        principalPaid: '0',
        remainingInterest: currentInterest,
        remainingPrincipal: currentPrincipal,
        isFullPayoff: false
      };
    }
    
    const payment = parseFloat(paymentAmount);
    const interest = parseFloat(currentInterest);
    const principal = parseFloat(currentPrincipal);
    
    // Apply contract logic: interest paid first, then principal
    let remaining = payment;
    let interestPaid = 0;
    let principalPaid = 0;
    
    // Pay interest first
    if (interest > 0 && remaining > 0) {
      interestPaid = Math.min(interest, remaining);
      remaining -= interestPaid;
    }
    
    // Then pay principal
    if (remaining > 0 && principal > 0) {
      principalPaid = Math.min(principal, remaining);
    }
    
    const remainingInterest = interest - interestPaid;
    const remainingPrincipal = principal - principalPaid;
    const isFullPayoff = remainingInterest === 0 && remainingPrincipal === 0;
    
    // Use token decimals for precision, fallback to 6 if token not found
    const decimals = tokenInfo?.decimals || 6;
    
    return {
      paymentAmount: payment.toFixed(decimals),
      interestPaid: interestPaid.toFixed(decimals),
      principalPaid: principalPaid.toFixed(decimals),
      remainingInterest: remainingInterest.toFixed(decimals),
      remainingPrincipal: remainingPrincipal.toFixed(decimals),
      isFullPayoff
    };
  }, [paymentAmount, currentPrincipal, currentInterest, tokenInfo]);
  
  const validatePaymentInput = (value: string): boolean => {
    if (!value || value.trim() === '') return false;
    const num = parseFloat(value);
    // Reject negative, NaN, infinite, or exponential notation
    if (isNaN(num) || !isFinite(num) || num < 0 || /[eE]/.test(value)) return false;
    
    // Check decimal places don't exceed token decimals
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1) {
      const decimals = value.length - decimalIndex - 1;
      if (decimals > (tokenInfo?.decimals || 18)) return false;
    }
    
    return true;
  };

  const handleMaxPayment = () => {
    if (!tokenInfo || !formattedWalletBalance) {
      const totalOwed = (parseFloat(currentPrincipal) + parseFloat(currentInterest)).toString();
      setPaymentAmount(totalOwed);
      return;
    }
    
    const walletBalanceNum = parseFloat(formattedWalletBalance);
    const totalOwedNum = parseFloat(currentPrincipal) + parseFloat(currentInterest);
    const maxPayable = Math.min(walletBalanceNum, totalOwedNum);
    
    setPaymentAmount(maxPayable.toString());
  };
  

  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-200">Repay Loan #{repaymentDetails.loanId.toString()}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter your payment amount. Interest is paid first, then principal.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Debt Summary */}
          <div className="bg-slate-900 rounded-lg p-4">
            <h4 className="font-medium text-slate-200 mb-3">Current Debt</h4>
            <div className="space-y-2 text-sm">
              {isLoadingBalance ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-slate-400">Loading current balance...</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Accrued Interest:</span>
                    <span className="font-mono text-orange-400">{currentInterest} {repaymentDetails.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Outstanding Principal:</span>
                    <span className="font-mono text-blue-400">{currentPrincipal} {repaymentDetails.tokenSymbol}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-300">Total Owed:</span>
                      <span className="font-mono text-red-400">{(parseFloat(currentPrincipal) + parseFloat(currentInterest)).toFixed(tokenInfo?.decimals || 6)} {repaymentDetails.tokenSymbol}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Payment Input */}
          <div className="space-y-2">
            <Label htmlFor="payment" className="text-slate-300">Payment Amount</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="payment"
                  type="number"
                  step="0.000001"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.000000"
                  className="bg-slate-900 border-slate-600 text-slate-200"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMaxPayment}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Max
                </Button>
              </div>
              <div className="text-xs text-slate-400">
                Wallet Balance: {formattedWalletBalance || (tokenInfo ? '0'.padEnd(tokenInfo.decimals + 2, '0') : '0.000000')} {repaymentDetails.tokenSymbol}
              </div>
            </div>
          </div>
          
          {/* Payment Breakdown */}
          {parseFloat(paymentBreakdown.paymentAmount) > 0 && (
            <div className="bg-slate-900 rounded-lg p-4">
              <h4 className="font-medium text-slate-200 mb-3">Payment Breakdown</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Interest Payment:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-orange-400">{parseFloat(repaymentDetails.currentInterest).toFixed(6)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="font-mono text-green-400">{paymentBreakdown.remainingInterest}</span>
                    <span className="text-slate-500">{repaymentDetails.tokenSymbol}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Principal Payment:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-400">{parseFloat(repaymentDetails.currentPrincipal).toFixed(6)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="font-mono text-green-400">{paymentBreakdown.remainingPrincipal}</span>
                    <span className="text-slate-500">{repaymentDetails.tokenSymbol}</span>
                  </div>
                </div>
                
                <div className="border-t border-slate-700 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">You're paying:</span>
                    <span className="font-mono text-yellow-400">{paymentBreakdown.interestPaid} interest + {paymentBreakdown.principalPaid} principal</span>
                  </div>
                </div>
                
                {paymentBreakdown.isFullPayoff && (
                  <div className="bg-green-900/20 border border-green-700 rounded p-2 mt-3">
                    <p className="text-green-300 text-xs font-medium">
                      ✓ This payment will fully close your loan and burn the NFT
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <TransactionButton
            onExecute={async () => {
              if (!tokenInfo || !paymentAmount) return '';
              
              // Direct repay call - consistent with deposit pattern
              const amountBigInt = parseUnits(paymentAmount, tokenInfo.decimals);
              const txHash = await repay(repaymentDetails.loanId, amountBigInt);
              
              // Reset form on success
              setPaymentAmount('');
              
              return txHash;
            }}
            disabled={!paymentAmount || !validatePaymentInput(paymentAmount)}
            className="flex-1 bg-green-600 hover:bg-green-700"
            requiresApproval={tokenInfo && paymentAmount ? {
              token: tokenInfo,
              amount: paymentAmount,
              spenderAddress: DEBT_VAULT_ADDRESS
            } : undefined}
            actionLabel="Repay Loan"
            transactionAmount={paymentAmount ? `${paymentAmount} ${repaymentDetails.tokenSymbol}` : undefined}
            onSuccess={() => {
              // Close modal
              onClose();
              
              // Clear any existing timeout
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              
              // Use centralized cache invalidation for repayment
              cacheManager.invalidateAfterRepayment(address);
            }}
          >
            {paymentAmount ? `Pay ${paymentAmount} ${repaymentDetails.tokenSymbol}` : 'Enter amount'}
          </TransactionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}