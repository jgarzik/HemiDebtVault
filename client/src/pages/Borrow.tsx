import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionButton } from '@/components/TransactionButton';
import { useDebtVault } from '@/hooks/useDebtVault';
import { useBorrowerCreditLines } from '@/hooks/useBorrowerCreditLines';
import { TokenSelector } from '@/components/TokenSelector';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { type Token, getAllTokens } from '@/lib/tokens';
import { Search, Plus, Info } from 'lucide-react';
import { parseUnits } from 'viem';

export function Borrow() {
  const { address } = useAccount();
  const { borrow } = useDebtVault();
  const { availableCredits, isLoading: isCreditsLoading } = useBorrowerCreditLines();
  
  const [selectedLender, setSelectedLender] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const allTokens = getAllTokens();

  const handleBorrow = async () => {
    if (!borrowAmount || !selectedLender || !selectedToken) return;
    
    try {
      const amount = parseUnits(borrowAmount, selectedToken.decimals);
      await borrow(selectedLender as `0x${string}`, selectedToken.address, amount);
      setBorrowAmount('');
    } catch (error) {
      console.error('Borrow failed:', error);
      throw error;
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
          <div className="flex items-center justify-between">
            <CardTitle>Available Credit</CardTitle>
            <span className="text-sm text-slate-400">{availableCredits.length} available</span>
          </div>
        </CardHeader>
        <CardContent>
          {isCreditsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-slate-400">Loading available credit...</p>
            </div>
          ) : availableCredits.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No credit lines available</p>
              <p className="text-sm text-slate-500 mt-1">Connect with lenders to establish credit lines</p>
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Request Your First Credit Line
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {availableCredits.map((credit, index) => (
                <div key={`${credit.lender}-${credit.token}`} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-slate-200">
                        {credit.tokenSymbol} Credit Line
                      </span>
                    </div>
                    <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                      Available
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Lender:</span>
                      <p className="font-mono text-slate-200 mt-1">
                        {credit.lender.slice(0, 6)}...{credit.lender.slice(-4)}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Available Credit:</span>
                      <p className="text-green-400 font-semibold mt-1">
                        {parseFloat(credit.formattedAvailableCredit).toLocaleString()} {credit.tokenSymbol}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Credit Limit:</span>
                      <p className="text-blue-400 font-semibold mt-1">
                        {parseFloat(credit.formattedCreditLimit).toLocaleString()} {credit.tokenSymbol}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">APR Range:</span>
                      <p className="text-yellow-400 font-semibold mt-1">
                        {credit.minAPRPercent}% - {credit.maxAPRPercent}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        // TODO: Auto-fill borrow form with this credit line
                        console.log('Selected credit line:', credit);
                      }}
                    >
                      Use This Credit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Token</label>
                <TokenSelector 
                  selectedToken={selectedToken?.symbol}
                  onTokenSelect={(token) => setSelectedToken(token)}
                  className="mb-4"
                />
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
                    {selectedToken?.symbol || 'Token'}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Credit Limit:</span>
                <span className="font-mono text-slate-300">$0.00</span>
              </div>
              
              <TransactionButton
                onExecute={handleBorrow}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!borrowAmount || !selectedLender || !selectedToken}
              >
                Create Loan
              </TransactionButton>
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


    </div>
  );
}
