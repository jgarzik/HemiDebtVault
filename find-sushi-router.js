/**
 * Script to find the correct SushiSwap router address on Hemi network
 */

import { createPublicClient, http } from 'viem';

// Hemi mainnet network configuration
const hemiNetwork = {
  id: 43111,
  name: 'Hemi Network',
  network: 'hemi',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hemi.network/rpc'] },
    public: { http: ['https://rpc.hemi.network/rpc'] },
  },
};

// Common SushiSwap router addresses to try
const POTENTIAL_ROUTER_ADDRESSES = [
  '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // Current guess
  '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', // Ethereum mainnet
  '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891', // Common Sushi V2
  '0x1b81D678ffb9C0263b24A97847620C99d213eB14', // Another common address
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 (sometimes forked)
];

// Minimal router ABI to check if contract exists
const ROUTER_ABI = [
  {
    inputs: [],
    name: 'factory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Create public client
const publicClient = createPublicClient({
  chain: hemiNetwork,
  transport: http()
});

async function checkRouterAddress(address) {
  console.log(`\nChecking router at: ${address}`);
  
  try {
    // Try to call the factory function to see if it's a valid router
    const factory = await publicClient.readContract({
      address: address,
      abi: ROUTER_ABI,
      functionName: 'factory',
    });
    
    console.log(`✅ Valid router found! Factory: ${factory}`);
    return { address, factory, valid: true };
    
  } catch (error) {
    console.log(`❌ Not a valid router: ${error.message.split('\n')[0]}`);
    return { address, valid: false, error: error.message };
  }
}

async function findSushiRouter() {
  console.log('🔍 Searching for SushiSwap router on Hemi network...\n');
  
  const results = [];
  
  for (const address of POTENTIAL_ROUTER_ADDRESSES) {
    const result = await checkRouterAddress(address);
    results.push(result);
    
    if (result.valid) {
      console.log(`\n🎉 Found valid router at: ${address}`);
      console.log(`Factory address: ${result.factory}`);
      break;
    }
  }
  
  const validRouters = results.filter(r => r.valid);
  
  if (validRouters.length === 0) {
    console.log('\n❌ No valid SushiSwap routers found with the tested addresses.');
    console.log('You may need to find the correct Sushi deployment address for Hemi network.');
  }
  
  return validRouters;
}

// Run the search
findSushiRouter().catch(console.error);