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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionButton } from "@/components/TransactionButton";
import { Loader2, ArrowRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { parseUnits, formatUnits, createPublicClient, http } from "viem";
import { type Token, getAllTokens } from "@/lib/tokens";
import { useTokenBalance } from "@/hooks/useTokenBalance";
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
  onConfirm: (amount: string) => Promise<string>;
  repaymentDetails: RepaymentDetails;
  isLoading?: boolean;
}

export function RepaymentModal({
  isOpen,
  onClose,
  onConfirm,
  repaymentDetails,
  isLoading = false
}: RepaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [currentPrincipal, setCurrentPrincipal] = useState<string>('0');
  const [currentInterest, setCurrentInterest] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const queryClient = useQueryClient();
  
  // Get the token info and user's wallet balance
  const tokens = getAllTokens();
  const tokenInfo = tokens.find(t => t.address.toLowerCase() === repaymentDetails.token.toLowerCase());
  const { balance: walletBalance, formattedBalance: formattedWalletBalance } = useTokenBalance(tokenInfo);

  // Create public client for contract calls
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  // Fetch accurate outstanding balance when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchOutstandingBalance = async () => {
      try {
        setIsLoadingBalance(true);
        
        const outstandingBalance = await publicClient.readContract({
          address: DEBT_VAULT_ADDRESS,
          abi: DEBT_VAULT_ABI,
          functionName: 'getOutstandingBalance',
          args: [repaymentDetails.loanId],
        });

        const [principal, interest] = outstandingBalance as [bigint, bigint];
        
        if (tokenInfo) {
          setCurrentPrincipal(formatUnits(principal, tokenInfo.decimals));
          setCurrentInterest(formatUnits(interest, tokenInfo.decimals));
        }
      } catch (error) {
        console.error('Error fetching outstanding balance:', error);
        // Fallback to passed values
        setCurrentPrincipal(repaymentDetails.currentPrincipal);
        setCurrentInterest(repaymentDetails.currentInterest);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchOutstandingBalance();
  }, [isOpen, repaymentDetails.loanId, tokenInfo, publicClient]);
  
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
  
  const handleConfirm = () => {
    if (paymentAmount && parseFloat(paymentAmount) > 0) {
      onConfirm(paymentAmount);
    }
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
              if (paymentAmount && parseFloat(paymentAmount) > 0) {
                return await onConfirm(paymentAmount);
              }
              throw new Error('Invalid payment amount');
            }}
            disabled={!paymentAmount || parseFloat(paymentAmount) === 0}
            className="flex-1 bg-green-600 hover:bg-green-700"
            requiresApproval={tokenInfo && paymentAmount ? {
              token: tokenInfo,
              amount: paymentAmount,
              spenderAddress: DEBT_VAULT_ADDRESS
            } : undefined}
            actionLabel="Repay Loan"
            transactionAmount={paymentAmount ? `${paymentAmount} ${repaymentDetails.tokenSymbol}` : undefined}
            onSuccess={() => {
              // Close modal and invalidate loan-related queries
              onClose();
              
              // Invalidate all loan and credit line queries to refresh data
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['borrowedLoans'] });
                queryClient.invalidateQueries({ queryKey: ['borrowerCreditLines'] });
                queryClient.invalidateQueries({ queryKey: ['loans'] });
                queryClient.invalidateQueries({ queryKey: ['creditLines'] });
              }, TRANSACTION_CONFIG.CONFIRMATION_DELAY);
            }}
          >
            {paymentAmount ? `Pay ${paymentAmount} ${repaymentDetails.tokenSymbol}` : 'Enter amount'}
          </TransactionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}