import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { parseUnits, formatUnits } from "viem";
import { type Token, getAllTokens } from "@/lib/tokens";
import { useTokenBalance } from "@/hooks/useTokenBalance";

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
  onConfirm: (amount: string) => void;
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
  
  // Get the token info and user's wallet balance
  const tokens = getAllTokens();
  const tokenInfo = tokens.find(t => t.address.toLowerCase() === repaymentDetails.token.toLowerCase());
  const { balance: walletBalance, formattedBalance: formattedWalletBalance } = useTokenBalance(tokenInfo);
  
  // Calculate payment breakdown as user types
  const paymentBreakdown: PaymentBreakdown = useMemo(() => {
    if (!paymentAmount || parseFloat(paymentAmount) === 0) {
      return {
        paymentAmount: '0',
        interestPaid: '0',
        principalPaid: '0',
        remainingInterest: repaymentDetails.currentInterest,
        remainingPrincipal: repaymentDetails.currentPrincipal,
        isFullPayoff: false
      };
    }
    
    const payment = parseFloat(paymentAmount);
    const interest = parseFloat(repaymentDetails.currentInterest);
    const principal = parseFloat(repaymentDetails.currentPrincipal);
    
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
    
    return {
      paymentAmount: payment.toFixed(6),
      interestPaid: interestPaid.toFixed(6),
      principalPaid: principalPaid.toFixed(6),
      remainingInterest: remainingInterest.toFixed(6),
      remainingPrincipal: remainingPrincipal.toFixed(6),
      isFullPayoff
    };
  }, [paymentAmount, repaymentDetails]);
  
  const handleMaxPayment = () => {
    setPaymentAmount(repaymentDetails.totalOwed);
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
              <div className="flex justify-between">
                <span className="text-slate-400">Accrued Interest:</span>
                <span className="font-mono text-orange-400">{parseFloat(repaymentDetails.currentInterest).toFixed(6)} {repaymentDetails.tokenSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outstanding Principal:</span>
                <span className="font-mono text-blue-400">{parseFloat(repaymentDetails.currentPrincipal).toFixed(6)} {repaymentDetails.tokenSymbol}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-300">Total Owed:</span>
                  <span className="font-mono text-red-400">{parseFloat(repaymentDetails.totalOwed).toFixed(6)} {repaymentDetails.tokenSymbol}</span>
                </div>
              </div>
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
                Wallet Balance: {formattedWalletBalance || '0.000000'} {repaymentDetails.tokenSymbol}
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
          <Button 
            onClick={handleConfirm}
            disabled={isLoading || !paymentAmount || parseFloat(paymentAmount) === 0}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${paymentAmount || '0'} ${repaymentDetails.tokenSymbol}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}