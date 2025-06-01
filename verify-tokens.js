// Test if the token addresses actually exist on Hemi network
const HEMI_RPC = 'https://testnet.rpc.hemi.network/rpc';

const tokens = [
  { symbol: 'USDT', address: '0xbB0D083fb1be0A9f6157ec484b6C79E0A4e31C2e' },
  { symbol: 'hemiBTC', address: '0xAA40c0c7644e0b2B224509571e10ad20d9C4ef28' },
  { symbol: 'USDC.e', address: '0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA' },
  { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006' },
  { symbol: 'VUSD', address: '0x7A06C4AeF988e7925575C50261297a946aD204A8' },
  { symbol: 'WBTC', address: '0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3' }
];

async function checkTokenExists(address) {
  try {
    const response = await fetch(HEMI_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1
      })
    });
    
    const data = await response.json();
    return data.result && data.result !== '0x';
  } catch {
    return false;
  }
}

async function verifyTokens() {
  console.log('Checking token contract existence on Hemi network...\n');
  
  for (const token of tokens) {
    const exists = await checkTokenExists(token.address);
    console.log(`${token.symbol} (${token.address}): ${exists ? '✓ Contract exists' : '❌ No contract found'}`);
  }
}

verifyTokens();
