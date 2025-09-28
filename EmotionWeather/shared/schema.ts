import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // user | admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const policies = pgTable("policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category"), // Agriculture, Business, Health, Education, Other
  scope: text("scope").notNull().default("central"), // central | state
  meta: json("meta"), // Additional metadata
  aiExtracted: boolean("ai_extracted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // AI extracted structured information
  benefits: text("benefits"), // JSON string containing extracted benefits
  eligibility: text("eligibility"), // JSON string containing eligibility criteria  
  faqs: text("faqs"), // JSON string containing frequently asked questions
  extractedAt: timestamp("extracted_at"), // Timestamp of last AI extraction
});

export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // nullable for anonymous votes
  policyId: varchar("policy_id").notNull().references(() => policies.id),
  mood: text("mood").notNull(), // happy, angry, neutral, suggestion
  city: text("city"),
  state: text("state"),
  lat: decimal("lat", { precision: 10, scale: 8 }),
  lon: decimal("lon", { precision: 11, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // nullable for anonymous comments
  policyId: varchar("policy_id").notNull().references(() => policies.id),
  text: text("text").notNull(),
  mood: text("mood"), // optional mood selection
  aiSummaryShort: text("ai_summary_short"), // 2-3 lines summary
  aiSummaryDetailed: text("ai_summary_detailed"), // 2-3 paragraphs
  aiSentimentScore: decimal("ai_sentiment_score", { precision: 3, scale: 2 }), // -1 to 1
  keywords: json("keywords"), // Array of extracted keywords
  createdAt: timestamp("created_at").defaultNow(),
});

export const csvJobs = pgTable("csv_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").notNull().references(() => policies.id),
  filename: text("filename").notNull(),
  uploaderId: varchar("uploader_id").notNull().references(() => users.id),
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed
  totalRows: integer("total_rows").notNull().default(0),
  processedRows: integer("processed_rows").notNull().default(0),
  errors: json("errors"), // Array of error messages
  createdAt: timestamp("created_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
});

// Schema validation
export const insertUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["user", "admin"]).default("user"),
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertCsvJobSchema = createInsertSchema(csvJobs).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type Policy = typeof policies.$inferSelect;

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertCsvJob = z.infer<typeof insertCsvJobSchema>;
export type CsvJob = typeof csvJobs.$inferSelect;
