/**
 * OpenAPI 3.0 specification and Swagger UI HTML generator.
 *
 * Generates a complete API spec from route definitions and serves
 * an embedded Swagger UI page via CDN.
 *
 * @module @panguard-ai/panguard-auth/openapi
 */

/**
 * Generate the OpenAPI 3.0 specification as a JSON-serializable object.
 */
export function generateOpenApiSpec(baseUrl: string): Record<string, unknown> {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Panguard AI API',
      version: '1.0.0',
      description:
        'REST API for Panguard AI — authentication, billing, usage metering, admin management, and threat intelligence.',
      contact: { email: 'support@panguard.ai', url: 'https://panguard.ai' },
      license: { name: 'BSL 1.1', url: 'https://panguard.ai/legal/terms' },
    },
    servers: [{ url: baseUrl, description: 'Panguard API Server' }],
    tags: [
      { name: 'Auth', description: 'Authentication and session management' },
      { name: 'Account', description: 'Account management (GDPR, 2FA)' },
      { name: 'Billing', description: 'Subscription and payment (Lemon Squeezy)' },
      { name: 'Usage', description: 'Usage metering and quota' },
      { name: 'Waitlist', description: 'Waitlist management' },
      { name: 'Admin', description: 'Admin dashboard API' },
      { name: 'Threat Cloud', description: 'Threat intelligence API' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'session-token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            tier: { type: 'string', enum: ['free', 'solo', 'pro', 'business'] },
            createdAt: { type: 'string', format: 'date-time' },
            planExpiresAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        UsageSummary: {
          type: 'object',
          properties: {
            resource: { type: 'string' },
            current: { type: 'integer' },
            limit: { type: 'integer', description: '-1 means unlimited' },
            percentage: { type: 'integer', minimum: 0, maximum: 100 },
          },
        },
        QuotaCheck: {
          type: 'object',
          properties: {
            allowed: { type: 'boolean' },
            current: { type: 'integer' },
            limit: { type: 'integer' },
            remaining: { type: 'integer' },
            resource: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          status: { type: 'string' },
                          uptime: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ── Auth ──
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Account created' },
            400: { description: 'Validation error' },
            409: { description: 'Email already registered' },
            429: { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Log in with email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                    totpCode: { type: 'string', description: '6-digit TOTP code (if 2FA enabled)' },
                    backupCode: { type: 'string', description: 'Backup code (if 2FA enabled)' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful (returns token)' },
            202: { description: 'Requires 2FA (requiresTwoFactor: true)' },
            401: { description: 'Invalid credentials' },
            429: { description: 'Rate limit exceeded' },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Invalidate current session',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Session invalidated' } },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'User profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: { user: { $ref: '#/components/schemas/User' } },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'Not authenticated' },
          },
        },
      },
      '/api/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Request password reset email',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', format: 'email' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Reset email sent (always returns 200 for anti-enumeration)' },
          },
        },
      },
      '/api/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password with token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'password'],
                  properties: {
                    token: { type: 'string' },
                    password: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password reset successful' },
            400: { description: 'Invalid or expired token' },
          },
        },
      },

      // ── Account (GDPR, 2FA) ──
      '/api/auth/delete-account': {
        delete: {
          tags: ['Account'],
          summary: 'Delete account and all data (GDPR)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['password'],
                  properties: { password: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Account deleted' },
            401: { description: 'Invalid password' },
          },
        },
      },
      '/api/auth/export-data': {
        get: {
          tags: ['Account'],
          summary: 'Export all user data (GDPR)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'JSON export of all user data' } },
        },
      },
      '/api/auth/totp/setup': {
        post: {
          tags: ['Account'],
          summary: 'Generate TOTP secret for 2FA setup',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Returns secret, QR URI, and backup codes' } },
        },
      },
      '/api/auth/totp/verify': {
        post: {
          tags: ['Account'],
          summary: 'Verify TOTP code to enable 2FA',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code'],
                  properties: { code: { type: 'string', pattern: '^\\d{6}$' } },
                },
              },
            },
          },
          responses: { 200: { description: '2FA enabled' }, 400: { description: 'Invalid code' } },
        },
      },
      '/api/auth/totp/disable': {
        post: {
          tags: ['Account'],
          summary: 'Disable 2FA',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['password'],
                  properties: { password: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: '2FA disabled' } },
        },
      },
      '/api/auth/totp/status': {
        get: {
          tags: ['Account'],
          summary: 'Check 2FA status',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Returns enabled status and backup codes remaining' } },
        },
      },

      // ── Billing ──
      '/api/billing/checkout': {
        post: {
          tags: ['Billing'],
          summary: 'Create a Lemon Squeezy checkout session',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tier: { type: 'string', enum: ['solo', 'pro', 'business'] },
                    variantId: {
                      type: 'string',
                      description: 'Lemon Squeezy variant ID (alternative to tier)',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Returns checkout URL' },
            400: { description: 'Invalid tier or variant' },
            501: { description: 'Billing not configured' },
          },
        },
      },
      '/api/billing/portal': {
        get: {
          tags: ['Billing'],
          summary: 'Get subscription management portal URL',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Returns portal URL' },
            404: { description: 'No active subscription' },
          },
        },
      },
      '/api/billing/status': {
        get: {
          tags: ['Billing'],
          summary: 'Get current billing status',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Returns tier and subscription details' } },
        },
      },
      '/api/billing/webhook': {
        post: {
          tags: ['Billing'],
          summary: 'Lemon Squeezy webhook handler',
          description: 'Receives subscription lifecycle events. Verified via HMAC SHA-256.',
          responses: { 200: { description: 'Webhook processed' } },
        },
      },

      // ── Usage ──
      '/api/usage': {
        get: {
          tags: ['Usage'],
          summary: 'Get usage summary for current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Usage summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          usage: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/UsageSummary' },
                          },
                          tier: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/usage/limits': {
        get: {
          tags: ['Usage'],
          summary: 'Get quota limits for current tier',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Quota limits' } },
        },
      },
      '/api/usage/check': {
        post: {
          tags: ['Usage'],
          summary: 'Check if quota is available for a resource',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['resource'],
                  properties: {
                    resource: {
                      type: 'string',
                      enum: [
                        'scan',
                        'guard_endpoints',
                        'reports',
                        'api_calls',
                        'notifications',
                        'trap_instances',
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Quota check result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/QuotaCheck' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/usage/record': {
        post: {
          tags: ['Usage'],
          summary: 'Record usage for a resource',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['resource'],
                  properties: {
                    resource: { type: 'string' },
                    count: { type: 'integer', default: 1 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Usage recorded' },
            429: { description: 'Quota exceeded' },
          },
        },
      },

      // ── Admin ──
      '/api/admin/dashboard': {
        get: {
          tags: ['Admin'],
          summary: 'Get dashboard statistics',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Dashboard stats' },
            403: { description: 'Admin required' },
          },
        },
      },
      '/api/admin/users': {
        get: {
          tags: ['Admin'],
          summary: 'List all users',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'User list' }, 403: { description: 'Admin required' } },
        },
      },
      '/api/admin/sessions': {
        get: {
          tags: ['Admin'],
          summary: 'List active sessions',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Session list' },
            403: { description: 'Admin required' },
          },
        },
      },
      '/api/admin/activity': {
        get: {
          tags: ['Admin'],
          summary: 'Get recent activity log',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Activity items' },
            403: { description: 'Admin required' },
          },
        },
      },

      // ── Threat Cloud ──
      '/api/threats': {
        post: {
          tags: ['Threat Cloud'],
          summary: 'Upload anonymized threat data',
          description: 'Submit threat intelligence with auto-sighting. Max 1MB body.',
          responses: {
            200: { description: 'Threat recorded' },
            429: { description: 'Rate limited' },
          },
        },
      },
      '/api/iocs': {
        get: {
          tags: ['Threat Cloud'],
          summary: 'Search indicators of compromise',
          parameters: [
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string' },
              description: 'IoC type filter',
            },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: { 200: { description: 'IoC list with pagination' } },
        },
      },
      '/api/stats': {
        get: {
          tags: ['Threat Cloud'],
          summary: 'Get threat statistics',
          responses: { 200: { description: 'Aggregated threat stats' } },
        },
      },
      '/api/rules': {
        get: {
          tags: ['Threat Cloud'],
          summary: 'Fetch community detection rules',
          parameters: [
            { name: 'since', in: 'query', schema: { type: 'string', format: 'date-time' } },
          ],
          responses: { 200: { description: 'Detection rules (Sigma YAML)' } },
        },
        post: {
          tags: ['Threat Cloud'],
          summary: 'Publish a detection rule',
          responses: { 200: { description: 'Rule published' } },
        },
      },
      '/api/feeds/ip-blocklist': {
        get: {
          tags: ['Threat Cloud'],
          summary: 'IP blocklist feed',
          description: 'Plaintext IP list for firewall integration.',
          responses: { 200: { description: 'Newline-separated IP addresses' } },
        },
      },
      '/api/feeds/domain-blocklist': {
        get: {
          tags: ['Threat Cloud'],
          summary: 'Domain blocklist feed',
          responses: { 200: { description: 'Newline-separated domains' } },
        },
      },
    },
  };
}

