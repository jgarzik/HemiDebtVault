import { useState } from 'react';
import { useAccount, useBlockNumber } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useETHBalance } from '@/hooks/useETHBalance';

export function NetworkTest() {
  const { address, isConnected } = useAccount();
  const { data: blockNumber } = useBlockNumber({
    watch: false,
    query: { refetchInterval: 5000 }
  });
  const { balance, formatted, isLoading, error } = useETHBalance();

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="bg-slate-800 border-slate-700 mb-6">
      <CardHeader>
        <CardTitle className="text-sm">Network Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Wallet Address:</span>
          <span className="font-mono text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Latest Block:</span>
          <span className="font-mono">{blockNumber?.toString() || 'Loading...'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">ETH Balance:</span>
          <span className="font-mono">
            {isLoading ? 'Loading...' : error ? 'Error' : `${Number(formatted).toFixed(4)} ETH`}
          </span>
        </div>
        {error && (
          <div className="text-red-400 text-xs">
            Connection Error: Check if wallet is on Hemi network
          </div>
        )}
      </CardContent>
    </Card>
  );
}