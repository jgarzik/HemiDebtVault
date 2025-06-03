import { createPublicClient, http } from 'viem';
import { hemiNetwork, DEBT_VAULT_ADDRESS } from './client/src/lib/hemi';
import { DEBT_VAULT_ABI } from './client/src/lib/contract';

const BORROWER_ADDRESS = '0x8cFafEEc879Ec0Cef5821Aa5340F5D5ab022ACe8';

async function testNFTFunctions() {
  console.log('Testing ERC721 NFT functions for DebtVaultV2...');
  console.log('Borrower address:', BORROWER_ADDRESS);
  console.log('Contract address:', DEBT_VAULT_ADDRESS);
  
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http()
  });

  try {
    // Test 1: Check NFT balance
    console.log('\n1. Testing balanceOf...');
    
    const balance = await publicClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: [{
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }],
      functionName: 'balanceOf',
      args: [BORROWER_ADDRESS]
    });
    
    console.log(`Borrower has ${balance.toString()} NFTs`);

    // Test 2: Get loan NFTs by index if balance > 0
    if (balance > 0n) {
      console.log('\n2. Testing tokenOfOwnerByIndex...');
      
      for (let i = 0; i < Number(balance); i++) {
        try {
          const tokenId = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: [{
              "inputs": [
                {"internalType": "address", "name": "owner", "type": "address"},
                {"internalType": "uint256", "name": "index", "type": "uint256"}
              ],
              "name": "tokenOfOwnerByIndex",
              "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
              "stateMutability": "view",
              "type": "function"
            }],
            functionName: 'tokenOfOwnerByIndex',
            args: [BORROWER_ADDRESS, BigInt(i)]
          });
          
          console.log(`Token at index ${i}: ${tokenId.toString()}`);
          
          // Test 3: Get loan details for this token
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: [{
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
            }],
            functionName: 'loanById',
            args: [tokenId]
          });
          
          const [borrower, lender, token, principal, repaidPrincipal, forgivenPrincipal, apr, startTimestamp, lastPaymentTimestamp, closed] = loanData as any;
          
          console.log(`Loan ${tokenId.toString()} details:`);
          console.log('- Borrower:', borrower);
          console.log('- Lender:', lender);
          console.log('- Token:', token);
          console.log('- Principal:', principal.toString());
          console.log('- APR:', apr.toString());
          console.log('- Closed:', closed);
          
        } catch (error) {
          console.error(`Error getting token at index ${i}:`, error.message);
        }
      }
    } else {
      console.log('No NFTs found for this borrower');
    }

    // Test 4: Check if loan ID 0 exists and who owns it
    console.log('\n3. Testing ownerOf for loan ID 0...');
    
    try {
      const owner = await publicClient.readContract({
        address: DEBT_VAULT_ADDRESS,
        abi: [{
          "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
          "name": "ownerOf",
          "outputs": [{"internalType": "address", "name": "", "type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'ownerOf',
        args: [0n]
      });
      
      console.log(`Loan ID 0 is owned by: ${owner}`);
      console.log(`Is borrower the owner? ${owner.toLowerCase() === BORROWER_ADDRESS.toLowerCase()}`);
      
    } catch (error) {
      console.error('Error getting owner of loan ID 0:', error.message);
    }

    // Test 5: Check originalBorrower mapping
    console.log('\n4. Testing originalBorrower for loan ID 0...');
    
    try {
      const originalBorrower = await publicClient.readContract({
        address: DEBT_VAULT_ADDRESS,
        abi: [{
          "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "name": "originalBorrower",
          "outputs": [{"internalType": "address", "name": "", "type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'originalBorrower',
        args: [0n]
      });
      
      console.log(`Original borrower of loan ID 0: ${originalBorrower}`);
      console.log(`Is test address the original borrower? ${originalBorrower.toLowerCase() === BORROWER_ADDRESS.toLowerCase()}`);
      
    } catch (error) {
      console.error('Error getting original borrower:', error.message);
    }

    return {
      balance: balance.toString(),
      hasNFTs: balance > 0n
    };

  } catch (error) {
    console.error('Test failed:', error);
    return { error: error.message };
  }
}

// Run the test
testNFTFunctions()
  .then(result => {
    console.log('\nNFT Function Test Results:', result);
  })
  .catch(error => {
    console.error('Test error:', error);
  });