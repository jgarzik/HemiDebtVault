import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TokenSelector } from './TokenSelector';
import { TransactionButton } from './TransactionButton';
import { useDebtVault } from '@/hooks/useDebtVault';
import { usePoolPosition } from '@/hooks/usePoolPosition';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { parseUnits } from 'viem';
import { type Token } from '@/lib/tokens';

interface CreditLineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditLineModal({ isOpen, onClose }: CreditLineModalProps) {
  const { updateCreditLine } = useDebtVault();
  const { tokenBalances } = usePoolPosition();
  
  const [borrowerAddress, setBorrowerAddress] = useState('');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [creditLimit, setCreditLimit] = useState('');
  const [minAPR, setMinAPR] = useState('');
  const [maxAPR, setMaxAPR] = useState('');
  const [originationFee, setOriginationFee] = useState('0');

  const resetForm = () => {
    setBorrowerAddress('');
    setSelectedToken(null);
    setCreditLimit('');
    setMinAPR('');
    setMaxAPR('');
    setOriginationFee('0');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!borrowerAddress || !selectedToken || !creditLimit || !minAPR || !maxAPR) {
      return false;
    }
    
    if (!borrowerAddress.startsWith('0x') || borrowerAddress.length !== 42) {
      return false;
    }
    
    const minAPRNum = parseFloat(minAPR);
    const maxAPRNum = parseFloat(maxAPR);
    const originationFeeNum = parseFloat(originationFee);
    
    if (minAPRNum < 0 || maxAPRNum < 0 || minAPRNum > maxAPRNum) {
      return false;
    }
    
    if (originationFeeNum < 0 || originationFeeNum > 100) {
      return false;
    }
    
    return true;
  };

  const handleCreateCreditLine = async (): Promise<string> => {
    if (!selectedToken || !borrowerAddress) return '';
    
    try {
      // Convert percentage to basis points (1% = 100 basis points)
      const minAPRBps = Math.round(parseFloat(minAPR) * 100);
      const maxAPRBps = Math.round(parseFloat(maxAPR) * 100);
      const originationFeeBps = Math.round(parseFloat(originationFee) * 100);
      const creditLimitWei = parseUnits(creditLimit, selectedToken.decimals);
      
      const hash = await updateCreditLine(
        borrowerAddress,
        selectedToken.address,
        creditLimitWei,
        BigInt(minAPRBps),
        BigInt(maxAPRBps),
        BigInt(originationFeeBps)
      );
      
      handleClose();
      return hash;
    } catch (error) {
      console.error('Credit line creation failed:', error);
      throw error;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Create Credit Line</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="borrower" className="text-slate-300">
              Borrower Address
            </Label>
            <Input
              id="borrower"
              placeholder="0x..."
              value={borrowerAddress}
              onChange={(e) => setBorrowerAddress(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white"
            />
          </div>
          
          <div>
            <Label className="text-slate-300">Token</Label>
            <TokenSelector
              selectedToken={selectedToken?.address}
              onTokenSelect={setSelectedToken}
              className="bg-slate-900 border-slate-600"
              availableTokens={tokenBalances.map(tb => tb.token)}
            />
          </div>
          
          <div>
            <Label htmlFor="creditLimit" className="text-slate-300">
              Credit Limit
            </Label>
            <Input
              id="creditLimit"
              placeholder="1000"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white"
            />
            {selectedToken && (
              <p className="text-xs text-slate-400 mt-1">
                Maximum amount borrower can owe in {selectedToken.symbol}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minAPR" className="text-slate-300">
                Min APR (%)
              </Label>
              <Input
                id="minAPR"
                placeholder="5.0"
                value={minAPR}
                onChange={(e) => setMinAPR(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-400 mt-1">At 0% utilization</p>
            </div>
            
            <div>
              <Label htmlFor="maxAPR" className="text-slate-300">
                Max APR (%)
              </Label>
              <Input
                id="maxAPR"
                placeholder="15.0"
                value={maxAPR}
                onChange={(e) => setMaxAPR(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-400 mt-1">At 100% utilization</p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="originationFee" className="text-slate-300">
              Origination Fee (%)
            </Label>
            <Input
              id="originationFee"
              placeholder="0.0"
              value={originationFee}
              onChange={(e) => setOriginationFee(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-400 mt-1">
              One-time fee added to loan principal (0-100%)
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
            >
              Cancel
            </Button>
            
            <TransactionButton
              onExecute={handleCreateCreditLine}
              disabled={!validateForm()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              actionLabel="Create Credit Line"
              transactionAmount={selectedToken && creditLimit ? `${creditLimit} ${selectedToken.symbol} limit` : undefined}
            >
              Create
            </TransactionButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}