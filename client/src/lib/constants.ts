/**
 * Application Configuration Constants
 * 
 * This module defines all timing, caching, and UI configuration constants
 * used throughout the debt vault application for consistent behavior.
 * 
 * Key Features:
 * - Query cache timing optimized for blockchain data freshness
 * - Transaction confirmation delays for smooth UX transitions
 * - UI interaction timing for responsive user experience
 * - Type-safe constant definitions with readonly enforcement
 * 
 * Architecture:
 * - Centralized configuration prevents magic numbers throughout codebase
 * - Optimized for blockchain data patterns and user expectations
 * - Easily adjustable for performance tuning and UX optimization
 * - Provides consistent timing across all application interactions
 */

// Query Cache Configuration
export const QUERY_CACHE_CONFIG = {
  STALE_TIME: 60000, // 60 seconds - data considered fresh
  GC_TIME: 300000,   // 5 minutes - keep in cache
} as const;

// Transaction Configuration
export const TRANSACTION_CONFIG = {
  CONFIRMATION_DELAY: 2000, // 2 seconds delay before data refresh
  APPROVAL_TIMEOUT: 30000,  // 30 seconds approval timeout
} as const;

// UI Configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300, // 300ms debounce for input fields
  TOAST_DURATION: 5000, // 5 seconds toast display
} as const;