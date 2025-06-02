import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { usePoolPosition } from '@/hooks/usePoolPosition';

export function PoolOverview() {
  const { tokenBalances, totalDeposited, availableForLending, currentlyLent, totalInterestEarned } = usePoolPosition();

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
            <p className="text-slate-400">No tokens deposited yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokenBalances.map((balance, index) => (
              <div key={`${balance.token.address}-${index}`} className="bg-slate-900 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium">{balance.token.symbol}</p>
                  <p className="text-sm text-slate-400">{balance.formattedBalance} {balance.token.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{balance.formattedBalance} {balance.token.symbol}</p>
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}