import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';

// Hemi network configuration
const hemiNetwork = {
  id: 43111,
  name: 'Hemi Network',
  network: 'hemi',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hemi.network/rpc'],
    },
    public: {
      http: ['https://rpc.hemi.network/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Hemi Explorer', url: 'https://blockscout.hemi.network' },
  },
};

const DEBT_VAULT_ADDRESS = '0x72F6185DcBb9c8415f01003ACc872f08B44FC292';
const DEBT_VAULT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "loanById",
    "outputs": [
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "principal", "type": "uint256"},
      {"internalType": "uint256", "name": "repaidPrincipal", "type": "uint256"},
      {"internalType": "uint256", "name": "forgivenPrincipal", "type": "uint256"},
      {"internalType": "uint256", "name": "apr", "type": "uint256"},
      {"internalType": "uint64", "name": "startTimestamp", "type": "uint64"},
      {"internalType": "uint64", "name": "lastPaymentTimestamp", "type": "uint64"},
      {"internalType": "bool", "name": "closed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const TOKENS = [
  { symbol: 'VCRED', address: '0x71881974e96152643C74A8e0214B877CfB2A0Aa1', decimals: 6 },
  { symbol: 'USDC', address: '0x2bA3a0a35E97e4A8354E83ecCFa1c6a69B0ED5Ab', decimals: 6 },
  { symbol: 'USDT', address: '0x87F8f8C38CdD17a88aC81FdDD95A3e9a4c6Ad0Fd', decimals: 6 },
];

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple test endpoint
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working', timestamp: new Date().toISOString() });
  });

  // API endpoint to check user's loans
  app.get('/api/loans/:address', async (req, res) => {
    console.log('API Request received for address:', req.params.address);
    try {
      const userAddress = req.params.address;
      
      // Create public client for Hemi network
      const publicClient = createPublicClient({
        chain: hemiNetwork,
        transport: http(),
      });

      // Get all LoanCreated events
      const logs = await publicClient.getLogs({
        address: DEBT_VAULT_ADDRESS,
        event: parseAbiItem('event LoanCreated(uint256 indexed loanId, address indexed lender, address indexed borrower, address token, uint256 principal, uint256 interestRate)'),
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const userLoans = [];

      // Process each loan to check NFT ownership
      for (const log of logs) {
        const { loanId } = log.args;
        if (!loanId) continue;

        try {
          // Check who owns this NFT (current borrower)
          const nftOwner = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'ownerOf',
            args: [loanId],
          });

          // Only include loans owned by the requested user
          if ((nftOwner as string).toLowerCase() !== userAddress.toLowerCase()) {
            continue;
          }

          // Get full loan details
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'loanById',
            args: [loanId],
          });

          const [borrower, lender, token, principal, repaidPrincipal, forgivenPrincipal, apr, startTimestamp, lastPaymentTimestamp, isClosed] = loanData as [string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, boolean];

          // Skip closed loans
          if (isClosed) continue;

          // Find token info
          const tokenInfo = TOKENS.find(t => t.address.toLowerCase() === token.toLowerCase());
          
          userLoans.push({
            loanId: loanId.toString(),
            borrower: nftOwner,
            lender,
            token,
            tokenSymbol: tokenInfo?.symbol || 'Unknown',
            principal: principal.toString(),
            formattedPrincipal: tokenInfo ? formatUnits(principal, tokenInfo.decimals) : principal.toString(),
            apr: apr.toString(),
            aprPercent: (Number(apr) / 100).toFixed(2),
            createdAt: startTimestamp.toString(),
            createdAtDate: new Date(Number(startTimestamp) * 1000).toLocaleDateString(),
            isActive: !isClosed,
          });

        } catch (nftError) {
          // Skip if NFT doesn't exist (loan was closed and NFT burned)
          continue;
        }
      }

      res.json({
        address: userAddress,
        loans: userLoans,
        count: userLoans.length
      });

    } catch (error) {
      console.error('Error fetching loans:', error);
      res.status(500).json({ error: 'Failed to fetch loans' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