/**
 * Generate a self-contained Swagger UI HTML page that loads from CDN.
 */
export function generateSwaggerHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panguard AI - API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1A1614; }
    .swagger-ui { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 24px 0; }
    .swagger-ui .info .title { color: #F5F1E8; }
    .swagger-ui .info .description p { color: #A09890; }
    .swagger-ui .scheme-container { background: #1F1C19; border-bottom: 1px solid #2E2A27; }
    .swagger-ui .opblock-tag { color: #F5F1E8; border-bottom: 1px solid #2E2A27; }
    .swagger-ui .opblock { border-color: #2E2A27; background: #1F1C19; }
    .swagger-ui .opblock .opblock-summary { border-color: #2E2A27; }
    .swagger-ui .opblock-description-wrapper p { color: #A09890; }
    .swagger-ui .btn { border-color: #8B9A8E; color: #8B9A8E; }
    .swagger-ui .btn.authorize { background: #8B9A8E; color: #1A1614; }
    .swagger-ui section.models { border: 1px solid #2E2A27; }
    .swagger-ui .model-title { color: #F5F1E8; }
    .pg-header {
      background: #1F1C19;
      border-bottom: 1px solid #2E2A27;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .pg-header svg { color: #8B9A8E; }
    .pg-header span { font-weight: 700; color: #8B9A8E; letter-spacing: 0.05em; font-size: 14px; }
    .pg-header .tag { font-size: 10px; color: #706860; text-transform: uppercase; letter-spacing: 0.1em; }
  </style>
</head>
<body>
  <div class="pg-header">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
    <span>PANGUARD</span>
    <span class="tag">API Documentation</span>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${specUrl}',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;
}
