/**
 * Test script to verify Sushi price querying on Hemi network
 * This tests the token/USDC price fetching functionality
 */

import { createPublicClient, http, formatUnits } from 'viem';

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

// Sushi V2 Router ABI (minimal for getAmountsOut)
const SUSHI_V2_ROUTER_ABI = [
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

// Contract addresses on Hemi
const SUSHI_V2_ROUTER_ADDRESS = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';
const USDC_ADDRESS = '0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA'; // USDC.e
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

// Test tokens with their decimals
const TEST_TOKENS = [
  { symbol: 'WETH', address: WETH_ADDRESS, decimals: 18 },
  { symbol: 'USDT', address: '0xbB0D083fb1be0A9f6157ec484b6C79E0A4e31C2e', decimals: 6 },
  { symbol: 'hemiBTC', address: '0xAA40c0c7644e0b2B224509571e10ad20d9C4ef28', decimals: 8 },
];

// Create public client
const publicClient = createPublicClient({
  chain: hemiNetwork,
  transport: http()
});

async function testTokenPrice(token) {
  console.log(`\n--- Testing ${token.symbol} price ---`);
  
  try {
    // Test direct path: Token -> USDC
    const amountIn = BigInt(10 ** token.decimals); // 1 token unit
    const path = [token.address, USDC_ADDRESS];
    
    console.log(`Querying ${token.symbol} -> USDC.e price...`);
    console.log(`Amount in: ${formatUnits(amountIn, token.decimals)} ${token.symbol}`);
    
    const result = await publicClient.readContract({
      address: SUSHI_V2_ROUTER_ADDRESS,
      abi: SUSHI_V2_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountIn, path],
    });

    if (result && result.length >= 2) {
      const usdcOut = result[1];
      const price = parseFloat(formatUnits(usdcOut, 6)); // USDC.e has 6 decimals
      
      console.log(`✅ Direct path successful:`);
      console.log(`   USDC.e out: ${formatUnits(usdcOut, 6)}`);
      console.log(`   Price: $${price.toFixed(6)} per ${token.symbol}`);
      
      return price;
    } else {
      console.log(`❌ Direct path failed - no valid result`);
    }
    
  } catch (error) {
    console.log(`❌ Direct path failed:`, error.message);
  }
  
  try {
    // Test reverse path: USDC -> Token
    console.log(`\nTrying reverse path: USDC.e -> ${token.symbol}...`);
    
    const reverseAmountIn = BigInt(10 ** 6); // 1 USDC
    const reversePath = [USDC_ADDRESS, token.address];
    
    const reverseResult = await publicClient.readContract({
      address: SUSHI_V2_ROUTER_ADDRESS,
      abi: SUSHI_V2_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [reverseAmountIn, reversePath],
    });

    if (reverseResult && reverseResult.length >= 2) {
      const tokenOut = reverseResult[1];
      const tokensPerUSDC = parseFloat(formatUnits(tokenOut, token.decimals));
      const price = 1 / tokensPerUSDC;
      
      console.log(`✅ Reverse path successful:`);
      console.log(`   ${token.symbol} out: ${formatUnits(tokenOut, token.decimals)}`);
      console.log(`   Tokens per USDC: ${tokensPerUSDC.toFixed(6)}`);
      console.log(`   Price: $${price.toFixed(6)} per ${token.symbol}`);
      
      return price;
    } else {
      console.log(`❌ Reverse path failed - no valid result`);
    }
    
  } catch (error) {
    console.log(`❌ Reverse path failed:`, error.message);
  }
  
  console.log(`❌ No liquidity found for ${token.symbol}/USDC.e pair`);
  return null;
}

async function runTests() {
  console.log('🧪 Testing Sushi price oracle on Hemi network...');
  console.log(`Router: ${SUSHI_V2_ROUTER_ADDRESS}`);
  console.log(`USDC.e: ${USDC_ADDRESS}`);
  
  const results = {};
  
  for (const token of TEST_TOKENS) {
    const price = await testTokenPrice(token);
    results[token.symbol] = price;
  }
  
  console.log('\n📊 Summary:');
  console.log('====================');
  for (const [symbol, price] of Object.entries(results)) {
    if (price !== null) {
      console.log(`${symbol}: $${price.toFixed(6)}`);
    } else {
      console.log(`${symbol}: No price data available`);
    }
  }
  
  const successCount = Object.values(results).filter(p => p !== null).length;
  console.log(`\n✅ Successfully fetched prices for ${successCount}/${TEST_TOKENS.length} tokens`);
}

// Run the tests
runTests().catch(console.error);