// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var policies = pgTable("policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  details: text("details"),
  status: text("status").notNull().default("draft"),
  // draft, active, under_review, completed
  createdAt: timestamp("created_at").defaultNow()
});
var votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").notNull().references(() => policies.id),
  voteType: text("vote_type").notNull(),
  // happy, angry, neutral, suggestion
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow()
});
var comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").notNull().references(() => policies.id),
  content: text("content").notNull(),
  author: text("author").default("Anonymous"),
  sentiment: text("sentiment").default("neutral"),
  // for AI classification
  state: text("state"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true
});
var insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true
});
var insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  sentiment: true
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});

// server/storage.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
var PostgreSQLStorage = class {
  db;
  constructor() {
    const sql2 = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql2);
  }
  // User methods
  async getUser(id) {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  async createUser(insertUser) {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }
  // Policy methods
  async getPolicies() {
    const result = await this.db.select().from(policies).orderBy(policies.createdAt);
    return result;
  }
  async getPolicy(id) {
    const result = await this.db.select().from(policies).where(eq(policies.id, id)).limit(1);
    return result[0];
  }
  async createPolicy(insertPolicy) {
    const result = await this.db.insert(policies).values(insertPolicy).returning();
    return result[0];
  }
  async updatePolicy(id, updates) {
    const result = await this.db.update(policies).set(updates).where(eq(policies.id, id)).returning();
    return result[0];
  }
  async deletePolicy(id) {
    const result = await this.db.delete(policies).where(eq(policies.id, id)).returning();
    return result.length > 0;
  }
  // Vote methods
  async getVotes() {
    const result = await this.db.select().from(votes).orderBy(votes.createdAt);
    return result;
  }
  async getVotesByPolicy(policyId) {
    const result = await this.db.select().from(votes).where(eq(votes.policyId, policyId));
    return result;
  }
  async createVote(insertVote) {
    const result = await this.db.insert(votes).values(insertVote).returning();
    return result[0];
  }
  async getVoteStats(policyId) {
    const policyVotes = await this.getVotesByPolicy(policyId);
    const stats = { happy: 0, angry: 0, neutral: 0, suggestion: 0 };
    policyVotes.forEach((vote) => {
      if (stats.hasOwnProperty(vote.voteType)) {
        stats[vote.voteType]++;
      }
    });
    return stats;
  }
  // Comment methods
  async getComments() {
    const result = await this.db.select().from(comments).orderBy(comments.createdAt);
    return result;
  }
  async getCommentsByPolicy(policyId) {
    const result = await this.db.select().from(comments).where(eq(comments.policyId, policyId));
    return result;
  }
  async createComment(insertComment) {
    const result = await this.db.insert(comments).values(insertComment).returning();
    return result[0];
  }
  // Geographical data methods
  async getGeographicalData() {
    const result = await this.db.select({
      state: comments.state,
      city: comments.city,
      sentiment: comments.sentiment,
      policyId: comments.policyId,
      content: comments.content
    }).from(comments);
    const geographicalData = {};
    result.forEach((comment) => {
      if (!comment.state || !comment.city) return;
      const key = `${comment.state}-${comment.city}`;
      if (!geographicalData[key]) {
        geographicalData[key] = {
          state: comment.state,
          city: comment.city,
          sentiments: { positive: 0, negative: 0, neutral: 0, suggestion: 0 },
          comments: []
        };
      }
      if (comment.sentiment && comment.sentiment in geographicalData[key].sentiments) {
        geographicalData[key].sentiments[comment.sentiment]++;
      }
      geographicalData[key].comments.push({
        content: comment.content,
        sentiment: comment.sentiment,
        policyId: comment.policyId
      });
    });
    return Object.values(geographicalData);
  }
};
var storage = new PostgreSQLStorage();

