import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionModal } from '@/components/TransactionModal';
import { TokenSelector } from '@/components/TokenSelector';
import { TransactionButton } from '@/components/TransactionButton';
import { useToast } from '@/hooks/use-toast';

import { useDebtVault } from '@/hooks/useDebtVault';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { usePoolPosition } from '@/hooks/usePoolPosition';
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
  const [transactionData, setTransactionData] = useState<any>(null);
  
  const { toast } = useToast();
  
  // Get real token balance from blockchain
  const { balance, formattedBalance, isLoading: isBalanceLoading, refetch: refetchBalance } = useTokenBalance(selectedToken || undefined);
  const { balance: withdrawBalance, formattedBalance: formattedWithdrawBalance, isLoading: isWithdrawBalanceLoading, refetch: refetchWithdrawBalance } = useTokenBalance(selectedWithdrawToken || undefined);
  
  // Get pool position data from contract
  const { tokenBalances, totalDeposited, availableForLending, currentlyLent, totalInterestEarned, invalidatePoolData } = usePoolPosition();

  const handleDeposit = async () => {
    if (!depositAmount || !address || !selectedToken) return;
    
    try {
      const amount = parseUnits(depositAmount, selectedToken.decimals);
      await deposit(selectedToken.address, amount);
      setDepositAmount('');
      
      // Show success toast
      toast({
        title: "Deposit Successful",
        description: `Successfully deposited ${depositAmount} ${selectedToken.symbol}`,
      });
      
      // Refresh balances and pool data
      setTimeout(() => {
        invalidatePoolData();
        refetchBalance();
      }, 2000);
    } catch (error) {
      console.error('Deposit failed:', error);
      throw error; // Let TransactionButton handle the error display
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !address || !selectedWithdrawToken) return;
    
    try {
      const amount = parseUnits(withdrawAmount, selectedWithdrawToken.decimals);
      await withdraw(selectedWithdrawToken.address, amount);
      setWithdrawAmount('');
      
      // Show success toast
      toast({
        title: "Withdrawal Successful", 
        description: `Successfully withdrew ${withdrawAmount} ${selectedWithdrawToken.symbol}`,
      });
      
      // Refresh balances and pool data
      setTimeout(() => {
        invalidatePoolData();
        refetchWithdrawBalance();
      }, 2000);
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
        <Button className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700">
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
                  >
                    Deposit Tokens
                  </TransactionButton>
                </TabsContent>
                
                <TabsContent value="withdraw" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Token</label>
                    <TokenSelector 
                      selectedToken={selectedWithdrawToken?.symbol}
                      onTokenSelect={(token) => setSelectedWithdrawToken(token)}
                      className="mb-4"
                    />
                  </div>
                  
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
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Deposited:</span>
                  <span className="font-mono">${totalDeposited.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available for Lending:</span>
                  <span className="font-mono text-green-400">${availableForLending.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Currently Lent:</span>
                  <span className="font-mono text-blue-400">${currentlyLent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Interest Earned:</span>
                  <span className="font-mono text-blue-400">${totalInterestEarned.toFixed(2)}</span>
                </div>
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
            <span className="text-sm text-slate-400">0 active</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No credit lines yet</p>
            <p className="text-sm text-slate-500 mt-1">Set up credit lines with borrowers to start earning interest</p>
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create First Credit Line
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loan Portfolio */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Active Loans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No active loans</p>
            <p className="text-sm text-slate-500 mt-1">Your lending activity will appear here</p>
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
        isLoading={isDepositLoading}
      />
    </div>
  );
}
