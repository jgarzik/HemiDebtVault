import { DepositWithdrawSection } from '@/components/lend/DepositWithdrawSection';
import { PoolOverview } from '@/components/lend/PoolOverview';
import { CreditLinesSection } from '@/components/lend/CreditLinesSection';
import { ActiveLoansSection } from '@/components/lend/ActiveLoansSection';
import { usePoolPosition } from '@/hooks/usePoolPosition';

export function Lend() {
  const { invalidatePoolData } = usePoolPosition();

  const handleSuccess = () => {
    console.log('Transaction successful, refreshing data...');
    invalidatePoolData();
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lend</h1>
          <p className="text-slate-400 mt-1">Manage your lending positions and credit lines</p>
        </div>
      </div>

      {/* Deposit/Withdraw Section */}
      <DepositWithdrawSection onSuccess={handleSuccess} />

      {/* Pool Overview */}
      <PoolOverview />

      {/* Credit Lines Section */}
      <CreditLinesSection />

      {/* Active Loans Section */}
      <ActiveLoansSection />
    </div>
  );
}