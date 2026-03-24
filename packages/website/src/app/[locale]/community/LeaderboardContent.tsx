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

      {error && <p className="text-red-400 text-base">Could not load leaderboard: {error}</p>}

      {!loading && !error && contributors.length === 0 && (
        <div className="p-12 text-center bg-surface-1 rounded-xl border border-border">
          <p className="text-xl text-text-primary font-semibold">Be the first contributor!</p>
          <p className="text-text-secondary mt-2">
            Run{' '}
            <code className="bg-surface-2 px-2 py-0.5 rounded text-sm">
              npx panguard-guard scan
            </code>{' '}
            to start protecting the community.
          </p>
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
    </section>
  );
}
