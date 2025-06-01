export interface Token {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  name: string;
  isCustom?: boolean;
}

// Whitelisted tokens on Hemi network
export const WHITELISTED_TOKENS: Token[] = [
  {
    symbol: 'USDT',
    address: '0xbB0D083fb1be0A9f6157ec484b6C79E0A4e31C2e',
    decimals: 6,
    name: 'Tether USD',
  },
  {
    symbol: 'hemiBTC',
    address: '0xAA40c0c7644e0b2B224509571e10ad20d9C4ef28',
    decimals: 8,
    name: 'Hemi Bitcoin',
  },
  {
    symbol: 'USDC.e',
    address: '0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA',
    decimals: 6,
    name: 'USD Coin (Bridged)',
  },
  {
    symbol: 'VCRED',
    address: '0x71881974e96152643C74A8e0214B877CfB2A0Aa1',
    decimals: 18,
    name: 'VCRED',
  },
  {
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    name: 'Wrapped Ether',
  },
  {
    symbol: 'VUSD',
    address: '0x7A06C4AeF988e7925575C50261297a946aD204A8',
    decimals: 18,
    name: 'VUSD Stablecoin',
  },
  {
    symbol: 'WBTC',
    address: '0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3',
    decimals: 8,
    name: 'Wrapped Bitcoin',
  },
];

// Local storage key for custom tokens
const CUSTOM_TOKENS_KEY = 'debtVault_customTokens';

// Get custom tokens from local storage
export function getCustomTokens(): Token[] {
  try {
    const stored = localStorage.getItem(CUSTOM_TOKENS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading custom tokens:', error);
  }
  return [];
}

// Save custom token to local storage
export function saveCustomToken(token: Token): void {
  try {
    const customTokens = getCustomTokens();
    const exists = customTokens.find(t => t.address.toLowerCase() === token.address.toLowerCase());
    
    if (!exists) {
      const updatedTokens = [...customTokens, { ...token, isCustom: true }];
      localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(updatedTokens));
    }
  } catch (error) {
    console.error('Error saving custom token:', error);
  }
}

// Get all available tokens (whitelisted + custom)
export function getAllTokens(): Token[] {
  return [...WHITELISTED_TOKENS, ...getCustomTokens()];
}

// Find token by address
export function findTokenByAddress(address: string): Token | undefined {
  const allTokens = getAllTokens();
  return allTokens.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// Validate Ethereum address format
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}