import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Plus } from 'lucide-react';
import { useCreditLines } from '@/hooks/useCreditLines';
import { CreditLineModal } from '@/components/CreditLineModal';

export function CreditLinesSection() {
  const { creditLines, isLoading: isCreditLinesLoading, refetch } = useCreditLines();
  const [showCreditLineModal, setShowCreditLineModal] = useState(false);

  const handleSuccess = () => {
    console.log('Credit line created successfully, refreshing data...');
    refetch();
  };

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Credit Lines</CardTitle>
          <Button 
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowCreditLineModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Credit Line
          </Button>
        </CardHeader>
        <CardContent>
          {isCreditLinesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-900 p-4 rounded-lg animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : creditLines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No credit lines set up yet</p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowCreditLineModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Credit Line
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {creditLines.map((creditLine) => (
                <div key={`${creditLine.borrower}-${creditLine.token}`} className="bg-slate-900 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{creditLine.tokenSymbol}</span>
                        <Badge variant={creditLine.isActive ? "default" : "secondary"}>
                          {creditLine.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">
                        Borrower: {creditLine.borrower.slice(0, 6)}...{creditLine.borrower.slice(-4)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="border-slate-600">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Credit Limit</p>
                      <p className="font-medium">{creditLine.formattedCreditLimit} {creditLine.tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Utilized</p>
                      <p className="font-medium">{creditLine.formattedUtilisedCredit} {creditLine.tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Available</p>
                      <p className="font-medium text-green-400">{creditLine.formattedAvailableCredit} {creditLine.tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Utilization</p>
                      <p className="font-medium">{creditLine.utilizationPercent}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400">APR Range</p>
                      <p className="font-medium">{creditLine.minAPRPercent}% - {creditLine.maxAPRPercent}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Origination Fee</p>
                      <p className="font-medium text-orange-400">{creditLine.originationFeePercent}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreditLineModal 
        isOpen={showCreditLineModal}
        onClose={() => setShowCreditLineModal(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}