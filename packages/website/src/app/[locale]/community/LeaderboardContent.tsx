'use client';

import { useEffect, useState } from 'react';

interface Contributor {
  contributorHash: string;
  proposalsSubmitted: number;
  proposalsPromoted: number;
  skillThreatsReported: number;
}

// Use local API proxy to avoid CORS issues in browser
const API_URL = '/api/contributors';

export default function LeaderboardContent() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContributors() {
      try {
        const resp = await fetch(API_URL, {
          signal: AbortSignal.timeout(10_000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as { ok: boolean; data: Contributor[] };
        if (data.ok) {
          setContributors(data.data);
        } else {
          throw new Error('API returned ok=false');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    void fetchContributors();
  }, []);

  return (
    <section className="max-w-[900px] mx-auto px-6 pt-20 pb-28">
      <h1 className="text-4xl font-bold text-text-primary mb-2">Community Leaderboard</h1>
      <p className="text-lg text-text-secondary mb-12 max-w-[600px]">
        Contributors who make the AI agent ecosystem safer for everyone. Every rule proposed and
        promoted protects thousands of developers.
      </p>

      {loading && <p className="text-brand-sage text-base">Loading contributors...</p>}

      {/* Graceful empty-state: shown whenever the leaderboard has no data to
          display — whether the API errored, returned ok=false, or is simply
          empty. Never surfaces a raw HTTP status to users. */}
      {!loading && (error || contributors.length === 0) && (
        <div className="p-10 sm:p-12 text-center bg-surface-1 rounded-xl border border-border">
          <p className="text-xl text-text-primary font-semibold">
            The leaderboard is warming up
          </p>
          <p className="text-text-secondary mt-3 max-w-md mx-auto leading-relaxed">
            Live rankings appear here as contributors submit and promote rules. Be the
            first — run{' '}
            <code className="bg-surface-2 px-2 py-0.5 rounded text-sm">
              npx panguard-guard scan
            </code>{' '}
            to start protecting the community.
          </p>
          <a
            href="https://github.com/Agent-Threat-Rule/agent-threat-rules/graphs/contributors"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-brand-sage hover:text-brand-sage-light transition-colors"
          >
            View contributors on GitHub
            <span aria-hidden="true">-&gt;</span>
          </a>
        </div>
      )}

      {!loading && contributors.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.95rem]">
            <thead>
              <tr className="border-b-2 border-brand-sage/40 text-left">
                <th className="px-4 py-3 text-text-primary font-semibold">Rank</th>
                <th className="px-4 py-3 text-text-primary font-semibold">Contributor</th>
                <th className="px-4 py-3 text-text-primary font-semibold text-right">
                  Rules Proposed
                </th>
                <th className="px-4 py-3 text-text-primary font-semibold text-right">
                  Rules Promoted
                </th>
                <th className="px-4 py-3 text-text-primary font-semibold text-right">
                  Threats Reported
                </th>
              </tr>
            </thead>
            <tbody>
              {contributors.map((c, idx) => (
                <tr
                  key={c.contributorHash}
                  className={`border-b border-border ${idx === 0 ? 'bg-surface-1' : ''}`}
                >
                  <td className={`px-4 py-3 text-text-primary ${idx < 3 ? 'font-bold' : ''}`}>
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-surface-2 px-2 py-0.5 rounded text-sm text-text-secondary">
                      {c.contributorHash.slice(0, 12)}...
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary">
                    {c.proposalsSubmitted}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${c.proposalsPromoted > 0 ? 'text-brand-sage' : 'text-text-tertiary'}`}
                  >
                    {c.proposalsPromoted}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">
                    {c.skillThreatsReported}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-12 p-6 bg-surface-1 rounded-xl border border-border">
        <h3 className="text-lg text-text-primary font-semibold mb-2">How to contribute</h3>
        <ol className="text-text-secondary leading-relaxed pl-5 list-decimal">
          <li>
            Install Guard:{' '}
            <code className="bg-surface-2 px-1 py-0.5 rounded text-sm">
              npm i -g @panguard-ai/panguard-guard
            </code>
          </li>
          <li>
            Scan your skills:{' '}
            <code className="bg-surface-2 px-1 py-0.5 rounded text-sm">panguard-guard scan</code>
          </li>
          <li>
            Start Guard:{' '}
            <code className="bg-surface-2 px-1 py-0.5 rounded text-sm">panguard-guard start</code>
          </li>
          <li>Guard automatically proposes rules from threats it detects</li>
          <li>Rules that pass community review protect everyone</li>
        </ol>
      </div>

      {/* Static, always-rendered value section so the page carries real content
          even when the live leaderboard API is unavailable. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="p-6 bg-surface-1 rounded-xl border border-border">
          <p className="font-mono text-[10px] uppercase tracking-micro text-brand-sage">
            Propose
          </p>
          <p className="text-text-primary font-semibold mt-3">Turn a threat into a rule</p>
          <p className="text-text-secondary text-sm mt-2 leading-relaxed">
            Guard surfaces suspicious skill behavior and drafts a detection rule from the
            evidence, so contributing starts from real signal, not guesswork.
          </p>
        </div>
        <div className="p-6 bg-surface-1 rounded-xl border border-border">
          <p className="font-mono text-[10px] uppercase tracking-micro text-brand-sage">
            Review
          </p>
          <p className="text-text-primary font-semibold mt-3">Community + automated review</p>
          <p className="text-text-secondary text-sm mt-2 leading-relaxed">
            Each proposal is checked against a benign corpus for false positives before it can
            be promoted, keeping the shared ruleset precise.
          </p>
        </div>
        <div className="p-6 bg-surface-1 rounded-xl border border-border">
          <p className="font-mono text-[10px] uppercase tracking-micro text-brand-sage">
            Protect
          </p>
          <p className="text-text-primary font-semibold mt-3">Everyone gets safer</p>
          <p className="text-text-secondary text-sm mt-2 leading-relaxed">
            Promoted rules ship to every Guard install. One contributor&apos;s catch protects
            thousands of downstream agents.
          </p>
        </div>
      </div>

      <div className="mt-8 p-6 sm:p-8 bg-surface-1 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-text-primary font-semibold">Contribute on GitHub</p>
          <p className="text-text-secondary text-sm mt-1 leading-relaxed">
            The Agent Threat Rules standard is open source and MIT-licensed. Browse rules, open
            issues, and submit pull requests.
          </p>
        </div>
        <a
          href="https://github.com/Agent-Threat-Rule/agent-threat-rules"
          target="_blank"
          rel="noopener noreferrer"
          className="sheen lift rounded-xl border border-border text-text-primary px-6 py-3 font-semibold hover:border-border-hover hover:bg-surface-1 transition-colors duration-300 ease-out-quint shrink-0 text-center"
        >
          Open the repository
        </a>
      </div>
    </section>
  );
}
