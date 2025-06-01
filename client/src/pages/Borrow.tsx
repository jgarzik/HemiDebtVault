import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionModal } from '@/components/TransactionModal';
import { useDebtVault } from '@/hooks/useDebtVault';
import { Search, Plus, Info } from 'lucide-react';

export function Borrow() {
  const { address } = useAccount();
  const { borrow, isBorrowLoading } = useDebtVault();
  
  const [selectedLender, setSelectedLender] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);

  const handleBorrow = () => {
    if (!borrowAmount || !selectedLender) return;
    
    setTransactionData({
      title: 'Confirm Loan',
      description: 'Create a new loan position',
      action: 'Create Loan',
      amount: `${borrowAmount} USDC`,
      gasEstimate: '~$3.20',
    });
    setShowTransactionModal(true);
  };

  const confirmTransaction = async () => {
    try {
      if (borrow && borrowAmount) {
        // This would call the actual contract function with real parameters
        await borrow();
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setShowTransactionModal(false);
    }
  };

  const calculateAPR = (amount: string) => {
    // This would calculate based on real utilization data
    return '7.8%';
  };

  const calculateDailyInterest = (amount: string, apr: string) => {
    const daily = (parseFloat(amount) * parseFloat(apr)) / 100 / 365;
    return daily.toFixed(2);
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Borrow</h1>
          <p className="text-slate-400 mt-1">Access credit and manage your loans</p>
        </div>
        <Button className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Request Credit
        </Button>
      </div>

      {/* Available Credit Lines */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Available Credit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No credit lines available</p>
            <p className="text-sm text-slate-500 mt-1">Connect with lenders to establish credit lines</p>
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Request Your First Credit Line
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Borrow Interface */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>New Loan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loan Configuration */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Lender</label>
                <Select value={selectedLender} onValueChange={setSelectedLender}>
                  <SelectTrigger className="bg-slate-900 border-slate-600">
                    <SelectValue placeholder="Choose a lender..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>No lenders available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount</label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="0.0"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    className="bg-slate-900 border-slate-600 text-lg font-mono pr-20"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-mono">
                    USDC
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Credit Limit:</span>
                <span className="font-mono text-slate-300">$0.00</span>
              </div>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleBorrow}
                disabled={!borrowAmount || !selectedLender || isBorrowLoading}
              >
                {isBorrowLoading ? 'Processing...' : 'Create Loan'}
              </Button>
            </div>
            
            {/* Loan Preview */}
            <div className="space-y-4">
              <h3 className="font-semibold">Loan Preview</h3>
              <Card className="bg-slate-900/50 border-slate-600">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Loan Amount:</span>
                    <span className="font-mono">{borrowAmount ? `$${borrowAmount}` : '$0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current APR:</span>
                    <span className="font-mono">{borrowAmount ? calculateAPR(borrowAmount) : '0.0%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Daily Interest:</span>
                    <span className="font-mono text-yellow-400">
                      ${borrowAmount ? calculateDailyInterest(borrowAmount, '7.8') : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Interest:</span>
                    <span className="font-mono text-yellow-400">
                      ${borrowAmount ? (parseFloat(calculateDailyInterest(borrowAmount, '7.8')) * 30).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-yellow-500/10 border-yellow-500/20">
                <CardContent className="p-3">
                  <p className="text-yellow-400 text-sm flex items-start">
                    <Info className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                    Interest accrues continuously. Make regular payments to maintain good standing.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Loans */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>My Loans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No active loans</p>
            <p className="text-sm text-slate-500 mt-1">Your borrowing activity will appear here</p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onConfirm={confirmTransaction}
        title={transactionData?.title || ''}
        description={transactionData?.description || ''}
        action={transactionData?.action || ''}
        amount={transactionData?.amount}
        gasEstimate={transactionData?.gasEstimate}
        isLoading={isBorrowLoading}
      />
    </div>
  );
}
