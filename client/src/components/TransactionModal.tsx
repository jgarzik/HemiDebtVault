import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  action: string;
  amount?: string;
  gasEstimate?: string;
  isLoading?: boolean;
  loanDetails?: {
    lender: string;
    token: string;
    principal: string;
    apr: string;
    utilization: string;
    dailyInterest: string;
  };
}

export function TransactionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  action,
  amount,
  gasEstimate,
  isLoading = false,
}: TransactionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">{title}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Action:</span>
            <span className="font-medium text-slate-200">{action}</span>
          </div>
          
          {amount && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Amount:</span>
              <span className="font-mono text-slate-200">{amount}</span>
            </div>
          )}
          
          {gasEstimate && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Gas Estimate:</span>
              <span className="font-mono text-slate-200">{gasEstimate}</span>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
