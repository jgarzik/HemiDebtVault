/**
 * Data Storage Abstraction Layer
 * 
 * This module provides a flexible storage interface for user data management,
 * supporting both in-memory and persistent storage implementations through
 * a unified API contract.
 * 
 * Key Features:
 * - Storage interface abstraction for multiple backend implementations
 * - In-memory storage implementation for development and testing
 * - Type-safe user data operations with Drizzle schema integration
 * - Async-first API design for database compatibility
 * - Extensible CRUD interface for future storage requirements
 * 
 * Architecture:
 * - IStorage interface defines the contract for all storage implementations
 * - MemStorage provides a fast in-memory implementation using Map data structure
 * - User operations are fully typed using shared schema definitions
 * - Auto-incrementing ID generation for new user records
 * - Promise-based API maintains consistency with database patterns
 * 
 * Theory of Operation:
 * The storage layer follows the Repository pattern, abstracting data persistence
 * concerns from business logic. The MemStorage implementation uses a Map for
 * O(1) lookup performance while maintaining the async interface contract that
 * database implementations require. This design allows seamless transition
 * between in-memory storage for development and database storage for production
 * without changing application code that depends on the IStorage interface.
 */
import { users, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
