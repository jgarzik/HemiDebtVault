import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionModal } from '@/components/TransactionModal';
import { useDebtVault } from '@/hooks/useDebtVault';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  FileText,
  Settings,
  History,
  MessageCircle,
  BarChart3
} from 'lucide-react';

export function Portfolio() {
  const { address } = useAccount();
  const { portfolioStats } = useDebtVault();
  
  const [selectedLoanForTransfer, setSelectedLoanForTransfer] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);

  const handleTransferNFT = () => {
    if (!selectedLoanForTransfer || !transferRecipient) return;
    
    setTransactionData({
      title: 'Transfer Loan NFT',
      description: 'Transfer loan position to another address',
      action: 'Transfer NFT',
      amount: `Loan #${selectedLoanForTransfer}`,
      gasEstimate: '~$2.10',
    });
    setShowTransactionModal(true);
  };

  const confirmTransaction = async () => {
    try {
      // This would call the actual NFT transfer function
      console.log('Transferring loan NFT...');
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setShowTransactionModal(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <p className="text-slate-400 mt-1">Comprehensive view of your lending and borrowing positions</p>
      </div>

      {/* Portfolio Overview Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* P&L Summary */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Card className="bg-green-500/10 border-green-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Interest Earned</span>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      </div>
                      <p className="text-2xl font-bold text-green-400">
                        ${portfolioStats ? (Number(portfolioStats.interestEarned) / 1e6).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-sm text-green-300">Total earned</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Interest Paid</span>
                        <TrendingDown className="w-4 h-4 text-blue-400" />
                      </div>
                      <p className="text-2xl font-bold text-blue-400">
                        ${portfolioStats ? (Number(portfolioStats.interestPaid) / 1e6).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-sm text-blue-300">Total paid</p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Net P&L</span>
                        <DollarSign className="w-4 h-4 text-blue-400" />
                      </div>
                      <p className="text-2xl font-bold text-blue-400">
                        ${portfolioStats 
                          ? ((Number(portfolioStats.interestEarned) - Number(portfolioStats.interestPaid)) / 1e6).toFixed(2) 
                          : '0.00'}
                      </p>
                      <p className="text-sm text-blue-300">Net position</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-500/10 border-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Active Loans</span>
                        <FileText className="w-4 h-4 text-purple-400" />
                      </div>
                      <p className="text-2xl font-bold text-purple-400">
                        {portfolioStats?.activeLoans || 0}
                      </p>
                      <p className="text-sm text-purple-300">Total positions</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Stats */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Avg. Utilization</span>
                <span className="font-mono">0%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Health</span>
                <span className="text-green-400 font-medium">New</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Relationship Count</span>
                <span className="font-mono">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Avg. Loan Duration</span>
                <span className="font-mono">0 days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relationship Management */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Counterparty Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No relationships established</p>
            <p className="text-sm text-slate-500 mt-1">Your lending and borrowing relationships will appear here</p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan NFT Management */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle>Loan NFT Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm mb-4">
              Transfer loan positions as NFTs to other addresses
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Loan</label>
                <Select value={selectedLoanForTransfer} onValueChange={setSelectedLoanForTransfer}>
                  <SelectTrigger className="bg-slate-900 border-slate-600">
                    <SelectValue placeholder="Choose a loan to transfer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>No loans available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Recipient Address</label>
                <Input
                  type="text"
                  placeholder="0x..."
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  className="bg-slate-900 border-slate-600 font-mono"
                />
              </div>
              
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={handleTransferNFT}
                disabled={!selectedLoanForTransfer || !transferRecipient}
              >
                Transfer Loan NFT
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Performance Analytics */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle>Performance Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Card className="bg-slate-900/50 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400">Annualized Return</span>
                    <span className="text-green-400 font-semibold">0.0%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{width: '0%'}}></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-900/50 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400">Risk Score</span>
                    <span className="text-green-400 font-semibold">Low</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-yellow-500 h-2 rounded-full" style={{width: '20%'}}></div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Yield This Month:</span>
                  <p className="font-mono text-blue-400">$0.00</p>
                </div>
                <div>
                  <span className="text-slate-400">Best Performer:</span>
                  <p className="font-mono text-green-400">None</p>
                </div>
              </div>
              
              <Button 
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Export Detailed Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
      />
    </div>
  );
}
