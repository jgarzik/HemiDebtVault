// Simple test to verify Hemi network RPC connectivity
const HEMI_RPC = 'https://testnet.rpc.hemi.network/rpc';

async function testRPCConnection() {
  console.log('Testing Hemi Network RPC connection...');
  console.log('RPC URL:', HEMI_RPC);
  
  try {
    // Test 1: Get latest block number
    const blockResponse = await fetch(HEMI_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    
    const blockData = await blockResponse.json();
    console.log('Block number response:', blockData);
    
    if (blockData.result) {
      const blockNumber = parseInt(blockData.result, 16);
      console.log('✓ Latest block number:', blockNumber);
    }
    
    // Test 2: Get chain ID
    const chainResponse = await fetch(HEMI_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 2
      })
    });
    
    const chainData = await chainResponse.json();
    console.log('Chain ID response:', chainData);
    
    if (chainData.result) {
      const chainId = parseInt(chainData.result, 16);
      console.log('✓ Chain ID:', chainId, '(expected: 43111)');
    }
    
    // Test 3: Try to get token metadata (USDT contract)
    const symbolResponse = await fetch(HEMI_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: '0xbB0D083fb1be0A9f6157ec484b6C79E0A4e31C2e', // USDT contract
          data: '0x95d89b41' // symbol()
        }, 'latest'],
        id: 3
      })
    });
    
    const symbolData = await symbolResponse.json();
    console.log('Token symbol call response:', symbolData);
    
    // Test 4: Test token decimals
    const decimalsResponse = await fetch(HEMI_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: '0xbB0D083fb1be0A9f6157ec484b6C79E0A4e31C2e', // USDT contract
          data: '0x313ce567' // decimals()
        }, 'latest'],
        id: 4
      })
    });
    
    const decimalsData = await decimalsResponse.json();
    console.log('Token decimals call response:', decimalsData);
    
    if (decimalsData.result) {
      const decimals = parseInt(decimalsData.result, 16);
      console.log('✓ USDT decimals:', decimals, '(expected: 6)');
    }
    
  } catch (error) {
    console.error('❌ RPC test failed:', error);
  }
}

testRPCConnection();