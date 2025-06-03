import { createPublicClient, createWalletClient, http, parseUnits, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Hemi Mainnet configuration
const hemiMainnet = defineChain({
  id: 43111,
  name: 'Hemi Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hemi.network/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Hemi Explorer', url: 'https://explorer.hemi.network' },
  },
});

// Contract details
const DEBT_VAULT_ADDRESS = '0xB4ED059A662073381e64c1eDE861bC6aBE655FB0';
const VCRED_TOKEN = '0x71881974e96152643C74A8e0214B877CfB2A0Aa1';

// Test addresses
const borrower = '0x8cFafEEc879Ec0Cef5821Aa5340F5D5ab022ACe8';
const lender = '0x29Aa2eD8712072e918632259780E587698Ef58df';

// Minimal ABI for borrow function
const abi = [
  {
    "inputs": [
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "maxAPR", "type": "uint256"}
    ],
    "name": "borrow",
    "outputs": [{"internalType": "uint256", "name": "loanId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function testBorrowTransaction() {
  console.log('🧪 Testing borrow transaction formation...\n');
  
  // Create public client for gas estimation
  const publicClient = createPublicClient({
    chain: hemiMainnet,
    transport: http()
  });

  try {
    // Test transaction parameters (exact same as frontend error)
    const amount = parseUnits('0.6', 6); // 600000000 raw
    const maxAPR = BigInt(1640); // 16.40%
    
    console.log('Transaction parameters:');
    console.log(`  Lender: ${lender}`);
    console.log(`  Token: ${VCRED_TOKEN}`);
    console.log(`  Amount: ${amount.toString()} (0.6 VCRED)`);
    console.log(`  MaxAPR: ${maxAPR.toString()} (16.40%)\n`);

    // Test gas estimation (this is where frontend might be failing)
    console.log('Testing gas estimation...');
    
    try {
      const gasEstimate = await publicClient.estimateContractGas({
        address: DEBT_VAULT_ADDRESS,
        abi,
        functionName: 'borrow',
        args: [lender, VCRED_TOKEN, amount, maxAPR],
        account: borrower,
      });
      
      console.log(`✓ Gas estimation successful: ${gasEstimate.toString()} gas`);
      
    } catch (gasError) {
      console.log(`❌ Gas estimation failed:`, gasError.message);
      
      // Try to simulate the call to get more details
      console.log('\nTrying contract simulation...');
      try {
        const result = await publicClient.simulateContract({
          address: DEBT_VAULT_ADDRESS,
          abi,
          functionName: 'borrow',
          args: [lender, VCRED_TOKEN, amount, maxAPR],
          account: borrower,
        });
        console.log(`✓ Simulation successful`);
      } catch (simError) {
        console.log(`❌ Simulation failed:`, simError.message);
        console.log('Raw error:', simError);
      }
    }

    // Test with different amounts to isolate the issue
    console.log('\nTesting smaller amount (0.1 VCRED)...');
    const smallAmount = parseUnits('0.1', 6);
    
    try {
      const smallGasEstimate = await publicClient.estimateContractGas({
        address: DEBT_VAULT_ADDRESS,
        abi,
        functionName: 'borrow',
        args: [lender, VCRED_TOKEN, smallAmount, maxAPR],
        account: borrower,
      });
      
      console.log(`✓ Small amount gas estimation successful: ${smallGasEstimate.toString()} gas`);
    } catch (smallError) {
      console.log(`❌ Small amount also failed:`, smallError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBorrowTransaction();