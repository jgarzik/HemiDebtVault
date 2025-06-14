/**
 * Shared Database Schema Definitions
 * 
 * This module defines the centralized database schema and type definitions shared
 * between frontend and backend components, ensuring type safety and consistency
 * across the entire application stack.
 * 
 * Key Features:
 * - PostgreSQL table definitions using Drizzle ORM
 * - Type-safe schema validation with Zod integration
 * - Shared TypeScript types for consistent data modeling
 * - Insert schema generation with automatic field selection
 * - Runtime validation and compile-time type checking
 * 
 * Architecture:
 * - Drizzle ORM provides PostgreSQL schema definition with type inference
 * - Zod schemas enable runtime validation for API boundaries
 * - TypeScript types are automatically generated from schema definitions
 * - Insert schemas exclude auto-generated fields (like serial IDs)
 * - Shared types ensure frontend/backend data contract consistency
 * 
 * Theory of Operation:
 * The schema serves as the single source of truth for data structure across
 * the application. Drizzle ORM provides compile-time type safety while Zod
 * enables runtime validation at API boundaries. By sharing these definitions
 * between frontend and backend, we eliminate type mismatches and ensure data
 * consistency. The insert schemas automatically exclude database-generated
 * fields, providing clean interfaces for data creation operations while
 * maintaining full type safety throughout the data flow.
 */
import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
