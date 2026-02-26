import { describe, it, expect } from 'vitest';
import {
  getGoogleAuthUrl,
  generateCodeVerifier,
  generateCodeChallenge,
  generateOAuthState,
} from '../src/google-oauth.js';

const mockConfig = {
  clientId: 'test-client-id.apps.googleusercontent.com',
  clientSecret: 'test-secret',
  redirectUri: 'http://localhost:3000/api/auth/google/callback',
};

describe('Google OAuth', () => {
  describe('PKCE helpers', () => {
    it('should generate a code verifier (base64url, 43 chars)', () => {
      const v = generateCodeVerifier();
      expect(v.length).toBe(43);
      expect(/^[A-Za-z0-9_-]+$/.test(v)).toBe(true);
    });

    it('should generate a deterministic code challenge from verifier', () => {
      const v = generateCodeVerifier();
      const c1 = generateCodeChallenge(v);
      const c2 = generateCodeChallenge(v);
      expect(c1).toBe(c2);
      expect(c1.length).toBeGreaterThan(0);
    });

    it('should generate a random OAuth state (32 hex chars)', () => {
      const s = generateOAuthState();
      expect(s.length).toBe(32);
      expect(/^[0-9a-f]+$/.test(s)).toBe(true);
    });
  });

  describe('getGoogleAuthUrl', () => {
    it('should generate a valid Google auth URL with PKCE', () => {
      const url = getGoogleAuthUrl(mockConfig, 'my-state', 'my-challenge');
      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain('state=my-state');
      expect(url).toContain('code_challenge=my-challenge');
      expect(url).toContain('code_challenge_method=S256');
    });
  });
});
