import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useNetwork } from 'wagmi';
import { Button } from '@/components/ui/button';
import { 
  Vault, 
  Home, 
  PiggyBank, 
  HandCoins, 
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hemiNetwork } from '@/lib/hemi';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isConnected } = useAccount();
  const { chain } = useNetwork();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Lend', href: '/lend', icon: PiggyBank },
    { name: 'Borrow', href: '/borrow', icon: HandCoins },
    { name: 'Portfolio', href: '/portfolio', icon: BarChart3 },
  ];

  const isWrongNetwork = isConnected && chain?.id !== hemiNetwork.id;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Vault className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold gradient-text">
                  DebtVault
                </h1>
              </Link>
              
              {/* Network Indicator */}
              <div className={cn(
                "hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono",
                isWrongNetwork 
                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                  : "bg-green-500/10 border border-green-500/20 text-green-400"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  isWrongNetwork ? "bg-red-500" : "bg-green-500"
                )} />
                <span>
                  {isWrongNetwork ? "Wrong Network" : "Hemi Network"}
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "text-sm font-medium",
                        isActive 
                          ? "bg-slate-800 text-blue-400 border border-blue-500/20" 
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      )}
                    >
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-4">
              <ConnectButton />
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950">
            <div className="px-4 py-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start space-x-2",
                        isActive 
                          ? "bg-slate-800 text-blue-400" 
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Wrong Network Warning */}
      {isWrongNetwork && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-red-400 text-sm">
              Please switch to Hemi Network to use DebtVault
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700">
        <div className="flex items-center justify-around py-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex flex-col items-center py-2 px-3 h-auto",
                    isActive ? "text-blue-400" : "text-slate-400"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs mt-1">{item.name}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
