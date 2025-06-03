import { createPublicClient, http, parseUnits, formatUnits, defineChain } from 'viem';

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
const VCRED_TOKEN = '0x71881974e96152643C74A8e0214B877CfB2A0Aa1'; // VCRED token address

// Test addresses
const borrower = '0x8cFafEEc879Ec0Cef5821Aa5340F5D5ab022ACe8';
const lender = '0x29Aa2eD8712072e918632259780E587698Ef58df';

// Minimal ABI for testing
const abi = [
  {
    "inputs": [
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "lenderDeposits",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "creditLines",
    "outputs": [
      {"internalType": "uint256", "name": "creditLimit", "type": "uint256"},
      {"internalType": "uint256", "name": "minAPR", "type": "uint256"},
      {"internalType": "uint256", "name": "maxAPR", "type": "uint256"},
      {"internalType": "uint256", "name": "originationFee", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "getAvailableCredit",
    "outputs": [{"internalType": "uint256", "name": "availableCredit", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function debugBorrow() {
  console.log('🔍 Debugging borrow transaction failure...\n');
  
  // Create client
  const client = createPublicClient({
    chain: hemiMainnet,
    transport: http()
  });

  try {
    // 1. Check lender deposits
    console.log('1. Checking lender deposits...');
    const lenderDeposits = await client.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi,
      functionName: 'lenderDeposits',
      args: [lender, VCRED_TOKEN],
    });
    
    console.log(`   Lender deposits: ${lenderDeposits.toString()} raw`);
    console.log(`   Lender deposits: ${formatUnits(lenderDeposits, 6)} VCRED\n`);

    // 2. Check credit line configuration
    console.log('2. Checking credit line configuration...');
    const creditLine = await client.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi,
      functionName: 'creditLines',
      args: [lender, borrower, VCRED_TOKEN],
    });
    
    console.log(`   Credit limit: ${creditLine[0].toString()} raw`);
    console.log(`   Credit limit: ${formatUnits(creditLine[0], 6)} VCRED`);
    console.log(`   Min APR: ${creditLine[1].toString()} basis points (${(Number(creditLine[1]) / 100).toFixed(2)}%)`);
    console.log(`   Max APR: ${creditLine[2].toString()} basis points (${(Number(creditLine[2]) / 100).toFixed(2)}%)`);
    console.log(`   Origination fee: ${creditLine[3].toString()} basis points (${(Number(creditLine[3]) / 100).toFixed(2)}%)\n`);

    // 3. Check available credit
    console.log('3. Checking available credit...');
    const availableCredit = await client.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi,
      functionName: 'getAvailableCredit',
      args: [borrower, lender, VCRED_TOKEN],
    });
    
    console.log(`   Available credit: ${availableCredit.toString()} raw`);
    console.log(`   Available credit: ${formatUnits(availableCredit, 6)} VCRED\n`);

    // 4. Test borrow amount
    const borrowAmount = parseUnits('0.6', 6); // 0.6 VCRED (6 decimals)
    console.log('4. Testing borrow scenario...');
    console.log(`   Requested amount: ${borrowAmount.toString()} raw`);
    console.log(`   Requested amount: ${formatUnits(borrowAmount, 6)} VCRED`);
    
    // Calculate origination fee
    const originationFee = (borrowAmount * creditLine[3]) / BigInt(10000);
    const totalPrincipal = borrowAmount + originationFee;
    
    console.log(`   Origination fee: ${formatUnits(originationFee, 6)} VCRED`);
    console.log(`   Total principal: ${formatUnits(totalPrincipal, 6)} VCRED\n`);

    // 5. Check constraints
    console.log('5. Checking borrow constraints...');
    console.log(`   ✓ Amount > 0: ${borrowAmount > 0}`);
    console.log(`   ✓ Credit line exists: ${creditLine[0] > 0}`);
    console.log(`   ✓ Sufficient lender balance: ${lenderDeposits >= borrowAmount} (need ${formatUnits(borrowAmount, 6)}, have ${formatUnits(lenderDeposits, 6)})`);
    console.log(`   ✓ Within credit limit: ${totalPrincipal <= creditLine[0]} (need ${formatUnits(totalPrincipal, 6)}, limit ${formatUnits(creditLine[0], 6)})`);
    console.log(`   ✓ Within available credit: ${totalPrincipal <= availableCredit} (need ${formatUnits(totalPrincipal, 6)}, available ${formatUnits(availableCredit, 6)})`);

    // 6. Check if all constraints pass
    const allConstraintsPassed = 
      borrowAmount > 0 &&
      creditLine[0] > 0 &&
      lenderDeposits >= borrowAmount &&
      totalPrincipal <= creditLine[0] &&
      totalPrincipal <= availableCredit;

    console.log(`\n   🎯 All constraints passed: ${allConstraintsPassed}`);
    
    if (!allConstraintsPassed) {
      console.log('\n❌ FAILURE ANALYSIS:');
      if (borrowAmount <= 0) console.log('   - Invalid amount (zero or negative)');
      if (creditLine[0] <= 0) console.log('   - No credit line exists');
      if (lenderDeposits < borrowAmount) console.log('   - Insufficient lender balance');
      if (totalPrincipal > creditLine[0]) console.log('   - Exceeds credit limit');
      if (totalPrincipal > availableCredit) console.log('   - Exceeds available credit');
    }

    // 7. Test APR calculation and validation (from frontend error)
    console.log('\n6. Testing APR calculation like the frontend...');
    
    // Simulate utilization calculation from smart contract
    const currentBorrowing = BigInt(0); // No existing borrowing
    const utilizationAfterBorrow = ((currentBorrowing + totalPrincipal) * BigInt('1000000000000000000')) / creditLine[0];
    const calculatedAPR = creditLine[1] + ((utilizationAfterBorrow * (creditLine[2] - creditLine[1])) / BigInt('1000000000000000000'));
    
    console.log(`   Current borrowing: ${formatUnits(currentBorrowing, 6)} VCRED`);
    console.log(`   Utilization after borrow: ${utilizationAfterBorrow.toString()}`);
    console.log(`   Calculated APR: ${calculatedAPR.toString()} basis points (${(Number(calculatedAPR) / 100).toFixed(2)}%)`);
    
    // Test with the exact maxAPR from the frontend error (1640 basis points = 16.40%)
    const frontendMaxAPR = BigInt(1640);
    console.log(`   Frontend maxAPR: ${frontendMaxAPR.toString()} basis points (${(Number(frontendMaxAPR) / 100).toFixed(2)}%)`);
    console.log(`   ✓ APR within tolerance: ${calculatedAPR <= frontendMaxAPR} (${(Number(calculatedAPR) / 100).toFixed(2)}% <= ${(Number(frontendMaxAPR) / 100).toFixed(2)}%)`);
    
    if (calculatedAPR > frontendMaxAPR) {
      console.log(`\n❌ APR TOLERANCE FAILURE:`);
      console.log(`   - Contract will calculate APR as ${(Number(calculatedAPR) / 100).toFixed(2)}%`);
      console.log(`   - Frontend maxAPR tolerance is ${(Number(frontendMaxAPR) / 100).toFixed(2)}%`);
      console.log(`   - This will trigger "APRExceedsLimit" revert`);
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugBorrow();