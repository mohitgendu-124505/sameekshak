import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AuthService } from '../server/auth'

// Mock bcrypt
vi.mock('bcrypt')
const mockedBcrypt = vi.mocked(bcrypt)

// Mock jsonwebtoken
vi.mock('jsonwebtoken')
const mockedJwt = vi.mocked(jwt)

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword'
      const hashedPassword = 'hashedpassword123'
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never)
      
      const result = await AuthService.hashPassword(password)
      
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10)
      expect(result).toBe(hashedPassword)
    })
  })

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testpassword'
      const hashedPassword = 'hashedpassword123'
      
      mockedBcrypt.compare.mockResolvedValue(true as never)
      
      const result = await AuthService.verifyPassword(password, hashedPassword)
      
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(true)
    })

    it('should reject an incorrect password', async () => {
      const password = 'wrongpassword'
      const hashedPassword = 'hashedpassword123'
      
      mockedBcrypt.compare.mockResolvedValue(false as never)
      
      const result = await AuthService.verifyPassword(password, hashedPassword)
      
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(false)
    })
  })

  describe('generateAccessToken', () => {
    it('should generate an access token', () => {
      const userId = 'user123'
      const token = 'access-token-123'
      
      mockedJwt.sign.mockReturnValue(token as never)
      
      const result = AuthService.generateAccessToken(userId)
      
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId, type: 'access' },
        'test-secret',
        { expiresIn: '15m' }
      )
      expect(result).toBe(token)
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', () => {
      const userId = 'user123'
      const token = 'refresh-token-123'
      
      mockedJwt.sign.mockReturnValue(token as never)
      
      const result = AuthService.generateRefreshToken(userId)
      
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId, type: 'refresh' },
        'test-refresh-secret',
        { expiresIn: '7d' }
      )
      expect(result).toBe(token)
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = 'valid-access-token'
      const payload = { userId: 'user123', type: 'access' }
      
      mockedJwt.verify.mockReturnValue(payload as never)
      
      const result = AuthService.verifyAccessToken(token)
      
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, 'test-secret')
      expect(result).toEqual(payload)
    })

    it('should throw error for invalid token', () => {
      const token = 'invalid-token'
      
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })
      
      expect(() => AuthService.verifyAccessToken(token)).toThrow('Invalid token')
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = 'valid-refresh-token'
      const payload = { userId: 'user123', type: 'refresh' }
      
      mockedJwt.verify.mockReturnValue(payload as never)
      
      const result = AuthService.verifyRefreshToken(token)
      
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, 'test-refresh-secret')
      expect(result).toEqual(payload)
    })
  })
})
