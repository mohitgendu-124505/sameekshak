import { 
  type User, type InsertUser, type Policy, type InsertPolicy, type Vote, type InsertVote, 
  type Comment, type InsertComment, type CsvJob, type InsertCsvJob,
  policies, votes, comments, users, csvJobs 
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Policy methods
  getPolicies(): Promise<Policy[]>;
  getPolicy(id: string): Promise<Policy | undefined>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(id: string, policy: Partial<Policy>): Promise<Policy | undefined>;
  deletePolicy(id: string): Promise<boolean>;
  
  // Vote methods
  getVotes(): Promise<Vote[]>;
  getVotesByPolicy(policyId: string): Promise<Vote[]>;
  createVote(vote: InsertVote): Promise<Vote>;
  getVoteStats(policyId: string): Promise<{ [key: string]: number }>;
  
  // Comment methods
  getComments(): Promise<Comment[]>;
  getCommentsByPolicy(policyId: string, options?: { page?: number; limit?: number; sort?: string }): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: string, updates: Partial<Comment>): Promise<Comment | undefined>;
  
  // CSV Job methods
  createCsvJob(job: InsertCsvJob): Promise<CsvJob>;
  getCsvJob(id: string): Promise<CsvJob | undefined>;
  updateCsvJob(id: string, updates: Partial<CsvJob>): Promise<CsvJob | undefined>;
  getCsvJobsByPolicy(policyId: string): Promise<CsvJob[]>;
  
  // Geographical data methods
  getGeographicalData(policyId?: string): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private policies: Map<string, Policy>;
  private votes: Map<string, Vote>;
  private comments: Map<string, Comment>;
  private csvJobs: Map<string, CsvJob>;

  constructor() {
    this.users = new Map();
    this.policies = new Map();
    this.votes = new Map();
    this.comments = new Map();
    this.csvJobs = new Map();
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const samplePolicy: Policy = {
      id: "policy-1",
      title: "Climate Action Initiative 2024",
      description: "A comprehensive policy proposal aimed at reducing carbon emissions by 50% over the next decade through renewable energy investments and sustainable transportation initiatives.",
      category: "Environment",
      scope: "central",
      meta: {
        objectives: [
          "Implement renewable energy infrastructure in all government buildings",
          "Expand public transportation networks by 30%",
          "Provide tax incentives for electric vehicle adoption",
          "Establish community solar programs"
        ],
        timeline: "Implementation period: January 2024 - December 2034 (10 years)",
        budget: "Total investment: $2.4 billion over 10 years"
      },
      aiExtracted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      benefits: null,
      eligibility: null,
      faqs: null,
      extractedAt: null,
    };

    const otherPolicies: Policy[] = [
      {
        id: "policy-2",
        title: "Education Reform Act",
        description: "Modernizing curriculum and increasing teacher funding across all districts",
        category: "Education",
        scope: "central",
        meta: {},
        aiExtracted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        benefits: null,
        eligibility: null,
        faqs: null,
        extractedAt: null,
      },
      {
        id: "policy-3",
        title: "Healthcare Accessibility",
        description: "Expanding healthcare coverage to underserved communities",
        category: "Health",
        scope: "central",
        meta: {},
        aiExtracted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        benefits: null,
        eligibility: null,
        faqs: null,
        extractedAt: null,
      },
      {
        id: "policy-4",
        title: "Digital Infrastructure",
        description: "Improving internet connectivity in rural areas",
        category: "Technology",
        scope: "central",
        meta: {},
        aiExtracted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        benefits: null,
        eligibility: null,
        faqs: null,
        extractedAt: null,
      },
      {
        id: "policy-5",
        title: "Small Business Support",
        description: "Tax breaks and grants for local entrepreneurs",
        category: "Business",
        scope: "central",
        meta: {},
        aiExtracted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        benefits: null,
        eligibility: null,
        faqs: null,
        extractedAt: null,
      },
      {
        id: "policy-6",
        title: "Urban Development",
        description: "Sustainable city planning and affordable housing",
        category: "Infrastructure",
        scope: "state",
        meta: {},
        aiExtracted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        benefits: null,
        eligibility: null,
        faqs: null,
        extractedAt: null,
      }
    ];

    this.policies.set(samplePolicy.id, samplePolicy);
    otherPolicies.forEach(policy => this.policies.set(policy.id, policy));

    // Add sample votes for the main policy
    const sampleVotes: Vote[] = [
      { id: "vote-1", userId: null, policyId: "policy-1", mood: "happy", city: "Los Angeles", state: "California", lat: "34.0522", lon: "-118.2437", createdAt: new Date() },
      { id: "vote-2", userId: null, policyId: "policy-1", mood: "happy", city: "New York", state: "New York", lat: "40.7128", lon: "-74.0060", createdAt: new Date() },
      { id: "vote-3", userId: null, policyId: "policy-1", mood: "angry", city: "Houston", state: "Texas", lat: "29.7604", lon: "-95.3698", createdAt: new Date() },
      { id: "vote-4", userId: null, policyId: "policy-1", mood: "neutral", city: "Miami", state: "Florida", lat: "25.7617", lon: "-80.1918", createdAt: new Date() },
      { id: "vote-5", userId: null, policyId: "policy-1", mood: "suggestion", city: "Denver", state: "Colorado", lat: "39.7392", lon: "-104.9903", createdAt: new Date() },
    ];

    sampleVotes.forEach(vote => this.votes.set(vote.id, vote));
    
    // Add sample comments
    const sampleComments: Comment[] = [
      { 
        id: "comment-1", 
        userId: null,
        policyId: "policy-1", 
        text: "This is exactly what we need! The renewable energy focus will create so many jobs in our community.", 
        mood: "happy",
        aiSummaryShort: "Positive feedback about job creation potential",
        aiSummaryDetailed: "User expresses strong support for the renewable energy focus, highlighting the potential for job creation in their community. This suggests the policy aligns well with local economic development goals.",
        aiSentimentScore: "0.8",
        keywords: ["renewable energy", "jobs", "community"],
        createdAt: new Date() 
      },
      { 
        id: "comment-2", 
        userId: null,
        policyId: "policy-1", 
        text: "I'm concerned about the cost. $2.4 billion seems like a lot when we have other pressing issues.", 
        mood: "angry",
        aiSummaryShort: "Concern about policy cost and budget priorities",
        aiSummaryDetailed: "User raises valid concerns about the significant financial investment required, questioning whether this policy should be prioritized over other pressing issues. This reflects common public concerns about government spending.",
        aiSentimentScore: "-0.6",
        keywords: ["cost", "budget", "concerns"],
        createdAt: new Date() 
      },
      { 
        id: "comment-3", 
        userId: null,
        policyId: "policy-1", 
        text: "Why not include nuclear energy as part of the clean energy mix? It's reliable and carbon-free.", 
        mood: "suggestion",
        aiSummaryShort: "Suggestion to include nuclear energy in the policy",
        aiSummaryDetailed: "User provides a constructive suggestion to expand the clean energy approach by including nuclear energy, citing its reliability and carbon-free benefits. This shows engagement with the technical aspects of the policy.",
        aiSentimentScore: "0.3",
        keywords: ["nuclear energy", "clean energy", "reliable"],
        createdAt: new Date() 
      },
      { 
        id: "comment-4", 
        userId: null,
        policyId: "policy-1", 
        text: "The 10-year timeline is reasonable, but we need more details on the implementation phases.", 
        mood: "neutral",
        aiSummaryShort: "Neutral feedback requesting more implementation details",
        aiSummaryDetailed: "User accepts the overall timeline but requests more detailed information about how the policy will be implemented in phases. This indicates a desire for transparency and planning clarity.",
        aiSentimentScore: "0.1",
        keywords: ["timeline", "implementation", "details"],
        createdAt: new Date() 
      },
      { 
        id: "comment-5", 
        userId: null,
        policyId: "policy-1", 
        text: "Love the community solar programs! This will help low-income families access clean energy.", 
        mood: "happy",
        aiSummaryShort: "Positive feedback about community solar programs",
        aiSummaryDetailed: "User expresses strong support specifically for the community solar programs, highlighting their potential to help low-income families access clean energy. This shows appreciation for the equity aspects of the policy.",
        aiSentimentScore: "0.9",
        keywords: ["community solar", "low-income", "clean energy"],
        createdAt: new Date() 
      },
    ];

    sampleComments.forEach(comment => this.comments.set(comment.id, comment));
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "user",
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Policy methods
  async getPolicies(): Promise<Policy[]> {
    return Array.from(this.policies.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getPolicy(id: string): Promise<Policy | undefined> {
    return this.policies.get(id);
  }

  async createPolicy(insertPolicy: InsertPolicy): Promise<Policy> {
    const id = randomUUID();
    const policy: Policy = { 
      ...insertPolicy,
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      benefits: null,
      eligibility: null,
      faqs: null,
      aiExtracted: false,
      extractedAt: null,
    };
    this.policies.set(id, policy);
    return policy;
  }

  async updatePolicy(id: string, updates: Partial<Policy>): Promise<Policy | undefined> {
    const existingPolicy = this.policies.get(id);
    if (!existingPolicy) return undefined;
    
    const updatedPolicy = { ...existingPolicy, ...updates, updatedAt: new Date() };
    this.policies.set(id, updatedPolicy);
    return updatedPolicy;
  }

  async deletePolicy(id: string): Promise<boolean> {
    return this.policies.delete(id);
  }

  // Vote methods
  async getVotes(): Promise<Vote[]> {
    return Array.from(this.votes.values());
  }

  async getVotesByPolicy(policyId: string): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(vote => vote.policyId === policyId);
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = randomUUID();
    const vote: Vote = { 
      ...insertVote,
      id, 
      createdAt: new Date() 
    };
    this.votes.set(id, vote);
    return vote;
  }

  async getVoteStats(policyId: string): Promise<{ [key: string]: number }> {
    const votes = await this.getVotesByPolicy(policyId);
    const stats = {
      happy: 0,
      angry: 0,
      neutral: 0,
      suggestion: 0,
    };

    votes.forEach(vote => {
      if (stats.hasOwnProperty(vote.mood)) {
        stats[vote.mood as keyof typeof stats]++;
      }
    });

    return stats;
  }

  // Comment methods
  async getComments(): Promise<Comment[]> {
    return Array.from(this.comments.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getCommentsByPolicy(policyId: string, options?: { page?: number; limit?: number; sort?: string }): Promise<Comment[]> {
    let comments = Array.from(this.comments.values())
      .filter(comment => comment.policyId === policyId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    if (options?.page && options?.limit) {
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      comments = comments.slice(startIndex, endIndex);
    }

    return comments;
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const comment: Comment = { 
      ...insertComment,
      id,
      aiSummaryShort: null,
      aiSummaryDetailed: null,
      aiSentimentScore: null,
      keywords: null,
      createdAt: new Date() 
    };
    this.comments.set(id, comment);
    return comment;
  }

  async updateComment(id: string, updates: Partial<Comment>): Promise<Comment | undefined> {
    const existingComment = this.comments.get(id);
    if (!existingComment) return undefined;
    
    const updatedComment = { ...existingComment, ...updates };
    this.comments.set(id, updatedComment);
    return updatedComment;
  }

  // CSV Job methods
  async createCsvJob(job: InsertCsvJob): Promise<CsvJob> {
    const id = randomUUID();
    const csvJob: CsvJob = { 
      ...job,
      id,
      createdAt: new Date(),
      finishedAt: null
    };
    this.csvJobs.set(id, csvJob);
    return csvJob;
  }

  async getCsvJob(id: string): Promise<CsvJob | undefined> {
    return this.csvJobs.get(id);
  }

  async updateCsvJob(id: string, updates: Partial<CsvJob>): Promise<CsvJob | undefined> {
    const existingJob = this.csvJobs.get(id);
    if (!existingJob) return undefined;
    
    const updatedJob = { ...existingJob, ...updates };
    this.csvJobs.set(id, updatedJob);
    return updatedJob;
  }

  async getCsvJobsByPolicy(policyId: string): Promise<CsvJob[]> {
    return Array.from(this.csvJobs.values())
      .filter(job => job.policyId === policyId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  // Geographical data method
  async getGeographicalData(policyId?: string): Promise<any> {
    const votes = Array.from(this.votes.values());
    const comments = Array.from(this.comments.values());
    
    // Filter by policy if specified
    const filteredVotes = policyId ? votes.filter(v => v.policyId === policyId) : votes;
    const filteredComments = policyId ? comments.filter(c => c.policyId === policyId) : comments;
    
    // Aggregate data by city/state
    const geoData: Record<string, any> = {};
    
    // Process votes
    filteredVotes.forEach(vote => {
      if (!vote.city || !vote.state) return;
      
      const key = `${vote.city}, ${vote.state}`;
      if (!geoData[key]) {
        geoData[key] = {
          city: vote.city,
          state: vote.state,
          lat: vote.lat,
          lng: vote.lon,
          happy: 0,
          angry: 0,
          neutral: 0,
          suggestion: 0,
          total: 0
        };
      }
      
      geoData[key][vote.mood]++;
      geoData[key].total++;
    });
    
    // Process comments for additional sentiment data
    filteredComments.forEach(comment => {
      // This would need to be enhanced based on comment location data
      // For now, we'll use the vote data
    });
    
    return Object.values(geoData);
  }
}

// PostgreSQL Storage Implementation
export class PostgreSQLStorage implements IStorage {
  private db;
  
  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Policy methods
  async getPolicies(): Promise<Policy[]> {
    const result = await this.db.select().from(policies).orderBy(desc(policies.createdAt));
    return result;
  }

  async getPolicy(id: string): Promise<Policy | undefined> {
    const result = await this.db.select().from(policies).where(eq(policies.id, id)).limit(1);
    return result[0];
  }

  async createPolicy(insertPolicy: InsertPolicy): Promise<Policy> {
    const result = await this.db.insert(policies).values({
      ...insertPolicy,
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updatePolicy(id: string, updates: Partial<Policy>): Promise<Policy | undefined> {
    const result = await this.db.update(policies).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(policies.id, id)).returning();
    return result[0];
  }

  async deletePolicy(id: string): Promise<boolean> {
    const result = await this.db.delete(policies).where(eq(policies.id, id)).returning();
    return result.length > 0;
  }

  // Vote methods
  async getVotes(): Promise<Vote[]> {
    const result = await this.db.select().from(votes).orderBy(desc(votes.createdAt));
    return result;
  }

  async getVotesByPolicy(policyId: string): Promise<Vote[]> {
    const result = await this.db.select().from(votes).where(eq(votes.policyId, policyId));
    return result;
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const result = await this.db.insert(votes).values(insertVote).returning();
    return result[0];
  }

  async getVoteStats(policyId: string): Promise<{ [key: string]: number }> {
    const policyVotes = await this.getVotesByPolicy(policyId);
    const stats = { happy: 0, angry: 0, neutral: 0, suggestion: 0 };
    
    policyVotes.forEach(vote => {
      if (stats.hasOwnProperty(vote.mood)) {
        stats[vote.mood as keyof typeof stats]++;
      }
    });
    
    return stats;
  }

  // Comment methods
  async getComments(): Promise<Comment[]> {
    const result = await this.db.select().from(comments).orderBy(desc(comments.createdAt));
    return result;
  }

  async getCommentsByPolicy(policyId: string, options?: { page?: number; limit?: number; sort?: string }): Promise<Comment[]> {
    let query = this.db.select().from(comments).where(eq(comments.policyId, policyId));
    
    if (options?.sort === 'newest') {
      query = query.orderBy(desc(comments.createdAt));
    } else {
      query = query.orderBy(desc(comments.createdAt));
    }
    
    if (options?.page && options?.limit) {
      const offset = (options.page - 1) * options.limit;
      query = query.limit(options.limit).offset(offset);
    }
    
    return await query;
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const result = await this.db.insert(comments).values(insertComment).returning();
    return result[0];
  }

  async updateComment(id: string, updates: Partial<Comment>): Promise<Comment | undefined> {
    const result = await this.db.update(comments).set(updates).where(eq(comments.id, id)).returning();
    return result[0];
  }

  // CSV Job methods
  async createCsvJob(job: InsertCsvJob): Promise<CsvJob> {
    const result = await this.db.insert(csvJobs).values(job).returning();
    return result[0];
  }

  async getCsvJob(id: string): Promise<CsvJob | undefined> {
    const result = await this.db.select().from(csvJobs).where(eq(csvJobs.id, id)).limit(1);
    return result[0];
  }

  async updateCsvJob(id: string, updates: Partial<CsvJob>): Promise<CsvJob | undefined> {
    const result = await this.db.update(csvJobs).set(updates).where(eq(csvJobs.id, id)).returning();
    return result[0];
  }

  async getCsvJobsByPolicy(policyId: string): Promise<CsvJob[]> {
    const result = await this.db.select().from(csvJobs)
      .where(eq(csvJobs.policyId, policyId))
      .orderBy(desc(csvJobs.createdAt));
    return result;
  }

  // Geographical data methods
  async getGeographicalData(policyId?: string): Promise<any> {
    // Get votes with location data
    let voteQuery = this.db.select({
      city: votes.city,
      state: votes.state,
      lat: votes.lat,
      lon: votes.lon,
      mood: votes.mood,
      policyId: votes.policyId
    }).from(votes);
    
    if (policyId) {
      voteQuery = voteQuery.where(eq(votes.policyId, policyId));
    }
    
    const voteResults = await voteQuery;
    
    // Aggregate data by city/state
    const geoData: Record<string, any> = {};
    
    voteResults.forEach(vote => {
      if (!vote.city || !vote.state) return;
      
      const key = `${vote.city}, ${vote.state}`;
      if (!geoData[key]) {
        geoData[key] = {
          city: vote.city,
          state: vote.state,
          lat: vote.lat,
          lng: vote.lon,
          happy: 0,
          angry: 0,
          neutral: 0,
          suggestion: 0,
          total: 0
        };
      }
      
      geoData[key][vote.mood]++;
      geoData[key].total++;
    });
    
    return Object.values(geoData);
  }

}

// Use PostgreSQL storage instead of MemStorage
export const storage = new PostgreSQLStorage();
