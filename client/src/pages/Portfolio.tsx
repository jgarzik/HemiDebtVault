import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionModal } from '@/components/TransactionModal';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import { useNFTTransfer } from '@/hooks/useNFTTransfer';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  FileText,
  Settings,
  History,
  MessageCircle,
  BarChart3,
  Users,
  Clock,
  Shield
} from 'lucide-react';

export function Portfolio() {
  const { address } = useAccount();
  const { metrics, relationships, isLoading: isMetricsLoading } = usePortfolioMetrics();
  const { transferableLoans, transferLoanNFT, isPending, isSuccess } = useNFTTransfer();
  const { toast } = useToast();
  
  const [selectedLoanForTransfer, setSelectedLoanForTransfer] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);

  const handleTransferNFT = () => {
    if (!selectedLoanForTransfer || !transferRecipient) return;
    
    const selectedLoan = transferableLoans.find(loan => loan.loanId.toString() === selectedLoanForTransfer);
    if (!selectedLoan) return;
    
    setTransactionData({
      title: 'Transfer Loan NFT',
      description: `Transfer loan #${selectedLoanForTransfer} (${selectedLoan.principal} ${selectedLoan.tokenSymbol}) to another address`,
      action: 'Transfer NFT',
      amount: `${selectedLoan.principal} ${selectedLoan.tokenSymbol}`,
      gasEstimate: '~$2.10',
    });
    setShowTransactionModal(true);
  };

  const confirmTransaction = async () => {
    try {
      if (!selectedLoanForTransfer || !transferRecipient) return;
      
      const loanId = BigInt(selectedLoanForTransfer);
      await transferLoanNFT(loanId, transferRecipient);
      
      toast({
        title: "Transfer Initiated",
        description: "Loan NFT transfer transaction has been submitted",
      });
      
      setShowTransactionModal(false);
      setSelectedLoanForTransfer('');
      setTransferRecipient('');
    } catch (error) {
      console.error('Transaction failed:', error);
      toast({
        title: "Transfer Failed",
        description: "Failed to transfer loan NFT. Please try again.",
        variant: "destructive",
      });
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
                        {metrics.interestEarned}
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
                        {metrics.interestPaid}
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
                        Net: {Object.keys(metrics.tokenBreakdown.lent).length > 0 ? 
                          Object.keys(metrics.tokenBreakdown.lent).map(token => {
                            const earned = parseFloat(metrics.tokenBreakdown.interestEarned[token] || '0');
                            const paid = parseFloat(metrics.tokenBreakdown.interestPaid[token] || '0');
                            return `${(earned - paid).toFixed(6)} ${token}`;
                          }).join(', ') : '0.000000'
                        }
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
                        {metrics.activeLoans}
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
                <span className="font-mono">{metrics.avgUtilization}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Health</span>
                <span className={`font-medium ${
                  metrics.paymentHealth === 'Good' ? 'text-green-400' :
                  metrics.paymentHealth === 'Warning' ? 'text-yellow-400' :
                  metrics.paymentHealth === 'Poor' ? 'text-red-400' :
                  'text-slate-400'
                }`}>
                  {metrics.paymentHealth}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Relationship Count</span>
                <span className="font-mono">{metrics.relationshipCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Avg. Loan Duration</span>
                <span className="font-mono">{metrics.avgLoanDuration} days</span>
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
          {relationships.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No relationships established</p>
              <p className="text-sm text-slate-500 mt-1">Your lending and borrowing relationships will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {relationships.slice(0, 5).map((relationship, index) => (
                <div key={relationship.address} className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">
                        {relationship.address.slice(0, 6)}...{relationship.address.slice(-4)}
                      </p>
                      <p className="text-xs text-slate-400">{relationship.totalLoans} loans</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-200 font-mono">{relationship.totalVolume}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        relationship.trustLevel === 'Verified' ? 'bg-green-900 text-green-300' :
                        relationship.trustLevel === 'Trusted' ? 'bg-blue-900 text-blue-300' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {relationship.trustLevel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    {transferableLoans.length === 0 ? (
                      <SelectItem value="none" disabled>No loans available</SelectItem>
                    ) : (
                      transferableLoans.map(loan => (
                        <SelectItem key={loan.loanId.toString()} value={loan.loanId.toString()}>
                          Loan #{loan.loanId.toString()} - {loan.principal} {loan.tokenSymbol}
                        </SelectItem>
                      ))
                    )}
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
                    <span className="text-green-400 font-semibold">{metrics.annualizedReturn}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" 
                      style={{width: `${Math.min(parseFloat(metrics.annualizedReturn), 100)}%`}}
                    ></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-900/50 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400">Risk Score</span>
                    <span className={`font-semibold ${
                      metrics.riskScore === 'Low' ? 'text-green-400' :
                      metrics.riskScore === 'Medium' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {metrics.riskScore}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        metrics.riskScore === 'Low' ? 'bg-gradient-to-r from-green-500 to-blue-500' :
                        metrics.riskScore === 'Medium' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-red-700'
                      }`}
                      style={{width: `${
                        metrics.riskScore === 'Low' ? '20%' :
                        metrics.riskScore === 'Medium' ? '60%' :
                        '90%'
                      }`}}
                    ></div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Monthly Yield:</span>
                  <p className="font-mono text-blue-400">{metrics.monthlyYield}%</p>
                </div>
                <div>
                  <span className="text-slate-400">Primary Token:</span>
                  <p className="font-mono text-green-400">{
                    Object.keys(metrics.tokenBreakdown.lent).length > 0 
                      ? Object.keys(metrics.tokenBreakdown.lent)[0]
                      : 'None'
                  }</p>
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
