import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Percent,
  PlusCircle,
  Search,
  Settings,
  ArrowDownLeft,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { DEBT_VAULT_ADDRESS, hemiNetwork } from '@/lib/hemi';
import { getAllTokens } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';

interface RecentTransaction {
  type: string;
  amount: string;
  token: string;
  counterparty: string;
  timestamp: string;
  hash: string;
}

export function Dashboard() {
  const { isConnected, address } = useAccount();
  const { metrics } = usePortfolioMetrics();
  const tokens = getAllTokens();

  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  // Fetch recent transactions from blockchain events
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['recentTransactions', address],
    queryFn: async (): Promise<RecentTransaction[]> => {
      if (!address) return [];

      const transactions: RecentTransaction[] = [];

      try {
        // Get recent loan creation events
        const loanLogs = await publicClient.getLogs({
          address: DEBT_VAULT_ADDRESS,
          event: parseAbiItem('event LoanCreated(uint256 indexed loanId, address indexed lender, address indexed borrower, address token, uint256 amount, uint256 apr)'),
          args: {
            lender: address,
          },
          fromBlock: 'earliest',
          toBlock: 'latest',
        });

        for (const log of loanLogs.slice(-5)) { // Last 5 transactions
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === log.args.token?.toLowerCase());
          const amount = log.args.amount ? Number(log.args.amount) / Math.pow(10, tokenInfo?.decimals || 18) : 0;
          
          transactions.push({
            type: 'Loan Created',
            amount: `${amount.toFixed(6)} ${tokenInfo?.symbol || 'ETH'}`,
            token: tokenInfo?.symbol || 'ETH',
            counterparty: `${log.args.borrower?.slice(0, 6)}...${log.args.borrower?.slice(-4)}`,
            timestamp: 'Recent',
            hash: log.transactionHash || '',
          });
        }

        // Get recent borrowing events
        const borrowLogs = await publicClient.getLogs({
          address: DEBT_VAULT_ADDRESS,
          event: parseAbiItem('event LoanCreated(uint256 indexed loanId, address indexed lender, address indexed borrower, address token, uint256 amount, uint256 apr)'),
          args: {
            borrower: address,
          },
          fromBlock: 'earliest',
          toBlock: 'latest',
        });

        for (const log of borrowLogs.slice(-3)) { // Last 3 transactions
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === log.args.token?.toLowerCase());
          const amount = log.args.amount ? Number(log.args.amount) / Math.pow(10, tokenInfo?.decimals || 18) : 0;
          
          transactions.push({
            type: 'Loan Received',
            amount: `${amount.toFixed(6)} ${tokenInfo?.symbol || 'ETH'}`,
            token: tokenInfo?.symbol || 'ETH',
            counterparty: `${log.args.lender?.slice(0, 6)}...${log.args.lender?.slice(-4)}`,
            timestamp: 'Recent',
            hash: log.transactionHash || '',
          });
        }

      } catch (error) {
        console.error('Error fetching recent transactions:', error);
      }

      return transactions.slice(-5); // Keep only the 5 most recent
    },
    enabled: !!address && isConnected,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  });

  if (!isConnected) {
    return (
      <div className="py-16 sm:py-24">
        <div 
          className="text-center space-y-8 rounded-2xl p-16"
          style={{
            backgroundImage: 'linear-gradient(rgba(15, 15, 35, 0.8), rgba(15, 15, 35, 0.8)), url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-bold gradient-text">
              Peer-to-Peer Lending with NFT Loans
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Set your own rates • Trade loan positions • No liquidations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-slate-700/50">
              <CardContent className="p-6 text-center">
                <Percent className="w-8 h-8 text-blue-400 mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">Set Your Rates</h3>
                <p className="text-slate-400">Control your lending terms and interest rates directly with borrowers</p>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/60 backdrop-blur-sm border-slate-700/50">
              <CardContent className="p-6 text-center">
                <ArrowUpRight className="w-8 h-8 text-purple-400 mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">Trade Positions</h3>
                <p className="text-slate-400">Loans are NFTs - buy, sell, and transfer your lending positions</p>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/60 backdrop-blur-sm border-slate-700/50">
              <CardContent className="p-6 text-center">
                <Settings className="w-8 h-8 text-green-400 mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">No Liquidations</h3>
                <p className="text-slate-400">Build trust-based lending relationships without forced liquidations</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button 
                  onClick={openConnectModal}
                  size="lg"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg font-semibold shadow-lg transform hover:scale-105 transition-all"
                >
                  Connect Wallet to Start
                </Button>
              )}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    );
  }

  // Connected State
  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Total Lent</h3>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-100">
                {metrics.totalLent}
              </p>
              <p className="text-sm text-green-400">Ready to lend</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Total Borrowed</h3>
              <TrendingDown className="w-4 h-4 text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-100">
                {metrics.totalBorrowed}
              </p>
              <p className="text-sm text-blue-400">Active loans</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Active Loans</h3>
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-100">
                {metrics.activeLoans}
              </p>
              <p className="text-sm text-slate-400">as lender & borrower</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Net APY</h3>
              <Percent className="w-4 h-4 text-purple-400" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-100">
                {metrics.annualizedReturn}%
              </p>
              <p className="text-sm text-purple-400">earning potential</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/lend">
              <Button className="w-full flex items-center space-x-3 p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 h-auto">
                <PlusCircle className="w-5 h-5" />
                <span className="font-medium">Lend More</span>
              </Button>
            </Link>
            
            <Link href="/borrow">
              <Button className="w-full flex items-center space-x-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 h-auto">
                <Search className="w-5 h-5" />
                <span className="font-medium">Find Credit</span>
              </Button>
            </Link>
            
            <Link href="/portfolio">
              <Button className="w-full flex items-center space-x-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 h-auto">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Manage Positions</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Role Context & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Context Indicator */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle>Viewing As</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Lender</span>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Borrower</span>
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              {parseFloat(metrics.totalLent) > 0 || parseFloat(metrics.totalBorrowed) > 0
                ? "You have positions in both roles" 
                : "Connect with lenders and borrowers to start"}
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">No recent activity</p>
                <p className="text-sm text-slate-500 mt-1">Your transactions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx, index) => (
                  <div key={`${tx.hash}-${index}`} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === 'Loan Created' ? 'bg-green-500/20' : 'bg-blue-500/20'
                      }`}>
                        {tx.type === 'Loan Created' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.type}</p>
                        <p className="text-xs text-slate-400">{tx.counterparty}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        tx.type === 'Loan Created' ? 'text-green-400' : 'text-blue-400'
                      }`}>
                        {tx.amount}
                      </p>
                      <p className="text-xs text-slate-400">{tx.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