// server/routes.ts
import { z } from "zod";
import axios from "axios";
import { marked } from "marked";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
async function registerRoutes(app2) {
  app2.get("/api/policies", async (req, res) => {
    try {
      const policies2 = await storage.getPolicies();
      res.json(policies2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch policies" });
    }
  });
  app2.get("/api/policies/:id", async (req, res) => {
    try {
      const policy = await storage.getPolicy(req.params.id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.json(policy);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch policy" });
    }
  });
  app2.post("/api/policies", async (req, res) => {
    try {
      const validatedData = insertPolicySchema.parse(req.body);
      const policy = await storage.createPolicy(validatedData);
      res.status(201).json(policy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid policy data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create policy" });
    }
  });
  app2.put("/api/policies/:id", async (req, res) => {
    try {
      const updates = req.body;
      const policy = await storage.updatePolicy(req.params.id, updates);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.json(policy);
    } catch (error) {
      res.status(500).json({ message: "Failed to update policy" });
    }
  });
  app2.delete("/api/policies/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePolicy(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete policy" });
    }
  });
  app2.get("/api/policies/:id/votes", async (req, res) => {
    try {
      const votes2 = await storage.getVotesByPolicy(req.params.id);
      res.json(votes2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });
  app2.get("/api/policies/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getVoteStats(req.params.id);
      const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
      const result = {
        stats,
        total,
        percentages: Object.fromEntries(
          Object.entries(stats).map(([type, count]) => [
            type,
            total > 0 ? Math.round(count / total * 100) : 0
          ])
        )
      };
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vote statistics" });
    }
  });
  app2.post("/api/votes", async (req, res) => {
    try {
      const validatedData = insertVoteSchema.parse(req.body);
      const vote = await storage.createVote(validatedData);
      res.status(201).json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });
  app2.get("/api/current-policy", async (req, res) => {
    try {
      const policies2 = await storage.getPolicies();
      const activePolicy = policies2.find((p) => p.status === "active");
      if (!activePolicy) {
        return res.status(404).json({ message: "No active policy found" });
      }
      res.json(activePolicy);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current policy" });
    }
  });
  app2.get("/api/policies/:id/comments", async (req, res) => {
    try {
      const comments2 = await storage.getCommentsByPolicy(req.params.id);
      res.json(comments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  app2.post("/api/comments", async (req, res) => {
    try {
      const validatedData = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit comment" });
    }
  });
  app2.get("/api/comments", async (req, res) => {
    try {
      const comments2 = await storage.getComments();
      res.json(comments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  app2.get("/api/geographical-data", async (req, res) => {
    try {
      const geographicalData = await storage.getGeographicalData();
      res.json(geographicalData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch geographical data" });
    }
  });
  app2.post("/api/ai/insights", async (req, res) => {
    try {
      const { policyId } = req.body;
      const allComments = await storage.getComments();
      const policies2 = await storage.getPolicies();
      const activePolicy = policies2.find((p) => p.id === policyId) || policies2.find((p) => p.status === "active");
      if (!activePolicy) {
        return res.status(404).json({ message: "No active policy found" });
      }
      const sentimentBreakdown = allComments.reduce((acc, comment) => {
        const sentiment = comment.sentiment || "neutral";
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      }, {});
      const geographicalBreakdown = allComments.reduce((acc, comment) => {
        if (comment.state) {
          const key = comment.state;
          if (!acc[key]) acc[key] = { positive: 0, negative: 0, neutral: 0, suggestion: 0, total: 0 };
          acc[key][comment.sentiment]++;
          acc[key].total++;
        }
        return acc;
      }, {});
      const chunkSize = 100;
      const commentChunks = [];
      for (let i = 0; i < allComments.length; i += chunkSize) {
        commentChunks.push(allComments.slice(i, i + chunkSize));
      }
      const totalComments = allComments.length;
      const recentComments = allComments.slice(0, 200);
      const commentsText = recentComments.map((c, idx) => `${idx + 1}. "${c.content}" (${c.sentiment}, ${c.state || "Unknown"} - ${c.city || "Unknown"})`).join("\n");
      const query = `As an expert policy analyst for e.Sameekshak (Government Policy Feedback Platform), analyze this comprehensive citizen feedback data:

**DATASET OVERVIEW:**
- Total Comments Analyzed: ${totalComments}
- Sentiment Distribution: ${JSON.stringify(sentimentBreakdown)}
- Geographic Coverage: ${Object.keys(geographicalBreakdown).length} states across India
- Analysis Focus: ${activePolicy.title}

**DETAILED FEEDBACK (Sample of ${recentComments.length} most recent comments):**
${commentsText}

**GEOGRAPHICAL SENTIMENT BREAKDOWN:**
${Object.entries(geographicalBreakdown).slice(0, 10).map(
        ([state, data]) => `${state}: ${data.total} comments (Positive: ${data.positive}, Negative: ${data.negative}, Neutral: ${data.neutral}, Suggestions: ${data.suggestion || 0})`
      ).join("\n")}

**COMPREHENSIVE ANALYSIS REQUIRED:**

## **1. TOP CONCERNS ANALYSIS**
Identify the 5 most critical issues raised across all regions:
- Issue description and frequency
- Geographic distribution of concern
- Policy impact assessment

## **2. POSITIVE SENTIMENT ANALYSIS** 
Highlight the 5 most appreciated policy aspects:
- Specific positive feedback themes
- Regional variation in appreciation
- Success indicators

## **3. ACTIONABLE RECOMMENDATIONS**
Provide 7 concrete, implementable suggestions:
- Immediate actions (1-3 months)
- Medium-term improvements (3-12 months)  
- Long-term strategic changes (1-3 years)

## **4. GEOGRAPHICAL INSIGHTS**
Regional analysis showing:
- States with highest engagement
- Regional sentiment patterns
- Location-specific concerns

## **5. SENTIMENT TRENDS & PATTERNS**
- Overall public sentiment (${((sentimentBreakdown.positive || 0) / totalComments * 100).toFixed(1)}% positive)
- Key sentiment drivers
- Demographic insights

## **6. POLICY IMPLEMENTATION ROADMAP**
Strategic recommendations for policymakers including:
- Priority areas for immediate attention
- Resource allocation suggestions
- Communication strategy recommendations

**OUTPUT FORMAT:** Structure as a comprehensive policy brief with clear headings, bullet points, and actionable insights. Focus on data-driven recommendations that can improve policy effectiveness and public satisfaction.`;
      if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({ message: "Google API key not configured" });
      }
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: query
            }]
          }]
        },
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: 3e4
        }
      );
      const rawSummary = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "AI analysis could not be generated at this time.";
      marked.setOptions({
        breaks: true,
        gfm: true
      });
      const htmlOutput = await marked(rawSummary);
      const window = new JSDOM("").window;
      const DOMPurify = createDOMPurify(window);
      let cleanedSummary = DOMPurify.sanitize(htmlOutput, {
        ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "br", "strong", "em"],
        ALLOWED_ATTR: []
      });
      cleanedSummary = cleanedSummary.replace(/\*/g, "").replace(/\s+/g, " ").replace(/^\s+/gm, "").trim();
      const voteStats = await storage.getVoteStats(activePolicy.id);
      const insights = {
        summary: cleanedSummary,
        analysisDate: (/* @__PURE__ */ new Date()).toISOString(),
        source: "Google Gemini AI",
        dataPoints: {
          totalComments: allComments.length,
          totalVotes: Object.values(voteStats).reduce((sum, count) => sum + count, 0),
          voteBreakdown: voteStats
        }
      };
      res.json(insights);
    } catch (error) {
      console.error("AI Insights Error:", error);
      const fallbackInsights = {
        summary: "AI analysis is temporarily unavailable. Based on the available data, this policy has received mixed feedback from citizens. Please review the individual comments and voting patterns for detailed insights.",
        analysisDate: (/* @__PURE__ */ new Date()).toISOString(),
        dataPoints: {
          totalComments: 0,
          totalVotes: 0,
          voteBreakdown: { happy: 0, angry: 0, neutral: 0, suggestion: 0 }
        },
        source: "Gemini Fallback Analysis",
        error: "AI service unavailable"
      };
      res.json(fallbackInsights);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
