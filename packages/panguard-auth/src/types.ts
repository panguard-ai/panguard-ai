/**
 * Type definitions for Panguard Auth
 * @module @panguard-ai/panguard-auth/types
 */

export interface WaitlistEntry {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  role: string | null;
  source: string;
  status: 'pending' | 'approved' | 'rejected';
  verified: number;
  verifyToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistInput {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  source?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin';
  tier: 'free' | 'solo' | 'starter' | 'team' | 'business' | 'enterprise';
  verified: number;
  createdAt: string;
  lastLogin: string | null;
}

export interface UserPublic {
  id: number;
  email: string;
  name: string;
  role: string;
  tier: string;
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface Session {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface WaitlistStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  verified: number;
  todaySignups: number;
  bySource: Record<string, number>;
}

export interface UserAdmin {
  id: number;
  email: string;
  name: string;
  role: string;
  tier: string;
  verified: number;
  createdAt: string;
  lastLogin: string | null;
}

export interface SessionAdmin {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  expiresAt: string;
  createdAt: string;
}

export interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}
