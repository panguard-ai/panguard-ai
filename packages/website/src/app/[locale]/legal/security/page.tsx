import type { Metadata } from 'next';
import { LEGAL_LAST_UPDATED } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Security Whitepaper',
  description:
    'How Panguard AI handles security. Honest disclosures: what we do today, what we plan, what we do not pretend to have.',
};

export default function SecurityWhitepaperPage() {
  return (
    <article className="prose-legal">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Security Whitepaper</h1>
        <p className="text-sm text-text-tertiary">Last updated: {LEGAL_LAST_UPDATED}</p>
      </header>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <section>
          <p>
            This document describes how Panguard AI is built and operated. We are an early-stage,
            open-source security company. We document what we have today, what we plan, and what we
            do not pretend to have. Where a control is in flight, we mark it as such.
          </p>
        </section>

        {/* 1 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">1. Architecture Overview</h2>
          <p>
            Panguard ships as three components: (a) <strong>Panguard CLI / Guard</strong>, an
            open-source endpoint scanner installed by users on their own machines under MIT license;
            (b) <strong>Threat Cloud</strong>, a hosted aggregation API at{' '}
            <code>tc.panguard.ai</code>; (c) <strong>ATR (Agent Threat Rules)</strong>, the public
            rule corpus on GitHub. The CLI is local-first by design; customer skill content is never
            transmitted to Panguard servers. Only anonymized fingerprints (SHA-256 hashes, severity
            verdicts) flow to Threat Cloud, and only when the user opts into community telemetry.
          </p>
          <h3 className="text-base font-medium text-text-primary mt-4 mb-2">1.1 Hosting</h3>
          <p>
            Threat Cloud runs on a single-region production deployment hosted on a SOC 2 Type II
            certified cloud provider. Multi-region deployment is planned for Q1 2027 once a paying
            customer requires it. We do not currently maintain infrastructure in North America or
            Europe — that is on the roadmap, not in production.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">2. Encryption</h2>
          <h3 className="text-base font-medium text-text-primary mt-4 mb-2">2.1 Data at Rest</h3>
          <p>
            Threat Cloud&apos;s database uses AES-256 encryption at rest, provided by the underlying
            cloud provider&apos;s managed disk service. We do not run a hardware security module and
            we do not offer customer-managed keys today.
          </p>
          <h3 className="text-base font-medium text-text-primary mt-4 mb-2">2.2 Data in Transit</h3>
          <p>
            All traffic between the CLI / Guard and Threat Cloud is over TLS 1.3. We use an industry-
            standard TLS configuration; we do not maintain custom certificate pinning today.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">3. Access Control</h2>
          <h3 className="text-base font-medium text-text-primary mt-4 mb-2">3.1 Authentication</h3>
          <p>
            CLI / Guard does not require authentication for local scanning. Threat Cloud aggregation
            requires an API key auto-issued to each Guard install. Single sign-on (SAML 2.0 / OIDC),
            enforced MFA, and WebAuthn are <strong>not implemented today</strong>; they are part of
            the AIAM identity layer scheduled for Q3 2026.
          </p>
          <h3 className="text-base font-medium text-text-primary mt-4 mb-2">3.2 Internal Access</h3>
          <p>
            Production access to Threat Cloud is held by the founding team only. We do not yet
            operate just-in-time provisioning or role-based access control beyond the&nbsp;
            admin-vs-client distinction in the API. Both are roadmap items for SOC 2 Type 1.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">4. Logging &amp; Audit</h2>
          <p>
            Threat Cloud writes an immutable audit log of all admin actions, configuration changes,
            and rule promotions. The schema is at{' '}
            <code>migrations.ts</code> in the open-source <code>threat-cloud</code> package; rows
            include actor, action, resource, and timestamp. Audit log retention is 365 days. We do
            not yet operate a dedicated SIEM with correlation rules; the audit log is the system of
            record.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">5. Incident Response</h2>
          <p>
            We maintain a written incident response runbook. The team is small enough that on-call
            rotation is the founding team only — there is no 24/7 SOC. We notify affected customers
            within 72 hours of any confirmed incident. Tabletop exercises and external IR
            engagement are planned alongside SOC 2 Type 1.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">6. Compliance</h2>
          <p>Status of compliance work in flight:</p>
          <div className="mt-3 grid gap-3">
            <div className="p-3 bg-surface-1 border border-border rounded-lg">
              <div className="flex items-center gap-2">
                <p className="font-medium text-text-primary">SOC 2 Type 1</p>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                  Starting Q3 2026
                </span>
              </div>
              <p className="mt-1 text-text-tertiary">
                Vendor selection (Vanta or Drata) and partner CPA firm engagement begin Q3 2026.
                Type 1 attestation expected Q4 2026 — Q1 2027. Type 2 follows after a 3-12 month
                observation window.
              </p>
            </div>
            <div className="p-3 bg-surface-1 border border-border rounded-lg">
              <div className="flex items-center gap-2">
                <p className="font-medium text-text-primary">ISO 27001</p>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-text-muted/10 text-text-muted border border-border">
                  Planned 2027
                </span>
              </div>
              <p className="mt-1 text-text-tertiary">Sequenced after SOC 2 Type 2.</p>
            </div>
            <div className="p-3 bg-surface-1 border border-border rounded-lg">
              <p className="font-medium text-text-primary">GDPR / Taiwan PDPA</p>
              <p className="mt-1 text-text-tertiary">
                We process minimal personal data (email + workspace name + anonymized telemetry).
                The Threat Cloud data processing addendum is available on request.
              </p>
            </div>
          </div>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">7. Third-Party Audits</h2>
          <p>
            We have not yet engaged third-party penetration testing or external code audit. Both are
            scheduled to begin alongside SOC 2 Type 1 in Q3 2026. Customers requiring vendor-risk
            evidence prior to that timeline should contact us — we will share what we have today
            (architecture diagrams, audit log samples, threat model) under NDA.
          </p>
        </section>

        <section>
          <div className="mt-6 p-4 bg-surface-1 border border-border rounded-lg">
            <p className="font-medium text-text-primary">Panguard AI</p>
            <p className="mt-1">Security Team</p>
            <p>
              Email:{' '}
              <a
                href="mailto:security@panguard.ai"
                className="text-brand-sage hover:text-brand-sage-light underline"
              >
                security@panguard.ai
              </a>
            </p>
            <p>Taipei, Taiwan</p>
          </div>
        </section>
      </div>
    </article>
  );
}
