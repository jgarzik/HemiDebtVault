import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { TRANSACTION_CONFIG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionModal } from '@/components/TransactionModal';
import { TokenSelector } from '@/components/TokenSelector';
import { TransactionButton } from '@/components/TransactionButton';
import { CreditLineModal } from '@/components/CreditLineModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

import { useDebtVault } from '@/hooks/useDebtVault';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { usePoolPosition } from '@/hooks/usePoolPosition';
import { useCreditLines } from '@/hooks/useCreditLines';
import { useLoans } from '@/hooks/useLoans';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { Edit2, Eye, X, TrendingUp, Plus } from 'lucide-react';
import { parseUnits } from 'viem';
import { type Token, getAllTokens } from '@/lib/tokens';

export function Lend() {
  const { address } = useAccount();
  const { deposit, withdraw, updateCreditLine, isDepositLoading, isUpdateCreditLoading } = useDebtVault();
  
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedWithdrawToken, setSelectedWithdrawToken] = useState<Token | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState('deposit');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCreditLineModal, setShowCreditLineModal] = useState(false);
  const [showLoanDetailsModal, setShowLoanDetailsModal] = useState(false);
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<any>(null);
  const [transactionData, setTransactionData] = useState<any>(null);
  
  const { toast } = useToast();
  
  // Get real token balance from blockchain
  const { balance, formattedBalance, isLoading: isBalanceLoading, refetch: refetchBalance } = useTokenBalance(selectedToken || undefined);
  const { balance: withdrawBalance, formattedBalance: formattedWithdrawBalance, isLoading: isWithdrawBalanceLoading, refetch: refetchWithdrawBalance } = useTokenBalance(selectedWithdrawToken || undefined);
  
  // Get pool position data from contract
  const { tokenBalances, totalDeposited, availableForLending, currentlyLent, totalInterestEarned, invalidatePoolData } = usePoolPosition();
  
  // Get credit lines data
  const { creditLines, isLoading: isCreditLinesLoading, refetch: refetchCreditLines } = useCreditLines();
  
  // Get loans data
  const { loans, isLoading: isLoansLoading } = useLoans();

  // Data refresh function for after successful transactions
  const refreshAllData = () => {
    console.log('Refreshing all lend page data...');
    invalidatePoolData();
    refetchBalance();
    refetchWithdrawBalance();
    refetchCreditLines();
  };

  const handleDeposit = async () => {
    if (!depositAmount || !address || !selectedToken) return '';
    
    try {
      const amount = parseUnits(depositAmount, selectedToken.decimals);
      const hash = await deposit(selectedToken.address, amount);
      setDepositAmount('');
      return hash;
    } catch (error) {
      console.error('Deposit failed:', error);
      throw error; // Let TransactionButton handle the error display
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !address || !selectedWithdrawToken) return '';
    
    try {
      const amount = parseUnits(withdrawAmount, selectedWithdrawToken.decimals);
      const hash = await withdraw(selectedWithdrawToken.address, amount);
      setWithdrawAmount('');
      return hash;
    } catch (error) {
      console.error('Withdraw failed:', error);
      throw error;
    }
  };

  const confirmTransaction = async () => {
    try {
      if (deposit && depositAmount && selectedToken) {
        const amount = parseUnits(depositAmount, selectedToken.decimals);
        await deposit(selectedToken.address, amount);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setShowTransactionModal(false);
    }
  };

  const setMaxAmount = () => {
    if (formattedBalance) {
      setDepositAmount(formattedBalance);
    }
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lend</h1>
          <p className="text-slate-400 mt-1">Manage your lending positions and credit lines</p>
        </div>
        <Button 
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowCreditLineModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Credit Line
        </Button>
      </div>



      {/* Deposit Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Liquidity Pool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deposit Interface */}
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-900">
                  <TabsTrigger value="deposit">Deposit</TabsTrigger>
                  <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                </TabsList>
                
                <TabsContent value="deposit" className="space-y-4">
                  <TokenSelector
                    selectedToken={selectedToken?.address}
                    onTokenSelect={setSelectedToken}
                    className="bg-slate-900 border-slate-600"
                  />
                  
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="0.0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="bg-slate-900 border-slate-600 text-lg font-mono pr-16"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={setMaxAmount}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-7 px-3 bg-blue-500/20 text-blue-400 border-blue-500/20"
                    >
                      MAX
                    </Button>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Available Balance:</span>
                    <span className="font-mono text-slate-300">
                      {isBalanceLoading ? 'Loading...' : selectedToken ? `${Number(formattedBalance).toFixed(4)} ${selectedToken.symbol}` : '0.0000'}
                    </span>
                  </div>
                  
                  <TransactionButton
                    onExecute={handleDeposit}
                    className="w-full bg-green-500 hover:bg-green-600"
                    disabled={!depositAmount || !selectedToken}
                    requiresApproval={selectedToken && depositAmount ? {
                      token: selectedToken,
                      amount: depositAmount,
                      spenderAddress: DEBT_VAULT_ADDRESS
                    } : undefined}
                    actionLabel="Deposit"
                    transactionAmount={selectedToken && depositAmount ? `${depositAmount} ${selectedToken.symbol}` : undefined}
                    onSuccess={() => {
                      setTimeout(() => {
                        refreshAllData();
                      }, 2000);
                    }}
                  >
                    Deposit Tokens
                  </TransactionButton>
                </TabsContent>
                
                <TabsContent value="withdraw" className="space-y-4">
                  <TokenSelector 
                    selectedToken={selectedWithdrawToken?.address}
                    onTokenSelect={(token) => setSelectedWithdrawToken(token)}
                    className="bg-slate-900 border-slate-600"
                  />
                  
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="0.0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="bg-slate-900 border-slate-600 text-lg font-mono pr-16"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedWithdrawToken) {
                          const depositedBalance = tokenBalances.find((tb: any) => tb.token.address === selectedWithdrawToken.address)?.formattedBalance || '0';
                          setWithdrawAmount(depositedBalance);
                        }
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-7 px-3 bg-red-500/20 text-red-400 border-red-500/20"
                    >
                      MAX
                    </Button>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Available to Withdraw:</span>
                    <span className="font-mono text-slate-300">
                      {selectedWithdrawToken ? 
                        `${(tokenBalances.find((tb: any) => tb.token.address === selectedWithdrawToken.address)?.formattedBalance || '0')} ${selectedWithdrawToken.symbol}` 
                        : '0.0000'}
                    </span>
                  </div>
                  
                  <TransactionButton
                    onExecute={handleWithdraw}
                    className="w-full bg-red-500 hover:bg-red-600"
                    disabled={!withdrawAmount || !selectedWithdrawToken}
                    actionLabel="Withdraw"
                    transactionAmount={selectedWithdrawToken && withdrawAmount ? `${withdrawAmount} ${selectedWithdrawToken.symbol}` : undefined}
                    onSuccess={() => {
                      setTimeout(() => {
                        refreshAllData();
                      }, 2000);
                    }}
                  >
                    Withdraw Tokens
                  </TransactionButton>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Pool Stats */}
            <div className="space-y-4">
              <h3 className="font-semibold">Your Pool Position</h3>
              <div className="space-y-3">
                {tokenBalances && tokenBalances.length > 0 ? (
                  tokenBalances
                    .filter((balance: any) => parseFloat(balance.formattedBalance) > 0) // Hide zero balances
                    .map((balance: any, index: number) => (
                      <div key={index} className="space-y-2 p-3 bg-slate-900 rounded">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">{balance.token.symbol}:</span>
                          <span className="font-mono text-slate-200">{balance.formattedBalance}</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-4">
                    <span className="text-slate-500">No tokens deposited</span>
                  </div>
                )}
                {tokenBalances && tokenBalances.filter((balance: any) => parseFloat(balance.formattedBalance) > 0).length === 0 && (
                  <div className="text-center py-4">
                    <span className="text-slate-500">No tokens deposited</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Credit Lines */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Credit Lines</CardTitle>
            <span className="text-sm text-slate-400">{creditLines.length} active</span>
          </div>
        </CardHeader>
        <CardContent>
          {isCreditLinesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-slate-400">Loading credit lines...</p>
            </div>
          ) : creditLines.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No credit lines yet</p>
              <p className="text-sm text-slate-500 mt-1">Set up credit lines with borrowers to start earning interest</p>
              <Button 
                className="mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowCreditLineModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Credit Line
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {creditLines.map((creditLine, index) => (
                <div key={`${creditLine.borrower}-${creditLine.token}`} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-slate-200">
                        {creditLine.tokenSymbol} Credit Line
                      </span>
                    </div>
                    <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                      Active
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Borrower:</span>
                      <p className="font-mono text-slate-200 mt-1">
                        {creditLine.borrower.slice(0, 6)}...{creditLine.borrower.slice(-4)}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Credit Limit:</span>
                      <p className="text-blue-400 font-semibold mt-1">
                        {parseFloat(creditLine.formattedCreditLimit).toLocaleString()} {creditLine.tokenSymbol}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Utilization:</span>
                      <div className="mt-1">
                        <p className="text-yellow-400 font-semibold">
                          {parseFloat(creditLine.formattedUtilisedCredit).toLocaleString()} {creditLine.tokenSymbol}
                        </p>
                        <p className="text-xs text-slate-500">
                          {creditLine.utilizationPercent}% used
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">APR Range:</span>
                      <p className="text-green-400 font-semibold mt-1">
                        {creditLine.minAPRPercent}% - {creditLine.maxAPRPercent}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Portfolio */}
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
        isLoading={isDepositLoading}
      />

      {/* Active Loans */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Loans</CardTitle>
            <span className="text-sm text-slate-400">{loans.length} active</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoansLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-slate-400">Loading loans...</p>
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No active loans</p>
              <p className="text-sm text-slate-500 mt-1">Your loans will appear here once borrowers use your credit lines</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => (
                <div key={loan.loanId.toString()} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-slate-200">
                        Loan #{loan.loanId.toString()} - {loan.tokenSymbol}
                      </span>
                    </div>
                    <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
                      Active
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Borrower:</span>
                      <p className="font-mono text-slate-200 mt-1">
                        {loan.borrower.slice(0, 6)}...{loan.borrower.slice(-4)}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Outstanding Balance:</span>
                      <p className="text-red-400 font-semibold mt-1">
                        {parseFloat(loan.formattedOutstandingBalance).toLocaleString()} {loan.tokenSymbol}
                      </p>

                    </div>
                    
                    <div>
                      <span className="text-slate-400">Interest Earned:</span>
                      <p className="text-green-400 font-semibold mt-1">
                        {loan.formattedTotalInterestEarned ? parseFloat(loan.formattedTotalInterestEarned).toLocaleString() : '0'} {loan.tokenSymbol}
                      </p>
                      <p className="text-xs text-slate-500">{loan.interestRatePercent}% APR</p>
                    </div>
                    
                    <div>
                      <span className="text-slate-400">Created:</span>
                      <p className="text-slate-300 mt-1">
                        {loan.createdAtDate}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      onClick={() => {
                        setSelectedLoanForDetails(loan);
                        setShowLoanDetailsModal(true);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Line Modal */}
      <CreditLineModal
        isOpen={showCreditLineModal}
        onClose={() => setShowCreditLineModal(false)}
      />

      {/* Loan Details Modal */}
      <Dialog open={showLoanDetailsModal} onOpenChange={setShowLoanDetailsModal}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              Loan Details - #{selectedLoanForDetails?.loanId.toString()}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLoanForDetails && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-300">Loan Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Loan ID:</span>
                      <span className="font-mono text-slate-200">#{selectedLoanForDetails.loanId.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Token:</span>
                      <span className="font-mono text-slate-200">{selectedLoanForDetails.tokenSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-green-400">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Created:</span>
                      <span className="text-slate-200">{selectedLoanForDetails.createdAtDate}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-300">Counterparty</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Borrower:</span>
                      <span className="font-mono text-slate-200">
                        {selectedLoanForDetails.borrower.slice(0, 8)}...{selectedLoanForDetails.borrower.slice(-6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Full Address:</span>
                      <span className="font-mono text-xs text-slate-400 break-all">
                        {selectedLoanForDetails.borrower}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-300">Complete Financial Summary</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-400 mb-1">Outstanding Principal</p>
                        <p className="text-2xl font-bold text-orange-400">
                          {parseFloat(selectedLoanForDetails.formattedOutstandingPrincipal).toLocaleString()} {selectedLoanForDetails.tokenSymbol}
                        </p>

                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-400 mb-1">Accrued Interest</p>
                        <p className="text-2xl font-bold text-green-400">
                          {parseFloat(selectedLoanForDetails.formattedAccruedInterest).toLocaleString()} {selectedLoanForDetails.tokenSymbol}
                        </p>

                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-slate-900 border-slate-700">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-slate-400 mb-1">Total Outstanding Balance</p>
                      <p className="text-3xl font-bold text-red-400">
                        {parseFloat(selectedLoanForDetails.formattedOutstandingBalance).toLocaleString()} {selectedLoanForDetails.tokenSymbol}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Outstanding Principal + Accrued Interest</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-400 mb-1">Original Principal</p>
                        <p className="text-xl font-bold text-blue-400">
                          {parseFloat(selectedLoanForDetails.formattedPrincipal).toLocaleString()} {selectedLoanForDetails.tokenSymbol}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-400 mb-1">Repaid Principal</p>
                        <p className="text-xl font-bold text-slate-300">
                          {parseFloat(selectedLoanForDetails.formattedRepaidPrincipal).toLocaleString()} {selectedLoanForDetails.tokenSymbol}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-400 mb-1">Accrued Interest Earned</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {parseFloat(selectedLoanForDetails.formattedAccruedInterest).toLocaleString()} {selectedLoanForDetails.tokenSymbol}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Your earnings so far</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-400 mb-1">Interest Rate</p>
                        <p className="text-2xl font-bold text-green-400">
                          {selectedLoanForDetails.interestRatePercent}%
                        </p>
                        <p className="text-xs text-slate-500">Annual APR</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {parseFloat(selectedLoanForDetails.formattedForgivenPrincipal) > 0 && (
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-slate-400 mb-1">Forgiven Principal</p>
                        <p className="text-xl font-bold text-orange-400">
                          {parseFloat(selectedLoanForDetails.formattedForgivenPrincipal).toLocaleString()} {selectedLoanForDetails.tokenSymbol}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Amount written off</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Payment History */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-300">Payment Information</h4>
                <Card className="bg-slate-900 border-slate-700">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Payment:</span>
                        <span className="text-slate-200">{selectedLoanForDetails.lastPaymentDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Loan Duration:</span>
                        <span className="text-slate-200">
                          {Math.floor((Date.now() - Number(selectedLoanForDetails.createdAt) * 1000) / (1000 * 60 * 60 * 24))} days
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <Button 
                  variant="outline" 
                  onClick={() => setShowLoanDetailsModal(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedLoanForDetails.borrower);
                    toast({
                      title: "Address Copied",
                      description: "Borrower address copied to clipboard",
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Copy Borrower Address
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
