import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../server/routes'
import { MemStorage } from '../server/storage'

// Mock the storage
vi.mock('../server/storage', () => ({
  storage: new MemStorage()
}))

describe('API Endpoints', () => {
  let app: any

  beforeEach(async () => {
    app = await createApp()
  })

  describe('Authentication Endpoints', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toMatchObject({
        message: 'User registered successfully',
        user: {
          name: userData.name,
          email: userData.email,
          role: 'user'
        }
      })
      expect(response.body.user.id).toBeDefined()
    })

    it('should login with valid credentials', async () => {
      // First register a user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }

      await request(app)
        .post('/api/auth/register')
        .send(userData)

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200)

      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: {
          name: userData.name,
          email: userData.email,
          role: 'user'
        }
      })
      expect(response.headers['set-cookie']).toBeDefined()
    })

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body).toMatchObject({
        error: 'Invalid credentials'
      })
    })
  })

  describe('Policy Endpoints', () => {
    let authToken: string
    let userId: string

    beforeEach(async () => {
      // Register and login a user
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }

      await request(app)
        .post('/api/auth/register')
        .send(userData)

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })

      authToken = loginResponse.headers['set-cookie'][0]
      userId = loginResponse.body.user.id
    })

    it('should create a policy (admin only)', async () => {
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft',
        category: 'health',
        scope: 'central',
        meta: { tags: ['test'] }
      }

      const response = await request(app)
        .post('/api/policies')
        .set('Cookie', authToken)
        .send(policyData)
        .expect(201)

      expect(response.body).toMatchObject({
        title: policyData.title,
        description: policyData.description,
        status: policyData.status,
        category: policyData.category,
        scope: policyData.scope,
        meta: policyData.meta
      })
      expect(response.body.id).toBeDefined()
    })

    it('should get all policies', async () => {
      const response = await request(app)
        .get('/api/policies')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should get policy by ID', async () => {
      // First create a policy
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft',
        category: 'health',
        scope: 'central',
        meta: {}
      }

      const createResponse = await request(app)
        .post('/api/policies')
        .set('Cookie', authToken)
        .send(policyData)

      const policyId = createResponse.body.id

      // Then get it
      const response = await request(app)
        .get(`/api/policies/${policyId}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: policyId,
        title: policyData.title,
        description: policyData.description
      })
    })
  })

  describe('Vote Endpoints', () => {
    let policyId: string

    beforeEach(async () => {
      // Create a policy first
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft',
        category: 'health',
        scope: 'central',
        meta: {}
      }

      const response = await request(app)
        .post('/api/policies')
        .send(policyData)

      policyId = response.body.id
    })

    it('should create a vote', async () => {
      const voteData = {
        policyId,
        mood: 'happy',
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777
      }

      const response = await request(app)
        .post('/api/votes')
        .send(voteData)
        .expect(201)

      expect(response.body).toMatchObject({
        policyId,
        mood: 'happy',
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777
      })
      expect(response.body.id).toBeDefined()
    })

    it('should get vote statistics', async () => {
      // Create some votes first
      await request(app)
        .post('/api/votes')
        .send({
          policyId,
          mood: 'happy',
          city: 'Mumbai',
          state: 'Maharashtra',
          lat: 19.0760,
          lon: 72.8777
        })

      await request(app)
        .post('/api/votes')
        .send({
          policyId,
          mood: 'sad',
          city: 'Delhi',
          state: 'Delhi',
          lat: 28.7041,
          lon: 77.1025
        })

      const response = await request(app)
        .get(`/api/policies/${policyId}/stats`)
        .expect(200)

      expect(response.body).toMatchObject({
        total: 2,
        breakdown: {
          happy: 1,
          sad: 1
        }
      })
    })
  })

  describe('Comment Endpoints', () => {
    let policyId: string

    beforeEach(async () => {
      // Create a policy first
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft',
        category: 'health',
        scope: 'central',
        meta: {}
      }

      const response = await request(app)
        .post('/api/policies')
        .send(policyData)

      policyId = response.body.id
    })

    it('should create a comment', async () => {
      const commentData = {
        policyId,
        text: 'This is a test comment',
        mood: 'happy',
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777
      }

      const response = await request(app)
        .post('/api/comments')
        .send(commentData)
        .expect(201)

      expect(response.body).toMatchObject({
        policyId,
        text: 'This is a test comment',
        mood: 'happy',
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777
      })
      expect(response.body.id).toBeDefined()
    })

    it('should get comments by policy', async () => {
      // Create some comments first
      await request(app)
        .post('/api/comments')
        .send({
          policyId,
          text: 'First comment',
          mood: 'happy'
        })

      await request(app)
        .post('/api/comments')
        .send({
          policyId,
          text: 'Second comment',
          mood: 'sad'
        })

      const response = await request(app)
        .get(`/api/policies/${policyId}/comments`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(2)
    })
  })

  describe('Geographical Data Endpoint', () => {
    let policyId: string

    beforeEach(async () => {
      // Create a policy first
      const policyData = {
        title: 'Test Policy',
        description: 'Test Description',
        status: 'draft',
        category: 'health',
        scope: 'central',
        meta: {}
      }

      const response = await request(app)
        .post('/api/policies')
        .send(policyData)

      policyId = response.body.id

      // Create some votes with location data
      await request(app)
        .post('/api/votes')
        .send({
          policyId,
          mood: 'happy',
          city: 'Mumbai',
          state: 'Maharashtra',
          lat: 19.0760,
          lon: 72.8777
        })

      await request(app)
        .post('/api/votes')
        .send({
          policyId,
          mood: 'sad',
          city: 'Delhi',
          state: 'Delhi',
          lat: 28.7041,
          lon: 77.1025
        })
    })

    it('should get geographical data', async () => {
      const response = await request(app)
        .get(`/api/geographical-data?policyId=${policyId}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      const mumbaiData = response.body.find((item: any) => item.city === 'Mumbai')
      expect(mumbaiData).toBeDefined()
      expect(mumbaiData.lat).toBe(19.0760)
      expect(mumbaiData.lon).toBe(72.8777)
    })
  })
})
