/**
 * Dynamic Token Selection Component
 * 
 * This component provides comprehensive token selection with custom token import
 * capabilities, real-time metadata fetching, and balance display integration.
 * 
 * Key Features:
 * - Token selection from predefined and custom token lists
 * - Real-time token metadata fetching via direct RPC calls
 * - Custom token import with automatic metadata validation
 * - Balance display integration for informed user decisions
 * - Input validation and error handling for token addresses
 * 
 * Architecture:
 * - Uses direct RPC calls for token metadata fetching
 * - Integrates with local storage for custom token persistence
 * - Provides flexible configuration for different use cases
 * - Handles edge cases like invalid addresses and missing metadata
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, AlertCircle } from 'lucide-react';
import { getAllTokens, saveCustomToken, isValidAddress, type Token } from '@/lib/tokens';
import { publicRpcClient } from '@/lib/rpcHelpers';

interface TokenSelectorProps {
  selectedToken?: string;
  onTokenSelect: (token: Token) => void;
  className?: string;
  availableTokens?: Token[];
  showImportOption?: boolean;
  tokenBalances?: { token: Token; formattedBalance: string }[];
  disabled?: boolean;
}

export function TokenSelector({ selectedToken, onTokenSelect, className, availableTokens, showImportOption = true, tokenBalances, disabled = false }: TokenSelectorProps) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  // Use filtered tokens if provided, otherwise show all tokens
  const tokensToShow = availableTokens || getAllTokens();

  // Helper function to get balance for a token
  const getTokenBalance = (token: Token) => {
    return tokenBalances?.find(tb => tb.token.address.toLowerCase() === token.address.toLowerCase())?.formattedBalance;
  };

  // Fetch token metadata for custom import
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [tokenDecimals, setTokenDecimals] = useState<number | undefined>();

  const fetchTokenMetadata = async () => {
    if (!isValidAddress(customAddress)) return;

    try {
      const [name, symbol, decimals] = await Promise.all([
        publicRpcClient.readContract({
          address: customAddress as `0x${string}`,
          abi: [{ name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] }],
          functionName: 'name',
        }),
        publicRpcClient.readContract({
          address: customAddress as `0x${string}`,
          abi: [{ name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] }],
          functionName: 'symbol',
        }),
        publicRpcClient.readContract({
          address: customAddress as `0x${string}`,
          abi: [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] }],
          functionName: 'decimals',
        })
      ]);

      setTokenName(name as string);
      setTokenSymbol(symbol as string);
      setTokenDecimals(Number(decimals));
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      setTokenName('');
      setTokenSymbol('');
      setTokenDecimals(undefined);
    }
  };

  const handleImportToken = async () => {
    if (!isValidAddress(customAddress)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    
    // Fetch token metadata first
    await fetchTokenMetadata();

    if (!tokenName || !tokenSymbol || tokenDecimals === undefined) {
      toast({
        title: "Token Not Found",
        description: "Unable to fetch token metadata. Please verify the address.",
        variant: "destructive",
      });
      setIsImporting(false);
      return;
    }

    try {
      const newToken: Token = {
        symbol: tokenSymbol,
        address: customAddress as `0x${string}`,
        decimals: tokenDecimals,
        name: tokenName,
        isCustom: true,
      };

      saveCustomToken(newToken);
      onTokenSelect(newToken);
      
      toast({
        title: "Token Imported",
        description: `${tokenSymbol} has been added to your token list`,
      });

      setIsImportOpen(false);
      setCustomAddress('');
      setTokenName('');
      setTokenSymbol('');
      setTokenDecimals(undefined);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import token. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleTokenSelect = (value: string) => {
    if (value === 'import') {
      setIsImportOpen(true);
      return;
    }

    const token = tokensToShow.find(t => t.address === value);
    if (token) {
      onTokenSelect(token);
    }
  };

  const selectedTokenObj = tokensToShow.find(t => t.address === selectedToken);

  return (
    <>
      <Select value={selectedToken} onValueChange={handleTokenSelect} disabled={disabled}>
        <SelectTrigger className={className}>
          {selectedTokenObj ? (
            <div className="flex items-center space-x-2">
              <span className="font-medium">{selectedTokenObj.symbol}</span>
              {selectedTokenObj.isCustom && (
                <span className="text-xs text-slate-500 bg-slate-700 px-1 rounded">Custom</span>
              )}
            </div>
          ) : (
            <SelectValue placeholder="Select token" />
          )}
        </SelectTrigger>
        <SelectContent>
          {tokensToShow.map((token) => {
            const balance = getTokenBalance(token);
            return (
              <SelectItem key={token.address} value={token.address}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{token.symbol}</span>
                    {token.isCustom && (
                      <span className="text-xs text-slate-500 bg-slate-700 px-1 rounded">Custom</span>
                    )}
                  </div>
                  {balance && (
                    <span className="text-sm text-slate-400 font-mono ml-4">{balance}</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
          {showImportOption && (
            <SelectItem value="import">
              <div className="flex items-center space-x-2 text-blue-400">
                <Plus className="w-4 h-4" />
                <span>Import custom token</span>
              </div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Import Custom Token</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-300">Token Contract Address</Label>
              <Input
                id="address"
                type="text"
                placeholder="0x..."
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                className="bg-slate-800 border-slate-600 font-mono"
              />
              {customAddress && !isValidAddress(customAddress) && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Invalid address format</span>
                </div>
              )}
            </div>

            {isValidAddress(customAddress) && (
              <div className="space-y-3 p-3 bg-slate-800 rounded-lg">
                <h4 className="text-sm font-medium text-slate-300">Token Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name:</span>
                    <span className="text-slate-200">{tokenName || 'Loading...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Symbol:</span>
                    <span className="text-slate-200">{tokenSymbol || 'Loading...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Decimals:</span>
                    <span className="text-slate-200">{tokenDecimals?.toString() || 'Loading...'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsImportOpen(false)}
                className="flex-1 border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportToken}
                disabled={!isValidAddress(customAddress) || !tokenName || !tokenSymbol || tokenDecimals === undefined || isImporting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isImporting ? 'Importing...' : 'Import Token'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}