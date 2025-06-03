import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Wallet, Plus } from 'lucide-react';
import { usePoolPosition } from '@/hooks/usePoolPosition';
import { useActiveTokens } from '@/hooks/useActiveTokens';

export function PoolOverview() {
  const { tokenBalances, totalDeposited, availableForLending, currentlyLent, totalInterestEarned } = usePoolPosition();
  const { activeTokens } = useActiveTokens();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pool Statistics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pool Overview</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 p-4 rounded-lg">
            <p className="text-sm text-slate-400">Total Deposited</p>
            <p className="text-xl font-bold">${totalDeposited}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg">
            <p className="text-sm text-slate-400">Available to Lend</p>
            <p className="text-xl font-bold text-green-400">${availableForLending}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg">
            <p className="text-sm text-slate-400">Currently Lent</p>
            <p className="text-xl font-bold text-blue-400">${currentlyLent}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg">
            <p className="text-sm text-slate-400">Interest Earned</p>
            <p className="text-xl font-bold text-yellow-400">${totalInterestEarned}</p>
          </div>
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Token Balances</h3>
        
        {tokenBalances.length === 0 ? (
          <div className="bg-slate-900 p-6 rounded-lg text-center">
            <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 mb-2">No active token balances</p>
            <p className="text-sm text-slate-500">
              Deposit tokens to start lending or create credit lines
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokenBalances.map((balance, index) => {
              const activeToken = activeTokens.find(t => 
                t.address.toLowerCase() === balance.token.address.toLowerCase()
              );
              const hasBalance = balance.balance > BigInt(0);
              
              return (
                <div key={`${balance.token.address}-${index}`} className="bg-slate-900 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium">{balance.token.symbol}</p>
                    <p className="text-sm text-slate-400">
                      {hasBalance ? `${balance.formattedBalance} ${balance.token.symbol}` : 'No balance'}
                    </p>
                    {activeToken && (
                      <div className="flex gap-1 mt-1">
                        {activeToken.activityTypes.map(activity => (
                          <Badge key={activity} variant="outline" className="text-xs">
                            {activity.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {hasBalance ? `${balance.formattedBalance} ${balance.token.symbol}` : '0'}
                    </p>
                    <Badge 
                      variant={hasBalance ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {hasBalance ? (
                        <>
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1" />
                          Used
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}