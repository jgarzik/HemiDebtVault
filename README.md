# DebtVault - Decentralized P2P Lending Platform

A cutting-edge peer-to-peer lending protocol on Hemi Network where loans are represented as tradeable NFTs, enabling a secondary market for debt instruments while maintaining borrower accountability.

## 🏗️ System Architecture

**Frontend**: React + TypeScript + Vite  
**Blockchain**: Hemi Network (Chain ID: 43111)  
**Smart Contract**: `0x72F6185DcBb9c8415f01003ACc872f08B44FC292`  
**Wallet Integration**: RainbowKit + Wagmi  
**State Management**: TanStack Query with intelligent caching  

## 🎯 Core Features

### Credit Line System
- **Personalized Credit**: Lenders configure custom borrowing limits and APR ranges per borrower/token pair
- **Dynamic Interest Rates**: APR varies with utilization using linear interpolation between min/max rates
- **Token-Specific Terms**: Each ERC20 token has independent credit configurations
- **Credit Isolation**: Lender/borrower/token combinations maintain separate credit terms

### NFT-Based Loans
- **ERC721 Loan Tokens**: Every loan becomes a tradeable NFT upon creation
- **Secondary Market**: NFT owners can trade loan positions while preserving borrower obligations
- **Dual Identity System**: Original borrower remains tied to credit utilization; current NFT owner handles repayment
- **Transfer Safety**: NFT transfers cannot manipulate credit utilization or bypass loan limits

### Interest & Repayment Model
- **Simple Interest**: `Interest = (principal × APR × days) ÷ (365 × 10000)`
- **APR Range**: 0.01% to 100% annually (1-10000 basis points)
- **Flexible Repayment**: No maturity dates or liquidations - borrowers control timing
- **Utilization-Based Pricing**: Higher credit utilization leads to higher interest rates

### Lender Tools
- **Liquidity Pool**: Deposit tokens to enable automated lending
- **Credit Line Management**: Set borrowing limits and interest rate ranges
- **Principal Forgiveness**: Option to forgive outstanding principal amounts
- **Interest Forgiveness**: Reset accrued interest on active loans

## 🛡️ Security Features

- **Reentrancy Protection**: All external calls use CEI pattern with nonReentrant guards
- **Overflow Protection**: Safe arithmetic for all interest calculations
- **Anti-Spam Protection**: Global loan count limits prevent DoS attacks
- **Standard ERC20 Only**: No support for fee-on-transfer or rebasing tokens

## 💰 Economic Model

- **Zero Platform Fees**: Pure peer-to-peer lending without protocol revenue
- **Utilization-Based Pricing**: Interest rates increase with borrowing activity
- **Market-Driven Rates**: Lenders compete by offering attractive terms
- **NFT Liquidity Premium**: Secondary market enables instant loan position exits

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Hemi Network wallet (MetaMask compatible)
- Test tokens from Hemi faucet

### Installation
```bash
npm install
npm run dev
```

### Environment Setup
The application connects to Hemi Network mainnet by default:
- **RPC Endpoint**: `https://rpc.hemi.network/rpc`
- **Chain ID**: 43111
- **Contract**: `0x72F6185DcBb9c8415f01003ACc872f08B44FC292`

## 📱 Application Features

### For Lenders
1. **Deposit Tokens**: Add liquidity to enable lending across multiple borrowers
2. **Create Credit Lines**: Set personalized borrowing terms for specific users
3. **Monitor Loans**: Track active loans with real-time interest accrual
4. **Manage Positions**: Transfer loan NFTs or forgive debt as needed

### For Borrowers  
1. **View Available Credit**: See all credit lines offered by various lenders
2. **Borrow Against Credit**: Draw funds up to established credit limits
3. **Flexible Repayment**: Pay back principal and interest at your own pace
4. **Track Utilization**: Monitor credit usage across different lenders

### For Traders
1. **Secondary Market**: Buy/sell loan NFTs representing debt positions
2. **Yield Opportunities**: Acquire performing loans for steady returns
3. **Risk Assessment**: Evaluate borrower history and loan performance
4. **Portfolio Diversification**: Trade across different borrowers and token types

## 🔧 Technical Implementation

### Smart Contract Functions
- `deposit(token, amount)` - Add tokens to lending pool
- `withdraw(token, amount)` - Remove available tokens
- `updateCreditLine()` - Configure borrower credit terms
- `borrow(lender, token, amount)` - Create new loan
- `repay(loanId, amount)` - Make loan payments
- `getOutstandingBalance(loanId)` - Check current debt

### Frontend Architecture
- **Modular Components**: Separated lending, borrowing, and portfolio sections
- **Smart Caching**: TanStack Query optimizes blockchain data fetching
- **Transaction Flow**: Consistent wallet → network → approval → execution pattern
- **Real-time Updates**: Automatic data refresh after transactions

### Blockchain Integration
- **Wagmi Hooks**: Type-safe Ethereum interactions
- **Event-Driven Updates**: Listen for contract events to update UI
- **Error Handling**: Graceful failure handling with user feedback
- **Gas Optimization**: Efficient contract calls and batching

## 📊 Supported Tokens

The platform works with standard ERC20 tokens including:
- **WETH**: Wrapped Ethereum
- **USDC**: USD Coin  
- **USDT**: Tether USD
- **DAI**: MakerDAO Stablecoin
- **Custom Tokens**: Any standard ERC20 can be added

## 🔍 Contract Verification

View the deployed contract on Hemi Network:
- **Address**: `0x72F6185DcBb9c8415f01003ACc872f08B44FC292`
- **Network**: Hemi (43111)
- **Standard**: ERC721 (NFT) + Custom Lending Logic

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## ⚠️ Disclaimer

This is experimental DeFi software. Users are responsible for understanding the risks involved in peer-to-peer lending, including but not limited to:
- Smart contract risk
- Counterparty risk  
- Market volatility
- Regulatory uncertainty

Always conduct your own research and never invest more than you can afford to lose.