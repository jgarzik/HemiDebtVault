import { PublicClient } from 'viem';
import { DEBT_VAULT_ADDRESS } from './hemi';
import { DEBT_VAULT_EVENTS } from './contract';

// Shared interface for event query results
export interface EventQueryResult {
  blockNumber: bigint;
  transactionHash: string;
  args: Record<string, any>;
}

// Common event query options
export interface EventQueryOptions {
  fromBlock?: bigint | 'earliest';
  toBlock?: bigint | 'latest';
  address?: string;
}

// Base event querying function with consistent error handling
export async function queryContractEvents(
  publicClient: PublicClient,
  eventName: keyof typeof DEBT_VAULT_EVENTS,
  args: Record<string, any> = {},
  options: EventQueryOptions = {}
): Promise<EventQueryResult[]> {
  try {
    const { fromBlock = 'earliest', toBlock = 'latest' } = options;
    
    console.log(`DEBUG: Querying ${eventName} events with args:`, args);
    
    const logs = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      event: DEBT_VAULT_EVENTS[eventName],
      args,
      fromBlock,
      toBlock,
    });

    console.log(`DEBUG: Found ${logs.length} ${eventName} events`);

    if (!Array.isArray(logs)) {
      console.warn(`${eventName} events is not an array:`, logs);
      return [];
    }

    // Safely map to consistent format
    const results: EventQueryResult[] = [];
    for (const log of logs) {
      if (log?.blockNumber && log?.transactionHash && log?.args) {
        results.push({
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          args: log.args,
        });
      }
    }

    return results;
  } catch (error) {
    console.error(`Error querying ${eventName} events:`, error);
    return [];
  }
}

// Specialized query functions for common use cases
export async function queryDepositedEvents(
  publicClient: PublicClient,
  lender: string,
  options?: EventQueryOptions
): Promise<EventQueryResult[]> {
  return queryContractEvents(publicClient, 'Deposited', { lender }, options);
}

export async function queryWithdrawnEvents(
  publicClient: PublicClient,
  lender: string,
  options?: EventQueryOptions
): Promise<EventQueryResult[]> {
  return queryContractEvents(publicClient, 'Withdrawn', { lender }, options);
}

export async function queryLoanCreatedEvents(
  publicClient: PublicClient,
  filters: { lender?: string; borrower?: string; loanId?: bigint } = {},
  options?: EventQueryOptions
): Promise<EventQueryResult[]> {
  return queryContractEvents(publicClient, 'LoanCreated', filters, options);
}

export async function queryRepaidEvents(
  publicClient: PublicClient,
  filters: { loanId?: bigint; borrower?: string } = {},
  options?: EventQueryOptions
): Promise<EventQueryResult[]> {
  return queryContractEvents(publicClient, 'Repaid', filters, options);
}

export async function queryCreditLineUpdatedEvents(
  publicClient: PublicClient,
  filters: { lender?: string; borrower?: string; token?: string } = {},
  options?: EventQueryOptions
): Promise<EventQueryResult[]> {
  return queryContractEvents(publicClient, 'CreditLineUpdated', filters, options);
}

// Utility function to extract unique token addresses from events
export function extractUniqueTokens(events: EventQueryResult[]): string[] {
  const tokenAddresses: string[] = [];
  
  for (const event of events) {
    if (event?.args?.token && typeof event.args.token === 'string') {
      tokenAddresses.push(event.args.token);
    }
  }

  // Get unique tokens using Set
  const uniqueTokensSet = new Set(tokenAddresses);
  return Array.from(uniqueTokensSet);
}

// Utility function to extract unique loan IDs from events
export function extractUniqueLoanIds(events: EventQueryResult[]): bigint[] {
  const loanIds: bigint[] = [];
  
  for (const event of events) {
    if (event?.args?.loanId && typeof event.args.loanId === 'bigint') {
      loanIds.push(event.args.loanId);
    }
  }

  // Get unique loan IDs
  const uniqueIdsSet = new Set(loanIds.map(id => id.toString()));
  return Array.from(uniqueIdsSet).map(id => BigInt(id));
}