// Test Hemi mainnet RPC connection
const HEMI_RPC = 'https://rpc.hemi.network/rpc';

const tokens = [
  { symbol: 'USDT', address: '0xbB0D083fb1be0A9f6157ec484b6C79E0A4e31C2e' },
  { symbol: 'hemiBTC', address: '0xAA40c0c7644e0b2B224509571e10ad20d9C4ef28' },
  { symbol: 'USDC.e', address: '0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA' },
  { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006' },
  { symbol: 'VUSD', address: '0x7A06C4AeF988e7925575C50261297a946aD204A8' },
  { symbol: 'WBTC', address: '0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3' }
];

async function testMainnet() {
  console.log('Testing Hemi Mainnet RPC connection...');
  console.log('RPC URL:', HEMI_RPC);
  
  try {
    // Test chain ID
    const chainResponse = await fetch(HEMI_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1
      })
    });
    
    const chainData = await chainResponse.json();
    const chainId = parseInt(chainData.result, 16);
    console.log('Chain ID:', chainId, '(expected: 43111)');
    
    // Test block number
    const blockResponse = await fetch(HEMI_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 2
      })
    });
    
    const blockData = await blockResponse.json();
    const blockNumber = parseInt(blockData.result, 16);
    console.log('Latest block:', blockNumber);
    
    // Check token contracts
    console.log('\nChecking token contracts:');
    for (const token of tokens) {
      const response = await fetch(HEMI_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getCode',
          params: [token.address, 'latest'],
          id: 3
        })
      });
      
      const data = await response.json();
      const hasCode = data.result && data.result !== '0x';
      console.log(`${token.symbol}: ${hasCode ? '✓ Contract exists' : '❌ No contract'}`);
    }
    
  } catch (error) {
    console.error('RPC test failed:', error);
  }
}

testMainnet();
