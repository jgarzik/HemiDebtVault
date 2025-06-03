#!/usr/bin/env node

// Test script to verify loan data fetching for DebtVaultV2
import { createPublicClient, http } from 'viem';
import { hemiNetwork } from './client/src/lib/hemi.js';
import { DEBT_VAULT_ADDRESS } from './client/src/lib/hemi.js';
import { DEBT_VAULT_EVENTS } from './client/src/lib/contract.js';

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
    console.log('\n1. Querying LoanCreated events...');
    
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
      console.log('Sample LoanCreated event:', JSON.stringify(loanCreatedLogs[0], (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2));
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
      console.log('Sample event:', JSON.stringify(allLoanEvents[0], (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2));
    }

    // Test 3: Check contract exists and get loan count
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
      
      console.log('Contract is accessible. MAX_LOANS_PER_USER:', maxLoans.toString());
    } catch (error) {
      console.error('Contract interaction failed:', error.message);
    }

    // Test 4: Check if borrower has any loans via contract call
    console.log('\n4. Checking borrower loan count...');
    
    try {
      const userLoanCount = await publicClient.readContract({
        address: DEBT_VAULT_ADDRESS,
        abi: [{
          "inputs": [{"internalType": "address", "name": "", "type": "address"}],
          "name": "userLoanCount",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'userLoanCount',
        args: [BORROWER_ADDRESS]
      });
      
      console.log(`Borrower ${BORROWER_ADDRESS} has ${userLoanCount.toString()} active loans`);
    } catch (error) {
      console.error('Failed to get user loan count:', error.message);
    }

    return {
      loanCreatedEvents: loanCreatedLogs.length,
      totalEvents: allLoanEvents.length,
      contractAccessible: true
    };

  } catch (error) {
    console.error('Test failed:', error);
    return { error: error.message };
  }
}

// Run the test
testLoanDataFetching()
  .then(result => {
    console.log('\nTest completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });