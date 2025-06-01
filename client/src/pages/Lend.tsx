import { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionModal } from '@/components/TransactionModal';
import { useDebtVault } from '@/hooks/useDebtVault';
import { Edit2, Eye, X, TrendingUp, Plus } from 'lucide-react';
import { formatEther, parseEther } from 'viem';

export function Lend() {
  const { address } = useAccount();
  const { deposit, withdraw, updateCreditLine, isDepositLoading, isUpdateCreditLoading } = useDebtVault();
  
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [depositAmount, setDepositAmount] = useState('');
  const [activeTab, setActiveTab] = useState('deposit');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  
  // Get token balance
  const { data: balance } = useBalance({
    address,
    token: selectedToken === 'ETH' ? undefined : '0x', // Token addresses would be real
  });

  const handleDeposit = () => {
    if (!depositAmount || !address) return;
    
    setTransactionData({
      title: 'Confirm Deposit',
      description: 'Add tokens to your lending pool',
      action: 'Deposit',
      amount: `${depositAmount} ${selectedToken}`,
      gasEstimate: '~$2.50',
    });
    setShowTransactionModal(true);
  };

  const confirmTransaction = async () => {
    try {
      if (deposit && depositAmount) {
        // This would call the actual contract function with real parameters
        await deposit();
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setShowTransactionModal(false);
    }
  };

  const setMaxAmount = () => {
    if (balance) {
      setDepositAmount(formatEther(balance.value));
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
                  <Select value={selectedToken} onValueChange={setSelectedToken}>
                    <SelectTrigger className="bg-slate-900 border-slate-600">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                      <SelectItem value="WETH">WETH</SelectItem>
                    </SelectContent>
                  </Select>
                  
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
                      {balance ? `${Number(formatEther(balance.value)).toFixed(4)} ${balance.symbol}` : '0.0000'}
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full bg-green-500 hover:bg-green-600"
                    onClick={handleDeposit}
                    disabled={!depositAmount || isDepositLoading}
                  >
                    {isDepositLoading ? 'Processing...' : 'Deposit Tokens'}
                  </Button>
                </TabsContent>
                
                <TabsContent value="withdraw" className="space-y-4">
                  <p className="text-slate-400 text-sm">Withdraw functionality will be implemented with contract integration</p>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Pool Stats */}
            <div className="space-y-4">
              <h3 className="font-semibold">Your Pool Position</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Deposited:</span>
                  <span className="font-mono">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available for Lending:</span>
                  <span className="font-mono text-green-400">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Currently Lent:</span>
                  <span className="font-mono text-blue-400">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Interest Earned:</span>
                  <span className="font-mono text-blue-400">$0.00</span>
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
