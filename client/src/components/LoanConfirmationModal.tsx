import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LoanDetails {
  lender: string;
  token: string;
  principal: string;
  apr: string;
  utilization: string;
  dailyInterest: string;
}

interface LoanConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loanDetails: LoanDetails;
  isLoading?: boolean;
}

export function LoanConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loanDetails,
  isLoading = false
}: LoanConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-200">Confirm Loan Creation</DialogTitle>
          <DialogDescription className="text-slate-400">
            Review your loan details before proceeding to the blockchain transaction.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-slate-200 mb-3">Loan Details</h4>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Principal Amount:</span>
              <span className="font-mono text-green-400 font-semibold">{loanDetails.principal} {loanDetails.token}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Interest Rate:</span>
              <span className="font-mono text-yellow-400">{loanDetails.apr}% APR</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Utilization:</span>
              <span className="font-mono text-blue-400">{loanDetails.utilization}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Daily Interest:</span>
              <span className="font-mono text-orange-400">{loanDetails.dailyInterest} {loanDetails.token}</span>
            </div>
            
            <div className="border-t border-slate-700 pt-2 mt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Lender:</span>
                <span className="font-mono text-slate-300 text-sm">{loanDetails.lender.slice(0, 6)}...{loanDetails.lender.slice(-4)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
            <p className="text-blue-300 text-sm">
              <strong>Important:</strong> This loan will begin accruing interest immediately. You can repay any amount at any time without penalties.
            </p>
          </div>
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
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Loan...
              </>
            ) : (
              'Create Loan'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}