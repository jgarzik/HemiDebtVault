import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any;
}

export function LoanDetailsModal({ isOpen, onClose, loan }: LoanDetailsModalProps) {
  if (!loan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Loan Details #{loan.loanId.toString()}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status and Basic Info */}
          <div className="flex items-center gap-4">
            <Badge variant={loan.isActive ? "default" : "secondary"}>
              {loan.isActive ? "Active" : "Completed"}
            </Badge>
            <span className="text-sm text-slate-400">
              Token: {loan.tokenSymbol}
            </span>
          </div>

          {/* Loan Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Original Principal</p>
              <p className="text-xl font-bold">{loan.formattedPrincipal} {loan.tokenSymbol}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Outstanding Principal</p>
              <p className="text-xl font-bold">{loan.formattedOutstandingPrincipal} {loan.tokenSymbol}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Repaid Principal</p>
              <p className="text-xl font-bold text-green-400">{loan.formattedRepaidPrincipal} {loan.tokenSymbol}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Accrued Interest</p>
              <p className="text-xl font-bold text-yellow-400">{loan.formattedAccruedInterest} {loan.tokenSymbol}</p>
            </div>
          </div>

          {/* Interest Information */}
          <div className="bg-slate-900 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Interest Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Interest Rate</p>
                <p className="font-medium">{loan.interestRatePercent}% APR</p>
              </div>
              <div>
                <p className="text-slate-400">Total Outstanding</p>
                <p className="font-medium">{loan.formattedOutstandingBalance} {loan.tokenSymbol}</p>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-slate-900 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Participants</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Borrower</p>
                <p className="font-mono">{loan.borrower}</p>
              </div>
              <div>
                <p className="text-slate-400">Lender</p>
                <p className="font-mono">{loan.lender}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-slate-900 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Timeline</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Created</p>
                <p className="font-medium">{loan.createdAtDate}</p>
              </div>
              <div>
                <p className="text-slate-400">Last Payment</p>
                <p className="font-medium">{loan.lastPaymentDate}</p>
              </div>
            </div>
          </div>

          {/* Forgiven Principal (if any) */}
          {loan.forgivenPrincipal > BigInt(0) && (
            <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-700">
              <h3 className="font-semibold mb-2 text-amber-400">Forgiven Amount</h3>
              <p className="text-amber-300">{loan.formattedForgivenPrincipal} {loan.tokenSymbol}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}