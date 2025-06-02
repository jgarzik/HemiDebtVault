import { createPublicClient, http, defineChain } from 'viem';

// Hemi network definition
const hemiNetwork = defineChain({
  id: 43111,
  name: 'Hemi Network',
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
    default: { name: 'Hemi Explorer', url: 'https://explorer.hemi.xyz' },
  },
});

const DEBT_VAULT_ADDRESS = '0x72F6185DcBb9c8415f01003ACc872f08B44FC292';

async function testLoanRepaidEvents() {
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  try {
    console.log('Testing LoanRepaid event fetching...');
    
    // First, test fetching ALL events from this contract
    const allContractEvents = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      fromBlock: BigInt(0),
    });
    
    console.log(`Found ${allContractEvents.length} total events from contract`);
    if (allContractEvents.length > 0) {
      console.log('Sample event topics:', allContractEvents[0].topics);
    }
    
    // Test fetching all LoanRepaid events
    const allEvents = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      event: {
        type: 'event',
        name: 'LoanRepaid',
        inputs: [
          { name: 'loanId', type: 'uint256', indexed: true },
          { name: 'amount', type: 'uint256', indexed: false },
          { name: 'interestPaid', type: 'uint256', indexed: false },
          { name: 'principalPaid', type: 'uint256', indexed: false }
        ]
      },
      fromBlock: BigInt(0),
    });

    console.log(`Found ${allEvents.length} total LoanRepaid events`);
    
    if (allEvents.length > 0) {
      console.log('Sample event:', allEvents[0]);
      console.log('Event args:', allEvents[0].args);
    }

    // Test specific loan ID 0
    const loan0Events = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      event: {
        type: 'event',
        name: 'LoanRepaid',
        inputs: [
          { name: 'loanId', type: 'uint256', indexed: true },
          { name: 'amount', type: 'uint256', indexed: false },
          { name: 'interestPaid', type: 'uint256', indexed: false },
          { name: 'principalPaid', type: 'uint256', indexed: false }
        ]
      },
      args: { loanId: BigInt(0) },
      fromBlock: BigInt(0),
    });

    console.log(`Found ${loan0Events.length} LoanRepaid events for loan ID 0`);
    
    if (loan0Events.length > 0) {
      let totalInterest = BigInt(0);
      for (const event of loan0Events) {
        console.log('Loan 0 event:', event.args);
        if (event.args && typeof event.args.interestPaid === 'bigint') {
          totalInterest += event.args.interestPaid;
        }
      }
      console.log(`Total interest paid for loan 0: ${totalInterest}`);
    }

  } catch (error) {
    console.error('Error fetching events:', error);
  }
}

testLoanRepaidEvents();