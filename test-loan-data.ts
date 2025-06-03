import { createPublicClient, http } from 'viem';
import { hemiNetwork, DEBT_VAULT_ADDRESS } from './client/src/lib/hemi';
import { DEBT_VAULT_EVENTS } from './client/src/lib/contract';

const BORROWER_ADDRESS = '0x8cFafEEc879Ec0Cef5821Aa5340F5D5ab022ACe8';

async function testLoanDataFetching() {
  console.log('Testing loan data fetching for DebtVaultV2...');
  console.log('Borrower address:', BORROWER_ADDRESS);
  console.log('Contract address:', DEBT_VAULT_ADDRESS);
  
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http()
  });

  try {
    // Test 1: Query LoanCreated events for this borrower
    console.log('\n1. Querying LoanCreated events for specific borrower...');
    
    const loanCreatedLogs = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      event: DEBT_VAULT_EVENTS.LoanCreated,
      args: {
        borrower: BORROWER_ADDRESS
      },
      fromBlock: 'earliest',
      toBlock: 'latest'
    });
    
    console.log(`Found ${loanCreatedLogs.length} LoanCreated events for borrower`);
    
    if (loanCreatedLogs.length > 0) {
      console.log('Sample LoanCreated event:');
      const event = loanCreatedLogs[0];
      console.log('- Loan ID:', event.args?.loanId?.toString());
      console.log('- Borrower:', event.args?.borrower);
      console.log('- Lender:', event.args?.lender);
      console.log('- Token:', event.args?.token);
      console.log('- Amount:', event.args?.amount?.toString());
      console.log('- Principal:', event.args?.principal?.toString());
      console.log('- APR:', event.args?.apr?.toString());
    }

    // Test 2: Query all LoanCreated events to see if any exist
    console.log('\n2. Querying all LoanCreated events...');
    
    const allLoanEvents = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      event: DEBT_VAULT_EVENTS.LoanCreated,
      fromBlock: 'earliest',
      toBlock: 'latest'
    });
    
    console.log(`Found ${allLoanEvents.length} total LoanCreated events`);
    
    if (allLoanEvents.length > 0) {
      console.log('Recent events:');
      allLoanEvents.slice(-3).forEach((event, i) => {
        console.log(`  Event ${i + 1}:`);
        console.log('  - Loan ID:', event.args?.loanId?.toString());
        console.log('  - Borrower:', event.args?.borrower);
        console.log('  - Block:', event.blockNumber?.toString());
      });
    }

    // Test 3: Test contract accessibility
    console.log('\n3. Testing contract interaction...');
    
    try {
      const maxLoans = await publicClient.readContract({
        address: DEBT_VAULT_ADDRESS,
        abi: [{
          "inputs": [],
          "name": "MAX_LOANS_PER_USER",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'MAX_LOANS_PER_USER'
      });
      
      console.log('Contract accessible. MAX_LOANS_PER_USER:', maxLoans.toString());
    } catch (error) {
      console.error('Contract interaction failed:', error.message);
    }

    return {
      borrowerEvents: loanCreatedLogs.length,
      totalEvents: allLoanEvents.length,
      hasLoans: loanCreatedLogs.length > 0
    };

  } catch (error) {
    console.error('Test failed:', error);
    return { error: error.message };
  }
}

// Run the test
testLoanDataFetching()
  .then(result => {
    console.log('\nTest Results:', result);
    if (result.hasLoans) {
      console.log('✓ Borrower has loans - data fetching should work');
    } else {
      console.log('✗ No loans found for borrower');
    }
  })
  .catch(error => {
    console.error('Test error:', error);
  });