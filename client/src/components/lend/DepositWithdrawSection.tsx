import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TokenSelector } from '@/components/TokenSelector';
import { TransactionButton } from '@/components/TransactionButton';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useDebtVault } from '@/hooks/useDebtVault';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { parseUnits } from 'viem';
import { type Token } from '@/lib/tokens';

interface DepositWithdrawSectionProps {
  onSuccess?: () => void;
}

export function DepositWithdrawSection({ onSuccess }: DepositWithdrawSectionProps) {
  const { deposit, withdraw } = useDebtVault();
  
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedWithdrawToken, setSelectedWithdrawToken] = useState<Token | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeTab, setActiveTab] = useState('deposit');

  // Get token balances for selected tokens
  const { balance, formattedBalance, isLoading: isBalanceLoading } = useTokenBalance(selectedToken || undefined);
  const { balance: withdrawBalance, formattedBalance: formattedWithdrawBalance, isLoading: isWithdrawBalanceLoading } = useTokenBalance(selectedWithdrawToken || undefined);

  const handleDeposit = async () => {
    if (!selectedToken || !depositAmount) return '';
    
    const amount = parseUnits(depositAmount, selectedToken.decimals);
    const txHash = await deposit(selectedToken.address, amount);
    
    // Reset form
    setDepositAmount('');
    setSelectedToken(null);
    onSuccess?.();
    
    return txHash;
  };

  const handleWithdraw = async () => {
    if (!selectedWithdrawToken || !withdrawAmount) return '';
    
    const amount = parseUnits(withdrawAmount, selectedWithdrawToken.decimals);
    const txHash = await withdraw(selectedWithdrawToken.address, amount);
    
    // Reset form
    setWithdrawAmount('');
    setSelectedWithdrawToken(null);
    onSuccess?.();
    
    return txHash;
  };

  const setMaxDepositAmount = () => {
    if (formattedBalance) {
      setDepositAmount(formattedBalance);
    }
  };

  const setMaxWithdrawAmount = () => {
    if (formattedWithdrawBalance) {
      setWithdrawAmount(formattedWithdrawBalance);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle>Liquidity Pool</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deposit/Withdraw Interface */}
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
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Amount</span>
                    <span className="text-slate-400">
                      Balance: {isBalanceLoading ? '...' : (formattedBalance || '0')} {selectedToken?.symbol}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="bg-slate-900 border-slate-600"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setMaxDepositAmount}
                      disabled={!formattedBalance || isBalanceLoading}
                      className="border-slate-600 hover:bg-slate-700"
                    >
                      Max
                    </Button>
                  </div>
                </div>

                <TransactionButton
                  onExecute={handleDeposit}
                  disabled={!selectedToken || !depositAmount || parseFloat(depositAmount) <= 0}
                  requiresApproval={selectedToken && depositAmount ? {
                    token: selectedToken,
                    amount: depositAmount,
                    spenderAddress: DEBT_VAULT_ADDRESS
                  } : undefined}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onSuccess={onSuccess}
                >
                  Deposit {selectedToken?.symbol || 'Token'}
                </TransactionButton>
              </TabsContent>

              <TabsContent value="withdraw" className="space-y-4">
                <TokenSelector
                  selectedToken={selectedWithdrawToken?.address}
                  onTokenSelect={setSelectedWithdrawToken}
                  className="bg-slate-900 border-slate-600"
                />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Amount</span>
                    <span className="text-slate-400">
                      Pool Balance: {isWithdrawBalanceLoading ? '...' : (formattedWithdrawBalance || '0')} {selectedWithdrawToken?.symbol}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="bg-slate-900 border-slate-600"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setMaxWithdrawAmount}
                      disabled={!formattedWithdrawBalance || isWithdrawBalanceLoading}
                      className="border-slate-600 hover:bg-slate-700"
                    >
                      Max
                    </Button>
                  </div>
                </div>

                <TransactionButton
                  onExecute={handleWithdraw}
                  disabled={!selectedWithdrawToken || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="w-full bg-red-600 hover:bg-red-700"
                  onSuccess={onSuccess}
                >
                  Withdraw {selectedWithdrawToken?.symbol || 'Token'}
                </TransactionButton>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}