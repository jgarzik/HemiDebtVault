import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { useLoans } from '@/hooks/useLoans';
import { LoanDetailsModal } from '@/components/lend/LoanDetailsModal';

export function ActiveLoansSection() {
  const { loans, isLoading: isLoansLoading } = useLoans();
  const [showLoanDetailsModal, setShowLoanDetailsModal] = useState(false);
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<any>(null);

  const handleViewLoanDetails = (loan: any) => {
    setSelectedLoanForDetails(loan);
    setShowLoanDetailsModal(true);
  };

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Active Loans</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoansLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-900 p-4 rounded-lg animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No active loans yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => (
                <div key={loan.loanId.toString()} className="bg-slate-900 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Loan #{loan.loanId.toString()}</span>
                        <Badge variant={loan.isActive ? "default" : "secondary"}>
                          {loan.isActive ? "Active" : "Completed"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">
                        Borrower: {loan.borrower.slice(0, 6)}...{loan.borrower.slice(-4)}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-600"
                      onClick={() => handleViewLoanDetails(loan)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Principal</p>
                      <p className="font-medium">{loan.formattedPrincipal} {loan.tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Outstanding</p>
                      <p className="font-medium">{loan.formattedOutstandingPrincipal} {loan.tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Interest Rate</p>
                      <p className="font-medium">{loan.interestRatePercent}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Accrued Interest</p>
                      <p className="font-medium text-yellow-400">{loan.formattedAccruedInterest} {loan.tokenSymbol}</p>
                    </div>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLoanForDetails && (
        <LoanDetailsModal 
          isOpen={showLoanDetailsModal}
          onClose={() => {
            setShowLoanDetailsModal(false);
            setSelectedLoanForDetails(null);
          }}
          loan={selectedLoanForDetails}
        />
      )}
    </>
  );
}