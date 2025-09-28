import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPolicySchema, insertVoteSchema, insertCommentSchema, insertUserSchema, loginUserSchema, insertCsvJobSchema } from "@shared/schema";
import { AuthService, authMiddleware, adminMiddleware, optionalAuthMiddleware, AuthenticatedRequest, authRateLimit } from "./auth";
import { z } from "zod";
import axios from "axios";
import { marked } from "marked";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import multer from "multer";
import { parse } from "csv-parse/sync";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { getQueueService } from './queue.js';

// Queue service for CSV processing

// AI processing function for individual comments
export async function processAIForComment(commentId: string, commentText: string, storageInstance?: IStorage) {
  const storageToUse = storageInstance || storage;
  
  try {
    const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
      contents: [{
        parts: [{
          text: `Analyze this comment about a government policy: "${commentText}"

Please provide:
1. Sentiment score (0-100, where 0 is very negative, 50 is neutral, 100 is very positive)
2. Short summary (1-2 sentences)
3. Detailed summary (2-3 paragraphs)
4. Key keywords (comma-separated list of 5-10 important words/phrases)

Format your response as JSON:
{
  "sentimentScore": number,
  "shortSummary": "string",
  "detailedSummary": "string",
  "keywords": ["string1", "string2", ...]
}`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY
      }
    });

    const aiResponse = response.data.candidates[0].content.parts[0].text;
    
    // Parse AI response
    let aiData;
    try {
      aiData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      return;
    }

    // Update comment with AI analysis
    await storageToUse.updateComment(commentId, {
      aiSentimentScore: aiData.sentimentScore,
      aiSummaryShort: aiData.shortSummary,
      aiSummaryDetailed: aiData.detailedSummary,
      keywords: aiData.keywords
    });

    console.log(`AI analysis completed for comment ${commentId}`);
    
  } catch (error) {
    console.error(`AI analysis failed for comment ${commentId}:`, error);
  }
}


// Configure multer for CSV file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit(authRateLimit);
  
  // Authentication Routes
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: validation.error.issues 
        });
      }

      const { name, email, password, role } = validation.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);

      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password and create user
      const hashedPassword = await AuthService.hashPassword(password);
      const newUser = await storage.createUser({
        name,
        email,
        passwordHash: hashedPassword,
        role: role || "user",
      });

      // Generate tokens
      const accessToken = AuthService.generateAccessToken({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      });
      
      const refreshToken = AuthService.generateRefreshToken({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      });

      // Set httpOnly cookies
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const validation = loginUserSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: validation.error.issues 
        });
      }

      const { email, password } = validation.data;

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await AuthService.verifyPassword(password, user.passwordHash);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate tokens
      const accessToken = AuthService.generateAccessToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      
      const refreshToken = AuthService.generateRefreshToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      // Set httpOnly cookies
      AuthService.setAuthCookies(res, accessToken, refreshToken);

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const refreshToken = AuthService.getTokenFromCookies(req, 'refresh');
      
      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not found' });
      }

      const decoded = AuthService.verifyRefreshToken(refreshToken);
      
      if (!decoded || decoded.type !== 'refresh') {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      // Get user from database
      const user = await storage.getUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Generate new access token
      const newAccessToken = AuthService.generateAccessToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      // Set new access token cookie
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/'
      });

      res.json({
        message: "Token refreshed successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(401).json({ message: 'Token refresh failed' });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    AuthService.clearAuthCookies(res);
    res.json({ message: "Logout successful" });
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
    res.json({
      user: req.user,
    });
  });
  
  // Get all policies with search, category, and sort functionality
  app.get("/api/policies", async (req, res) => {
    try {
      const { search, category, sort, page = "1", limit = "10" } = req.query;
      const policies = await storage.getPolicies();
      
      let filteredPolicies = [...policies];
      
      // Search functionality
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        filteredPolicies = filteredPolicies.filter(policy => 
          policy.title.toLowerCase().includes(searchLower) ||
          policy.description.toLowerCase().includes(searchLower) ||
          (policy.details && policy.details.toLowerCase().includes(searchLower))
        );
      }
      
      // Category filtering
      if (category && typeof category === 'string') {
        filteredPolicies = filteredPolicies.filter(policy => 
          policy.title.toLowerCase().includes(category.toLowerCase()) ||
          policy.description.toLowerCase().includes(category.toLowerCase())
        );
      }
      
      // Sorting
      if (sort === 'trending') {
        // Sort by comment/vote activity in last 7 days - for now, sort by createdAt DESC
        filteredPolicies.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      } else if (sort === 'latest') {
        filteredPolicies.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      }
      
      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      
      const paginatedPolicies = filteredPolicies.slice(startIndex, endIndex);
      
      res.json({
        policies: paginatedPolicies,
        pagination: {
          current: pageNum,
          total: Math.ceil(filteredPolicies.length / limitNum),
          count: filteredPolicies.length,
          hasNext: endIndex < filteredPolicies.length,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch policies" });
    }
  });

  // Get vote statistics for all policies (must come before parameterized route)
  app.get("/api/policies/all-stats", async (req, res) => {
    try {
      const policies = await storage.getPolicies();
      const allStats: Record<string, any> = {};
      
      // For each policy, get its vote stats
      for (const policy of policies) {
        const votes = await storage.getVotesByPolicy(policy.id);
        const stats = {
          happy: votes.filter(v => v.voteType === 'happy').length,
          angry: votes.filter(v => v.voteType === 'angry').length,
          neutral: votes.filter(v => v.voteType === 'neutral').length,
          suggestion: votes.filter(v => v.voteType === 'suggestion').length
        };
        allStats[policy.id] = stats;
      }
      
      res.json(allStats);
    } catch (error) {
      console.error("Error fetching all policy stats:", error);
      res.status(500).json({ message: "Failed to fetch policy statistics" });
    }
  });

  // Get policy summary statistics (must come before parameterized route)
  app.get("/api/policies/summary", async (req, res) => {
    try {
      const policies = await storage.getPolicies();
      
      // Count total policies
      const totalCount = policies.length;
      
      // Count central vs state policies (based on title/description keywords)
      let centralCount = 0;
      let stateCount = 0;
      const categoryCount: Record<string, number> = {};
      
      policies.forEach(policy => {
        const text = `${policy.title} ${policy.description}`.toLowerCase();
        
        // Simple classification based on keywords
        if (text.includes('central') || text.includes('national') || text.includes('india') || text.includes('federal')) {
          centralCount++;
        } else {
          stateCount++;
        }
        
        // Category classification
        if (text.includes('agriculture') || text.includes('farm') || text.includes('crop')) {
          categoryCount['Agriculture'] = (categoryCount['Agriculture'] || 0) + 1;
        } else if (text.includes('business') || text.includes('industry') || text.includes('commerce')) {
          categoryCount['Business'] = (categoryCount['Business'] || 0) + 1;
        } else if (text.includes('health') || text.includes('medical') || text.includes('hospital')) {
          categoryCount['Health'] = (categoryCount['Health'] || 0) + 1;
        } else if (text.includes('education') || text.includes('school') || text.includes('university')) {
          categoryCount['Education'] = (categoryCount['Education'] || 0) + 1;
        } else {
          categoryCount['Other'] = (categoryCount['Other'] || 0) + 1;
        }
      });
      
      const summary = {
        total: totalCount,
        central: centralCount,
        state: stateCount,
        categories: categoryCount
      };
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch policy summary" });
    }
  });

  // Get single policy
  app.get("/api/policies/:id", async (req, res) => {
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


  // Create new policy (Admin only)
  app.post("/api/policies", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
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

  // Update policy (Admin only)
  app.put("/api/policies/:id", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
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

  // Delete policy (Admin only)
  app.delete("/api/policies/:id", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
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

  // Get votes for a policy
  app.get("/api/policies/:id/votes", async (req, res) => {
    try {
      const votes = await storage.getVotesByPolicy(req.params.id);
      res.json(votes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

  // Get vote statistics for a policy
  app.get("/api/policies/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getVoteStats(req.params.id);
      const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
      
      const result = {
        stats,
        total,
        percentages: Object.fromEntries(
          Object.entries(stats).map(([type, count]) => [
            type, 
            total > 0 ? Math.round((count / total) * 100) : 0
          ])
        )
      };
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vote statistics" });
    }
  });

  // Submit a vote
  app.post("/api/votes", optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body structure
      const validatedData = insertVoteSchema.parse(req.body);
      
      // Additional validation: Ensure policyId is not empty
      if (!validatedData.policyId?.trim()) {
        return res.status(400).json({ 
          message: "Policy ID is required for all votes",
          error: "MISSING_POLICY_ID" 
        });
      }
      
      // Verify the policy exists
      const policy = await storage.getPolicy(validatedData.policyId);
      if (!policy) {
        return res.status(404).json({ 
          message: "The specified policy does not exist",
          error: "INVALID_POLICY_ID" 
        });
      }
      
      // Add user ID if authenticated
      if (req.user) {
        validatedData.userId = req.user.id;
      }
      
      const vote = await storage.createVote(validatedData);
      
      // Emit real-time update to all clients watching this policy
      const io = (app as any).io;
      if (io) {
        const updatedStats = await storage.getVoteStats(validatedData.policyId);
        io.to(`policy-${validatedData.policyId}`).emit("voteUpdate", {
          vote: vote,
          stats: updatedStats
        });
        io.emit("notification", {
          type: "vote",
          message: `New ${validatedData.mood} vote received`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Check if policyId validation failed
        const policyIdError = error.errors.find(e => e.path.includes('policyId'));
        if (policyIdError) {
          return res.status(400).json({ 
            message: "Policy ID is required and must be valid",
            error: "INVALID_POLICY_ID",
            details: policyIdError.message 
          });
        }
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      console.error("Vote creation error:", error);
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });

  // Get current active policy
  app.get("/api/current-policy", async (req, res) => {
    try {
      const policies = await storage.getPolicies();
      const activePolicy = policies.find(p => p.status === "active");
      if (!activePolicy) {
        return res.status(404).json({ message: "No active policy found" });
      }
      res.json(activePolicy);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current policy" });
    }
  });


  // Get comments for a policy
  app.get("/api/policies/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPolicy(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Submit a comment
  app.post("/api/comments", optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body structure
      const validatedData = insertCommentSchema.parse(req.body);
      
      // Additional validation: Ensure policyId is not empty
      if (!validatedData.policyId?.trim()) {
        return res.status(400).json({ 
          message: "Policy ID is required for all comments",
          error: "MISSING_POLICY_ID" 
        });
      }
      
      // Verify the policy exists
      const policy = await storage.getPolicy(validatedData.policyId);
      if (!policy) {
        return res.status(404).json({ 
          message: "The specified policy does not exist",
          error: "INVALID_POLICY_ID" 
        });
      }
      
      // Add user ID if authenticated
      if (req.user) {
        validatedData.userId = req.user.id;
      }
      
      const comment = await storage.createComment(validatedData);
      
      // Emit real-time update to all clients watching this policy
      const io = (app as any).io;
      if (io) {
        io.to(`policy-${validatedData.policyId}`).emit("commentUpdate", {
          comment: comment
        });
        io.emit("notification", {
          type: "comment",
          message: `New comment: "${validatedData.text.slice(0, 50)}${validatedData.text.length > 50 ? '...' : ''}"`,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Check if policyId validation failed
        const policyIdError = error.errors.find(e => e.path.includes('policyId'));
        if (policyIdError) {
          return res.status(400).json({ 
            message: "Policy ID is required and must be valid",
            error: "INVALID_POLICY_ID",
            details: policyIdError.message 
          });
        }
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      console.error("Comment creation error:", error);
      res.status(500).json({ message: "Failed to submit comment" });
    }
  });

  // Get all comments for AI summary
  app.get("/api/comments", async (req, res) => {
    try {
      const comments = await storage.getComments();
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Get geographical sentiment data for emotion map
  app.get("/api/geographical-data", async (req, res) => {
    try {
      const { policyId } = req.query;
      const geographicalData = await storage.getGeographicalData(policyId as string);
      res.json(geographicalData);
    } catch (error) {
      console.error("Error fetching geographical data:", error);
      res.status(500).json({ message: "Failed to fetch geographical data" });
    }
  });

  // AI Policy Text Extraction for Benefits/Eligibility/FAQs
  app.post("/api/ai/extract-policy", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { policyId } = req.body;
      
      const policy = await storage.getPolicy(policyId);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }

      // Check if already extracted recently (within 24 hours)
      if (policy.aiExtracted && policy.extractedAt) {
        const extractedAt = new Date(policy.extractedAt);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (extractedAt > oneDayAgo) {
          // Try to parse as JSON, fall back to text parsing if needed
          let cachedBenefits = [];
          let cachedEligibility = [];
          let cachedFaqs = [];
          
          try {
            cachedBenefits = policy.benefits ? JSON.parse(policy.benefits) : [];
          } catch {
            // Fallback: parse text format
            if (policy.benefits && typeof policy.benefits === 'string') {
              cachedBenefits = policy.benefits.split('\n').filter(line => line.trim().startsWith('•')).map(line => ({
                title: line.replace('•', '').trim().substring(0, 50),
                description: line.replace('•', '').trim()
              }));
            }
          }
          
          try {
            cachedEligibility = policy.eligibility ? JSON.parse(policy.eligibility) : [];
          } catch {
            if (policy.eligibility && typeof policy.eligibility === 'string') {
              cachedEligibility = policy.eligibility.split('\n').filter(line => line.trim().startsWith('•')).map(line => ({
                criteria: line.replace('•', '').trim().substring(0, 50),
                details: line.replace('•', '').trim()
              }));
            }
          }
          
          try {
            cachedFaqs = policy.faqs ? JSON.parse(policy.faqs) : [];
          } catch {
            if (policy.faqs && typeof policy.faqs === 'string') {
              const faqPairs = policy.faqs.split(/Q:|A:/).filter(text => text.trim());
              for (let i = 0; i < faqPairs.length - 1; i += 2) {
                if (faqPairs[i] && faqPairs[i + 1]) {
                  cachedFaqs.push({
                    question: faqPairs[i].trim(),
                    answer: faqPairs[i + 1].trim()
                  });
                }
              }
            }
          }
          
          return res.json({
            benefits: cachedBenefits,
            eligibility: cachedEligibility,
            faqs: cachedFaqs,
            cached: true
          });
        }
      }

      // Prepare policy text for AI analysis
      const policyText = `
      TITLE: ${policy.title}
      
      DESCRIPTION: ${policy.description}
      
      ${policy.details ? `ADDITIONAL DETAILS: ${policy.details}` : ''}
      `.trim();

      const extractionPrompt = `You are an expert policy analyst. Please analyze the following government policy text and extract structured information in the exact JSON format specified below.

**POLICY TEXT TO ANALYZE:**
${policyText}

**EXTRACTION REQUIREMENTS:**
Extract and categorize information into exactly these three sections:

1. **BENEFITS** - List of specific benefits, advantages, or positive outcomes citizens will receive
2. **ELIGIBILITY** - Criteria, requirements, or qualifications needed to participate/benefit  
3. **FAQS** - Common questions and clear answers that citizens might have

**REQUIRED JSON OUTPUT FORMAT:**
{
  "benefits": [
    {
      "title": "Brief benefit title",
      "description": "Detailed explanation of the benefit"
    }
  ],
  "eligibility": [
    {
      "criteria": "Specific requirement title", 
      "details": "Detailed explanation of the requirement"
    }
  ],
  "faqs": [
    {
      "question": "Common question citizens might ask",
      "answer": "Clear, helpful answer"
    }
  ]
}

**IMPORTANT GUIDELINES:**
- Only extract information that is explicitly mentioned or can be reasonably inferred from the policy text
- If a section cannot be determined from the text, provide an empty array [] for that section
- Each benefit/eligibility/FAQ should be distinct and valuable to citizens
- Keep descriptions clear and citizen-friendly
- Limit to maximum 5 items per section for readability
- Ensure all extracted content is accurate to the source material

**OUTPUT:** Please provide only the JSON object, no additional text or explanations.`;

      try {
        // Use existing Gemini AI integration
        const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
        if (!GOOGLE_AI_API_KEY) {
          throw new Error("Google AI API key not configured");
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GOOGLE_AI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: extractionPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Google AI API error: ${response.status}`);
        }

        const aiResponse = await response.json();
        const extractedText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!extractedText) {
          throw new Error("No response from AI service");
        }

        // Parse the AI response as JSON
        let extractedData;
        try {
          // Clean up the response to ensure it's valid JSON
          const cleanedText = extractedText.replace(/```json\n?|\n?```/g, '').trim();
          extractedData = JSON.parse(cleanedText);
        } catch (parseError) {
          console.error("Failed to parse AI response as JSON:", extractedText);
          throw new Error("AI response format error");
        }

        // Validate the structure
        if (!extractedData.benefits || !extractedData.eligibility || !extractedData.faqs) {
          throw new Error("AI response missing required sections");
        }

        // Update policy with extracted data
        await storage.updatePolicy(policyId, {
          benefits: JSON.stringify(extractedData.benefits),
          eligibility: JSON.stringify(extractedData.eligibility),
          faqs: JSON.stringify(extractedData.faqs),
          aiExtracted: true,
          extractedAt: new Date()
        });

        res.json({
          benefits: extractedData.benefits,
          eligibility: extractedData.eligibility,
          faqs: extractedData.faqs,
          cached: false
        });

      } catch (aiError) {
        console.error("AI extraction error:", aiError);
        
        // Enhanced Fallback: Parse existing structured data if available
        let fallbackData = {
          benefits: [],
          eligibility: [],
          faqs: []
        };

        // If policy already has structured data, try to parse it (JSON first, then text fallback)
        if (policy.benefits || policy.eligibility || policy.faqs) {
          // Try JSON parsing first, then fallback to text parsing
          if (policy.benefits && typeof policy.benefits === 'string') {
            try {
              fallbackData.benefits = JSON.parse(policy.benefits);
            } catch {
              // Fallback: parse text format
              const benefitsText = policy.benefits;
              const benefitsList = benefitsText.split('\n').filter(line => line.trim().startsWith('•')).map(line => ({
                title: line.replace('•', '').trim().split(':')[0] || line.replace('•', '').trim().substring(0, 50),
                description: line.replace('•', '').trim()
              }));
              fallbackData.benefits = benefitsList.slice(0, 5);
            }
          }
          
          if (policy.eligibility && typeof policy.eligibility === 'string') {
            try {
              fallbackData.eligibility = JSON.parse(policy.eligibility);
            } catch {
              // Fallback: parse text format
              const eligibilityText = policy.eligibility;
              const eligibilityList = eligibilityText.split('\n').filter(line => line.trim().startsWith('•')).map(line => ({
                criteria: line.replace('•', '').trim().substring(0, 50),
                details: line.replace('•', '').trim()
              }));
              fallbackData.eligibility = eligibilityList.slice(0, 5);
            }
          }
          
          if (policy.faqs && typeof policy.faqs === 'string') {
            try {
              fallbackData.faqs = JSON.parse(policy.faqs);
            } catch {
              // Fallback: parse text format
              const faqsText = policy.faqs;
              const faqPairs = faqsText.split(/Q:|A:/).filter(text => text.trim());
              const faqsList = [];
              for (let i = 0; i < faqPairs.length - 1; i += 2) {
                if (faqPairs[i] && faqPairs[i + 1]) {
                  faqsList.push({
                    question: faqPairs[i].trim(),
                    answer: faqPairs[i + 1].trim()
                  });
                }
              }
              fallbackData.faqs = faqsList.slice(0, 5);
            }
          }
        }

        res.json({
          ...fallbackData,
          error: "AI extraction temporarily unavailable - using fallback parser",
          cached: false
        });
      }

    } catch (error) {
      console.error("Policy extraction error:", error);
      res.status(500).json({ message: "Failed to extract policy information" });
    }
  });

  // Generate AI insights using Gemini AI
  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { policyId } = req.body;
      
      // Get ALL comments for comprehensive analysis instead of just one policy
      const allComments = await storage.getComments();
      const policies = await storage.getPolicies();
      const activePolicy = policies.find(p => p.id === policyId) || policies.find(p => p.status === "active");
      
      if (!activePolicy) {
        return res.status(404).json({ message: "No active policy found" });
      }

      // Get comprehensive statistics from all comments
      const sentimentBreakdown = allComments.reduce((acc, comment) => {
        const sentiment = comment.sentiment || 'neutral';
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group comments by geographical region for geographical insights
      const geographicalBreakdown = allComments.reduce((acc, comment) => {
        if (comment.state) {
          const key = comment.state;
          if (!acc[key]) acc[key] = { positive: 0, negative: 0, neutral: 0, suggestion: 0, total: 0 };
          acc[key][comment.sentiment as keyof typeof acc[string]]++;
          acc[key].total++;
        }
        return acc;
      }, {} as Record<string, Record<string, number>>);

      // Create chunks of comments for better AI processing (max 100 comments per chunk)
      const chunkSize = 100;
      const commentChunks = [];
      for (let i = 0; i < allComments.length; i += chunkSize) {
        commentChunks.push(allComments.slice(i, i + chunkSize));
      }

      // Prepare comprehensive data for AI analysis
      const totalComments = allComments.length;
      const recentComments = allComments.slice(0, 200); // Analyze most recent 200 comments in detail
      const commentsText = recentComments.map((c, idx) => `${idx + 1}. "${c.content}" (${c.sentiment}, ${c.state || 'Unknown'} - ${c.city || 'Unknown'})`).join('\n');
      
      const query = `As an expert policy analyst for e.Sameekshak (Government Policy Feedback Platform), analyze this comprehensive citizen feedback data:

**DATASET OVERVIEW:**
- Total Comments Analyzed: ${totalComments}
- Sentiment Distribution: ${JSON.stringify(sentimentBreakdown)}
- Geographic Coverage: ${Object.keys(geographicalBreakdown).length} states across India
- Analysis Focus: ${activePolicy.title}

**DETAILED FEEDBACK (Sample of ${recentComments.length} most recent comments):**
${commentsText}

**GEOGRAPHICAL SENTIMENT BREAKDOWN:**
${Object.entries(geographicalBreakdown).slice(0, 10).map(([state, data]) => 
  `${state}: ${data.total} comments (Positive: ${data.positive}, Negative: ${data.negative}, Neutral: ${data.neutral}, Suggestions: ${data.suggestion || 0})`
).join('\n')}

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

      // Call Gemini AI API
      if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({ message: "Google API key not configured" });
      }

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
        {
          contents: [{
            parts: [{
              text: query
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GOOGLE_AI_API_KEY
          },
          timeout: 30000
        }
      );

      // Use marked library to convert markdown to clean, safe HTML for beautiful rendering
      const rawSummary = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "AI analysis could not be generated at this time.";
      
      // Configure marked for clean HTML output
      marked.setOptions({
        breaks: true,
        gfm: true
      });
      
      // Convert markdown to HTML
      const htmlOutput = await marked(rawSummary);
      
      // Set up DOMPurify for server-side HTML sanitization
      const window = new JSDOM('').window;
      const DOMPurify = createDOMPurify(window as any);
      
      // Sanitize HTML while preserving formatting structure
      let cleanedSummary = DOMPurify.sanitize(htmlOutput, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'br', 'strong', 'em'],
        ALLOWED_ATTR: []
      });
      
      // BULLETPROOF asterisk elimination - catch every possible pattern
      cleanedSummary = cleanedSummary
        // Remove all standalone asterisks
        .replace(/\*/g, '')
        // Clean up any double spaces left behind
        .replace(/\s+/g, ' ')
        // Clean up any orphaned spaces at line starts
        .replace(/^\s+/gm, '')
        .trim();

      // Get vote statistics for the active policy
      const voteStats = await storage.getVoteStats(activePolicy.id);

      const insights = {
        summary: cleanedSummary,
        analysisDate: new Date().toISOString(),
        source: "Google Gemini AI",
        dataPoints: {
          totalComments: allComments.length,
          totalVotes: Object.values(voteStats).reduce((sum: number, count: number) => sum + count, 0),
          voteBreakdown: voteStats
        }
      };

      res.json(insights);
    } catch (error) {
      console.error('AI Insights Error:', error);
      
      // Fallback response if API fails
      const fallbackInsights = {
        summary: "AI analysis is temporarily unavailable. Based on the available data, this policy has received mixed feedback from citizens. Please review the individual comments and voting patterns for detailed insights.",
        analysisDate: new Date().toISOString(),
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

  // CSV Upload Endpoints with Background Job Processing
  
  // Upload CSV file and start background processing
  app.post("/api/uploadCSV", authMiddleware, adminMiddleware, upload.single('csvFile'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const { policyId } = req.query;
      if (!policyId) {
        return res.status(400).json({ message: "Policy ID is required" });
      }

      // Verify policy exists
      const policy = await storage.getPolicy(policyId as string);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }

      // Generate unique job ID
      const jobId = `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Parse CSV to validate structure and count records
      let csvData: any[];
      try {
        csvData = parse(req.file.buffer.toString(), {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
      } catch (error) {
        return res.status(400).json({ 
          message: "Invalid CSV file format", 
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }

      // Validate CSV headers
      const requiredHeaders = ['commentId', 'text', 'author', 'city', 'state', 'lat', 'lon', 'createdAt'];
      const csvHeaders = Object.keys(csvData[0] || {});
      const missingHeaders = requiredHeaders.filter(header => !csvHeaders.includes(header));
      
      if (missingHeaders.length > 0) {
        return res.status(400).json({
          message: "Missing required CSV headers",
          missingHeaders,
          requiredHeaders,
          foundHeaders: csvHeaders
        });
      }

      // Create job entry in database
      const csvJob = await storage.createCsvJob({
        policyId: policyId as string,
        filename: req.file.originalname,
        uploaderId: req.user!.id,
        status: 'queued',
        totalRows: csvData.length,
        processedRows: 0,
        errors: []
      });

      // Add job to queue for background processing
      const queueService = getQueueService(storage);
      await queueService.addCSVJob({
        jobId: csvJob.id,
        policyId: policyId as string,
        filename: req.file.originalname,
        uploaderId: req.user!.id,
        csvData
      });

      res.status(202).json({
        message: "CSV upload started",
        jobId: csvJob.id,
        totalRecords: csvData.length,
        status: csvJob.status
      });

    } catch (error) {
      console.error("CSV upload error:", error);
      res.status(500).json({ message: "Failed to process CSV upload" });
    }
  });

  // Get CSV job status
  app.get("/api/csvJobs/:jobId", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getCsvJob(jobId);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Get additional queue information
      const queueService = getQueueService(storage);
      const queueJob = await queueService.getJobStatus(jobId);
      
      res.json({
        id: job.id,
        status: job.status,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        errors: job.errors,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
        progress: job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0,
        queueStatus: queueJob ? {
          id: queueJob.id,
          progress: queueJob.progress(),
          attempts: queueJob.attemptsMade,
          failedReason: queueJob.failedReason,
          processedOn: queueJob.processedOn,
          finishedOn: queueJob.finishedOn
        } : null
      });
    } catch (error) {
      console.error("Job status error:", error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });

  // List all CSV jobs for admin
  app.get("/api/csvJobs", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { policyId } = req.query;
      
      let jobs;
      if (policyId) {
        jobs = await storage.getCsvJobsByPolicy(policyId as string);
      } else {
        // Get all jobs (would need to implement getAllCsvJobs in storage)
        jobs = [];
      }

      res.json({
        jobs: jobs.map(job => ({
          id: job.id,
          status: job.status,
          totalRows: job.totalRows,
          processedRows: job.processedRows,
          errors: job.errors,
          createdAt: job.createdAt,
          finishedAt: job.finishedAt,
          progress: job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0
        }))
      });
    } catch (error) {
      console.error("Jobs list error:", error);
      res.status(500).json({ message: "Failed to get jobs list" });
    }
  });

  // Core API Endpoints for frontend integration
  
  // GET /api/results - Aggregated mood counts and breakdown by state/city
  app.get("/api/results", async (req, res) => {
    try {
      const { policyId, state, city } = req.query;
      
      if (!policyId) {
        return res.status(400).json({ message: "policyId is required" });
      }

      // Get all votes for the policy
      const votes = await storage.getVotesByPolicy(policyId as string);
      const comments = await storage.getCommentsByPolicy(policyId as string);

      // Filter by location if specified
      const filteredVotes = votes.filter(vote => {
        if (state && vote.state !== state) return false;
        if (city && vote.city !== city) return false;
        return true;
      });

      const filteredComments = comments.filter(comment => {
        if (state && comment.state !== state) return false;
        if (city && comment.city !== city) return false;
        return true;
      });

      // Aggregate mood counts
      const moodCounts = {
        happy: filteredVotes.filter(v => v.voteType === 'happy').length,
        angry: filteredVotes.filter(v => v.voteType === 'angry').length,
        neutral: filteredVotes.filter(v => v.voteType === 'neutral').length,
        suggestion: filteredVotes.filter(v => v.voteType === 'suggestion').length,
      };

      // Breakdown by state
      const byState: Record<string, any> = {};
      filteredVotes.forEach(vote => {
        if (vote.state) {
          if (!byState[vote.state]) {
            byState[vote.state] = { happy: 0, angry: 0, neutral: 0, suggestion: 0, total: 0 };
          }
          byState[vote.state][vote.voteType]++;
          byState[vote.state].total++;
        }
      });

      // Breakdown by city
      const byCity: Record<string, any> = {};
      filteredVotes.forEach(vote => {
        if (vote.city) {
          const cityKey = `${vote.city}, ${vote.state || 'Unknown'}`;
          if (!byCity[cityKey]) {
            byCity[cityKey] = { happy: 0, angry: 0, neutral: 0, suggestion: 0, total: 0 };
          }
          byCity[cityKey][vote.voteType]++;
          byCity[cityKey].total++;
        }
      });

      res.json({
        moodCounts,
        byState,
        byCity,
        totalVotes: filteredVotes.length,
        totalComments: filteredComments.length,
        filters: {
          policyId: policyId as string,
          state: state as string || null,
          city: city as string || null
        },
        sampleComments: filteredComments.slice(0, 5).map(c => ({
          content: c.content,
          sentiment: c.sentiment,
          location: `${c.city || ''}, ${c.state || ''}`.trim().replace(/^,\s*/, ''),
          createdAt: c.createdAt
        }))
      });
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  // GET /api/summary - Structured summary with categorized insights
  app.get("/api/summary", async (req, res) => {
    try {
      const { policyId } = req.query;
      
      if (!policyId) {
        return res.status(400).json({ message: "policyId is required" });
      }

      const comments = await storage.getCommentsByPolicy(policyId as string);
      const votes = await storage.getVotesByPolicy(policyId as string);

      // Categorize comments by sentiment with aggregated counts
      const angryComments = comments.filter(c => c.sentiment === 'negative' || c.sentiment === 'angry');
      const positiveComments = comments.filter(c => c.sentiment === 'positive');
      const suggestionComments = comments.filter(c => c.sentiment === 'suggestion' || c.content.toLowerCase().includes('suggest'));
      const neutralComments = comments.filter(c => c.sentiment === 'neutral');

      // Aggregated sentiment counts
      const sentimentCounts = {
        angry: angryComments.length,
        positive: positiveComments.length,
        suggestion: suggestionComments.length,
        neutral: neutralComments.length,
        total: comments.length
      };

      // Vote breakdown
      const voteBreakdown = {
        happy: votes.filter(v => v.voteType === 'happy').length,
        angry: votes.filter(v => v.voteType === 'angry').length,
        neutral: votes.filter(v => v.voteType === 'neutral').length,
        suggestion: votes.filter(v => v.voteType === 'suggestion').length,
        total: votes.length
      };

      const angryConcerns = angryComments.slice(0, 10).map(c => ({
        summary: c.content.slice(0, 100) + (c.content.length > 100 ? '...' : ''),
        examples: [c.content],
        count: 1,
        location: `${c.city || ''}, ${c.state || ''}`.trim().replace(/^,\s*/, '')
      }));

      const positiveFeedback = positiveComments.slice(0, 10).map(c => ({
        summary: c.content.slice(0, 100) + (c.content.length > 100 ? '...' : ''),
        examples: [c.content],
        count: 1,
        location: `${c.city || ''}, ${c.state || ''}`.trim().replace(/^,\s*/, '')
      }));

      const suggestions = suggestionComments.slice(0, 10).map(c => ({
        summary: c.content.slice(0, 100) + (c.content.length > 100 ? '...' : ''),
        examples: [c.content],
        count: 1,
        location: `${c.city || ''}, ${c.state || ''}`.trim().replace(/^,\s*/, '')
      }));

      // Extract keywords with advanced processing
      const allText = comments.map(c => c.content).join(' ').toLowerCase();
      const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an', 'policy', 'government']);
      
      const words = allText
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word) && !/^\d+$/.test(word));

      const wordCounts: Record<string, number> = {};
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });

      const keywords = Object.entries(wordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([word, count]) => ({ word, weight: count, frequency: count }));

      res.json({
        angryConcerns,
        positiveFeedback,
        suggestions,
        keywords,
        sentimentCounts,
        voteBreakdown,
        meta: {
          processedAt: new Date().toISOString(),
          sourceCount: comments.length,
          totalVotes: votes.length,
          policyId: policyId as string,
          timeframe: {
            startDate: comments.length > 0 ? new Date(Math.min(...comments.map(c => new Date(c.createdAt!).getTime()))).toISOString() : null,
            endDate: comments.length > 0 ? new Date(Math.max(...comments.map(c => new Date(c.createdAt!).getTime()))).toISOString() : null
          },
          coverage: {
            uniqueStates: [...new Set(comments.map(c => c.state).filter(Boolean))].length,
            uniqueCities: [...new Set(comments.map(c => c.city).filter(Boolean))].length
          }
        }
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  // GET /api/wordcloud - Word cloud data with weights
  app.get("/api/wordcloud", async (req, res) => {
    try {
      const { policyId } = req.query;
      
      if (!policyId) {
        return res.status(400).json({ message: "policyId is required" });
      }

      const comments = await storage.getCommentsByPolicy(policyId as string);
      
      // Extract and process words from all comments
      const allText = comments.map(c => c.content).join(' ').toLowerCase();
      
      // Remove common stop words and filter
      const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an']);
      
      const words = allText
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word) && !/^\d+$/.test(word)); // Filter out numbers and short words

      // Count word frequencies
      const wordCounts: Record<string, number> = {};
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });

      // Sort by frequency and take top words
      const wordCloudData = Object.entries(wordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 50)
        .map(([word, count]) => ({
          word,
          weight: count,
          fontSize: Math.min(Math.max(count * 3 + 10, 12), 48) // Scale font size
        }));

      res.json(wordCloudData);
    } catch (error) {
      console.error("Error generating wordcloud:", error);
      res.status(500).json({ message: "Failed to generate wordcloud data" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
