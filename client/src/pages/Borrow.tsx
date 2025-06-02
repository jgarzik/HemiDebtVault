import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { TRANSACTION_CONFIG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionButton } from '@/components/TransactionButton';
import { RepaymentModal } from '@/components/RepaymentModal';
import { useDebtVault } from '@/hooks/useDebtVault';
import { useBorrowerCreditLines } from '@/hooks/useBorrowerCreditLines';
import { useBorrowerLoans } from '@/hooks/useLoans';
import { TokenSelector } from '@/components/TokenSelector';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { type Token, getAllTokens } from '@/lib/tokens';
import { Search, Plus, Info } from 'lucide-react';
import { parseUnits } from 'viem';

export function Borrow() {
  const { address } = useAccount();
  const { borrow, repay } = useDebtVault();
  const queryClient = useQueryClient();
  const { availableCredits, isLoading: isCreditsLoading } = useBorrowerCreditLines();
  const { borrowedLoans, isLoading: isLoansLoading } = useBorrowerLoans();
  
  const [selectedCreditLine, setSelectedCreditLine] = useState<string>('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState<any>(null);
  const allTokens = getAllTokens();

  // Extract selected credit line and token data
  const selectedCredit = selectedCreditLine ? availableCredits.find(credit => 
    `${credit.lender}-${credit.token}` === selectedCreditLine
  ) : null;

  const selectedToken = selectedCredit ? allTokens.find(t => 
    t.address.toLowerCase() === selectedCredit.token.toLowerCase()
  ) : null;

  const handleBorrow = async () => {
    if (!borrowAmount || !selectedCredit || !selectedToken) return '';
    
    try {
      const amount = parseUnits(borrowAmount, selectedToken.decimals);
      const txHash = await borrow(selectedCredit.lender as `0x${string}`, selectedCredit.token as `0x${string}`, amount);
      setBorrowAmount('');
      setSelectedCreditLine('');
      
      // Refresh data after successful transaction
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['borrowerCreditLines'] });
        queryClient.invalidateQueries({ queryKey: ['borrowedLoans'] });
      }, TRANSACTION_CONFIG.CONFIRMATION_DELAY);
      
      return txHash;
    } catch (error) {
      console.error('Borrow failed:', error);
      throw error;
    }
  };

  // Calculate APR exactly as the smart contract does
  const calculateAPR = (amount: string, creditLine: any) => {
    if (!amount || !creditLine || parseFloat(amount) === 0) return '0.00';
    
    const requestedAmount = parseFloat(amount);
    const creditLimit = parseFloat(creditLine.formattedCreditLimit);
    const utilisedCredit = parseFloat(creditLine.formattedUtilisedCredit);
    const minAPR = Number(creditLine.minAPR); // basis points
    const maxAPR = Number(creditLine.maxAPR); // basis points
    
    // Current borrowing = existing utilised credit + new requested amount
    const currentBorrowing = utilisedCredit + requestedAmount;
    
    // Solidity calculation: utilization = (currentBorrowing * PRECISION_FACTOR) / creditLimit
    // PRECISION_FACTOR is 10^18 in the contract
    const PRECISION_FACTOR = 1e18;
    const utilization = (currentBorrowing * PRECISION_FACTOR) / creditLimit;
    
    // Solidity calculation: apr = minAPR + ((utilization * (maxAPR - minAPR)) / PRECISION_FACTOR)
    const apr = minAPR + ((utilization * (maxAPR - minAPR)) / PRECISION_FACTOR);
    
    // Convert from basis points to percentage
    return (apr / 100).toFixed(2);
  };

  const calculateDailyInterest = (amount: string, apr: string) => {
    if (!amount || !apr || parseFloat(amount) === 0) return '0.000000';
    const daily = (parseFloat(amount) * parseFloat(apr)) / 100 / 365;
    return daily.toFixed(6);
  };

  // Get current calculated APR
  const currentAPR = selectedCredit ? calculateAPR(borrowAmount, selectedCredit) : '0.00';

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Borrow</h1>
          <p className="text-slate-400 mt-1">Access credit and manage your loans</p>
        </div>

      </div>

      {/* My Loans */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Loans</CardTitle>
            <span className="text-sm text-slate-400">{borrowedLoans.length} active</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoansLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-slate-400">Loading loans...</p>
            </div>
          ) : borrowedLoans.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No active loans</p>
              <p className="text-sm text-slate-500 mt-1">Your borrowed funds will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {borrowedLoans.map((loan) => (
                <div key={loan.loanId.toString()} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="font-medium text-slate-200">
                        Loan #{loan.loanId.toString()} - {loan.tokenSymbol}
                      </span>
                    </div>
                    <span className="text-xs bg-orange-900 text-orange-300 px-2 py-1 rounded">
                      Borrowed
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Lender:</span>
                      <p className="font-mono text-slate-200 mt-1">
                        {loan.lender.slice(0, 6)}...{loan.lender.slice(-4)}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Principal:</span>
                      <p className="text-orange-400 font-semibold mt-1">
                        {parseFloat(loan.formattedPrincipal).toLocaleString()} {loan.tokenSymbol}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Accrued Interest:</span>
                      <p className="text-red-400 font-semibold mt-1">
                        {loan.formattedAccruedInterest} {loan.tokenSymbol}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Interest Rate:</span>
                      <p className="text-yellow-400 font-semibold mt-1">
                        {loan.interestRatePercent}% APR
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Created:</span>
                      <p className="text-slate-300 mt-1">
                        {loan.createdAtDate}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4 gap-2">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedLoanForRepay(loan);
                        setShowRepayModal(true);
                      }}
                    >
                      Repay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Credit */}
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
                        setSelectedCreditLine(`${credit.lender}-${credit.token}`);
                        // Scroll to borrow form
                        document.getElementById('borrow-form')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Borrow
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Borrow Interface */}
      <Card id="borrow-form" className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>New Loan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loan Configuration */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Credit Line</label>
                <Select value={selectedCreditLine} onValueChange={setSelectedCreditLine}>
                  <SelectTrigger className="bg-slate-900 border-slate-600">
                    <SelectValue placeholder="Choose a credit line..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCredits.length === 0 ? (
                      <SelectItem value="none" disabled>No credit lines available</SelectItem>
                    ) : (
                      availableCredits.map((credit) => (
                        <SelectItem key={`${credit.lender}-${credit.token}`} value={`${credit.lender}-${credit.token}`}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {credit.tokenSymbol} from {credit.lender.slice(0, 6)}...{credit.lender.slice(-4)}
                            </span>
                            <span className="text-xs text-slate-400">
                              Available: {parseFloat(credit.formattedAvailableCredit).toLocaleString()} {credit.tokenSymbol} at {credit.minAPRPercent}%-{credit.maxAPRPercent}% APR
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
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
                    {selectedCredit?.tokenSymbol || 'Token'}
                  </div>
                </div>
              </div>
              
              {selectedCredit && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-400">Available Credit:</span>
                  <span className="font-mono text-green-400">
                    {parseFloat(selectedCredit.formattedAvailableCredit).toLocaleString()} {selectedCredit.tokenSymbol}
                  </span>
                </div>
              )}
              
              <TransactionButton
                onExecute={handleBorrow}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!borrowAmount || !selectedCredit}
                actionLabel="Create Loan"
                transactionAmount={borrowAmount && selectedCredit ? `${borrowAmount} ${selectedCredit.tokenSymbol}` : undefined}
                loanDetails={selectedCredit && borrowAmount ? {
                  lender: selectedCredit.lender,
                  token: selectedCredit.tokenSymbol,
                  principal: borrowAmount,
                  apr: currentAPR,
                  utilization: ((parseFloat(borrowAmount) / parseFloat(selectedCredit.formattedAvailableCredit)) * 100).toFixed(1),
                  dailyInterest: calculateDailyInterest(borrowAmount, currentAPR)
                } : undefined}
              >
                {borrowAmount && selectedCredit 
                  ? `Borrow ${borrowAmount} ${selectedCredit.tokenSymbol}` 
                  : 'Select credit line and enter amount'
                }
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
                    <span className="font-mono">{currentAPR}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Daily Interest:</span>
                    <span className="font-mono text-yellow-400">
                      {borrowAmount && selectedCredit ? calculateDailyInterest(borrowAmount, currentAPR) : '0.000000'} {selectedCredit?.tokenSymbol || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Interest:</span>
                    <span className="font-mono text-yellow-400">
                      {borrowAmount && selectedCredit ? (parseFloat(calculateDailyInterest(borrowAmount, currentAPR)) * 30).toFixed(6) : '0.000000'} {selectedCredit?.tokenSymbol || ''}
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



      {/* Repayment Modal */}
      {selectedLoanForRepay && (
        <RepaymentModal
          isOpen={showRepayModal}
          onClose={() => {
            setShowRepayModal(false);
            setSelectedLoanForRepay(null);
          }}
          onConfirm={async (amount) => {
            const token = allTokens.find(t => t.symbol === selectedLoanForRepay.tokenSymbol);
            if (!token) throw new Error('Token not found');
            
            const amountBigInt = parseUnits(amount, token.decimals);
            const txHash = await repay(selectedLoanForRepay.loanId, amountBigInt);
            
            return txHash;
          }}
          repaymentDetails={{
            loanId: selectedLoanForRepay.loanId,
            token: selectedLoanForRepay.token,
            tokenSymbol: selectedLoanForRepay.tokenSymbol,
            currentPrincipal: selectedLoanForRepay.formattedPrincipal,
            currentInterest: selectedLoanForRepay.formattedAccruedInterest,
            totalOwed: (parseFloat(selectedLoanForRepay.formattedPrincipal) + parseFloat(selectedLoanForRepay.formattedAccruedInterest)).toString()
          }}
          isLoading={false}
        />
      )}

    </div>
  );
}
