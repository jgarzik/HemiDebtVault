import { createPublicClient, http, formatUnits } from 'viem';

// Hemi mainnet configuration
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
    default: { http: ['https://rpc.hemi.network/rpc'] },
    public: { http: ['https://rpc.hemi.network/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Hemi Explorer', url: 'https://explorer.hemi.network' },
  },
};

// Token addresses and decimals
const tokens = {
  VUSD: {
    address: '0xbB0D083fb1be0A9f6157ec484b6C79E0A4e31C2e',
    symbol: 'VUSD',
    decimals: 6
  },
  VCRED: {
    address: '0x71881974e96152643C74A8e0214B877CfB2A0Aa1',
    symbol: 'VCRED', 
    decimals: 18
  }
};

// ERC-20 ABI with balanceOf and decimals
const erc20ABI = [{
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
  name: 'balanceOf',
  outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function'
}, {
  inputs: [],
  name: 'decimals',
  outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
  stateMutability: 'view',
  type: 'function'
}];

async function checkBalances() {
  const walletAddress = '0x29Aa2eD8712072e918632259780E587698Ef58df';
  
  console.log(`\n🔍 Checking balances for: ${walletAddress}`);
  console.log('━'.repeat(60));

  // Create public client
  const client = createPublicClient({
    chain: hemiNetwork,
    transport: http()
  });

  try {
    // Check ETH balance
    const ethBalance = await client.getBalance({ address: walletAddress });
    console.log(`ETH Balance: ${formatUnits(ethBalance, 18)} ETH`);

    // Check token balances and get actual decimals
    for (const [symbol, token] of Object.entries(tokens)) {
      try {
        console.log(`\n📊 Querying ${symbol}...`);
        console.log(`   Token Address: ${token.address}`);
        
        // Get actual decimals from contract
        const actualDecimals = await client.readContract({
          address: token.address,
          abi: erc20ABI,
          functionName: 'decimals',
        });
        
        console.log(`   Configured Decimals: ${token.decimals}`);
        console.log(`   Actual Decimals: ${actualDecimals}`);
        
        const balance = await client.readContract({
          address: token.address,
          abi: erc20ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
        });

        const formattedWithActual = formatUnits(balance, actualDecimals);
        const formattedWithConfigured = formatUnits(balance, token.decimals);
        
        console.log(`   Raw Balance: ${balance.toString()}`);
        console.log(`   With Actual Decimals (${actualDecimals}): ${formattedWithActual} ${symbol}`);
        console.log(`   With Configured Decimals (${token.decimals}): ${formattedWithConfigured} ${symbol}`);
        
        if (actualDecimals !== token.decimals) {
          console.log(`   ⚠️  DECIMALS MISMATCH! Should be ${actualDecimals}, not ${token.decimals}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error querying ${symbol}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

// Run the test
checkBalances().catch(console.error);