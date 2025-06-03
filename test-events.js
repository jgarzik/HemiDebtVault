import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

// Hemi Network configuration
const hemiNetwork = defineChain({
  id: 43111,
  name: 'Hemi Network',
  network: 'hemi',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://rpc.hemi.network/rpc'] },
    default: { http: ['https://rpc.hemi.network/rpc'] },
  },
});

const DEBT_VAULT_ADDRESS = '0xB4ED059A662073381e64c1eDE861bC6aBE655FB0';
const TEST_ACCOUNT = '0x29Aa2eD8712072e918632259780E587698Ef58df';

// Create public client
const publicClient = createPublicClient({
  chain: hemiNetwork,
  transport: http()
});

// Deposited event ABI
const DEPOSITED_EVENT = {
  type: 'event',
  name: 'Deposited',
  inputs: [
    { type: 'address', name: 'lender', indexed: true },
    { type: 'address', name: 'token', indexed: true },
    { type: 'uint256', name: 'amount' }
  ]
};

async function testDepositedEvents() {
  try {
    console.log('Testing Deposited events for account:', TEST_ACCOUNT);
    console.log('Contract address:', DEBT_VAULT_ADDRESS);
    
    const logs = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      event: DEPOSITED_EVENT,
      args: {
        lender: TEST_ACCOUNT,
      },
      fromBlock: 'earliest',
      toBlock: 'latest',
    });

    console.log(`Found ${logs.length} Deposited events`);
    
    if (logs.length > 0) {
      logs.forEach((log, index) => {
        console.log(`Event ${index + 1}:`);
        console.log('  Lender:', log.args.lender);
        console.log('  Token:', log.args.token);
        console.log('  Amount:', log.args.amount?.toString());
        console.log('  Block:', log.blockNumber);
        console.log('  Tx Hash:', log.transactionHash);
        console.log('---');
      });
      
      // Extract unique tokens
      const tokens = [...new Set(logs.map(log => log.args.token))];
      console.log('Unique tokens found:', tokens);
    } else {
      console.log('No Deposited events found for this account');
    }

  } catch (error) {
    console.error('Error querying events:', error);
  }
}

testDepositedEvents();