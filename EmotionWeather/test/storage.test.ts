import { describe, it, expect, beforeEach } from 'vitest'
import { MemStorage } from '../server/storage'
import { insertUserSchema, insertPolicySchema, insertVoteSchema, insertCommentSchema } from '../shared/schema'

describe('MemStorage', () => {
  let storage: MemStorage

  beforeEach(() => {
    storage = new MemStorage()
  })

  describe('User Management', () => {
    it('should create a user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user' as const
      }

      const user = await storage.createUser(userData)

      expect(user).toMatchObject({
        name: userData.name,
        email: userData.email,
        role: userData.role
      })
      expect(user.id).toBeDefined()
      expect(user.createdAt).toBeDefined()
    })

    it('should get user by email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user' as const
      }

      const createdUser = await storage.createUser(userData)
      const foundUser = await storage.getUserByEmail(userData.email)

      expect(foundUser).toEqual(createdUser)
    })

    it('should return null for non-existent user', async () => {
      const user = await storage.getUserByEmail('nonexistent@example.com')
      expect(user).toBeNull()
    })
  })

  describe('Policy Management', () => {
    it('should create a policy', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft' as const,
        category: 'health' as const,
        scope: 'central' as const,
        meta: { tags: ['test'] }
      }

      const policy = await storage.createPolicy(policyData)

      expect(policy).toMatchObject({
        title: policyData.title,
        description: policyData.description,
        status: policyData.status,
        category: policyData.category,
        scope: policyData.scope,
        meta: policyData.meta
      })
      expect(policy.id).toBeDefined()
      expect(policy.createdAt).toBeDefined()
      expect(policy.updatedAt).toBeDefined()
    })

    it('should get all policies', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft' as const,
        category: 'health' as const,
        scope: 'central' as const,
        meta: {}
      }

      await storage.createPolicy(policyData)
      const policies = await storage.getPolicies()

      expect(policies.length).toBeGreaterThan(0)
      expect(policies[0]).toMatchObject(policyData)
    })

    it('should update a policy', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft' as const,
        category: 'health' as const,
        scope: 'central' as const,
        meta: {}
      }

      const createdPolicy = await storage.createPolicy(policyData)
      const updatedPolicy = await storage.updatePolicy(createdPolicy.id, {
        title: 'Updated Policy',
        status: 'active' as const
      })

      expect(updatedPolicy?.title).toBe('Updated Policy')
      expect(updatedPolicy?.status).toBe('active')
      expect(updatedPolicy?.updatedAt).not.toEqual(createdPolicy.updatedAt)
    })
  })

  describe('Vote Management', () => {
    it('should create a vote', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft' as const,
        category: 'health' as const,
        scope: 'central' as const,
        meta: {}
      }

      const policy = await storage.createPolicy(policyData)

      const voteData = {
        policyId: policy.id,
        mood: 'happy' as const,
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777
      }

      const vote = await storage.createVote(voteData)

      expect(vote).toMatchObject({
        policyId: policy.id,
        mood: 'happy',
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777
      })
      expect(vote.id).toBeDefined()
      expect(vote.createdAt).toBeDefined()
    })

    it('should get vote statistics', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft' as const,
        category: 'health' as const,
        scope: 'central' as const,
        meta: {}
      }

      const policy = await storage.createPolicy(policyData)

      // Create multiple votes
      await storage.createVote({
        policyId: policy.id,
        mood: 'happy' as const,
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777
      })

      await storage.createVote({
        policyId: policy.id,
        mood: 'sad' as const,
        city: 'Delhi',
        state: 'Delhi',
        lat: 28.7041,
        lon: 77.1025
      })

      const stats = await storage.getVoteStats(policy.id)

      expect(stats.total).toBe(2)
      expect(stats.breakdown.happy).toBe(1)
      expect(stats.breakdown.sad).toBe(1)
    })
  })

  describe('Comment Management', () => {
    it('should create a comment', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft' as const,
        category: 'health' as const,
        scope: 'central' as const,
        meta: {}
      }

      const policy = await storage.createPolicy(policyData)

      const commentData = {
        policyId: policy.id,
        text: 'This is a test comment',
        mood: 'happy' as const,
        userId: null,
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777
      }

      const comment = await storage.createComment(commentData)

      expect(comment).toMatchObject({
        policyId: policy.id,
        text: 'This is a test comment',
        mood: 'happy',
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777
      })
      expect(comment.id).toBeDefined()
      expect(comment.createdAt).toBeDefined()
    })

    it('should get comments by policy', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft' as const,
        category: 'health' as const,
        scope: 'central' as const,
        meta: {}
      }

      const policy = await storage.createPolicy(policyData)

      await storage.createComment({
        policyId: policy.id,
        text: 'First comment',
        mood: 'happy' as const,
        userId: null
      })

      await storage.createComment({
        policyId: policy.id,
        text: 'Second comment',
        mood: 'sad' as const,
        userId: null
      })

      const comments = await storage.getCommentsByPolicy(policy.id)

      expect(comments.length).toBe(2)
      expect(comments[0].text).toBe('First comment')
      expect(comments[1].text).toBe('Second comment')
    })
  })

  describe('CSV Job Management', () => {
    it('should create a CSV job', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft' as const,
        category: 'health' as const,
        scope: 'central' as const,
        meta: {}
      }

      const policy = await storage.createPolicy(policyData)

      const jobData = {
        policyId: policy.id,
        filename: 'test.csv',
        uploaderId: 'user123',
        status: 'pending' as const,
        totalRows: 100,
        processedRows: 0,
        errors: []
      }

      const job = await storage.createCsvJob(jobData)

      expect(job).toMatchObject({
        policyId: policy.id,
        filename: 'test.csv',
        uploaderId: 'user123',
        status: 'pending',
        totalRows: 100,
        processedRows: 0,
        errors: []
      })
      expect(job.id).toBeDefined()
      expect(job.createdAt).toBeDefined()
    })

    it('should update a CSV job', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft' as const,
        category: 'health' as const,
        scope: 'central' as const,
        meta: {}
      }

      const policy = await storage.createPolicy(policyData)

      const jobData = {
        policyId: policy.id,
        filename: 'test.csv',
        uploaderId: 'user123',
        status: 'pending' as const,
        totalRows: 100,
        processedRows: 0,
        errors: []
      }

      const job = await storage.createCsvJob(jobData)
      const updatedJob = await storage.updateCsvJob(job.id, {
        status: 'processing' as const,
        processedRows: 50
      })

      expect(updatedJob?.status).toBe('processing')
      expect(updatedJob?.processedRows).toBe(50)
    })
  })
})
