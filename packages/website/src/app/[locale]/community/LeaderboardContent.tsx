'use client';

import { useEffect, useState } from 'react';

interface Contributor {
  contributorHash: string;
  proposalsSubmitted: number;
  proposalsPromoted: number;
  skillThreatsReported: number;
}

const TC_URL = process.env.NEXT_PUBLIC_THREAT_CLOUD_URL ?? 'https://tc.panguard.ai';

export default function LeaderboardContent() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContributors() {
      try {
        const resp = await fetch(`${TC_URL}/api/contributors`, {
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
    <section
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '80px 24px 120px',
      }}
    >
      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          color: '#1A1614',
          marginBottom: 8,
        }}
      >
        Community Leaderboard
      </h1>
      <p
        style={{
          fontSize: '1.1rem',
          color: '#5a5a5a',
          marginBottom: 48,
          maxWidth: 600,
        }}
      >
        Contributors who make the AI agent ecosystem safer for everyone.
        Every rule proposed and promoted protects thousands of developers.
      </p>

      {loading && (
        <p style={{ color: '#8B9A8E', fontSize: '1rem' }}>Loading contributors...</p>
      )}

      {error && (
        <p style={{ color: '#c44', fontSize: '1rem' }}>
          Could not load leaderboard: {error}
        </p>
      )}

      {!loading && !error && contributors.length === 0 && (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: '#F5F1E8',
            borderRadius: 12,
          }}
        >
          <p style={{ fontSize: '1.2rem', color: '#1A1614', fontWeight: 600 }}>
            Be the first contributor!
          </p>
          <p style={{ color: '#5a5a5a', marginTop: 8 }}>
            Run <code style={{ background: '#e8e4dc', padding: '2px 6px', borderRadius: 4 }}>npx panguard-guard scan</code> to
            start protecting the community.
          </p>
        </div>
      )}

      {!loading && contributors.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.95rem',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid #8B9A8E',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '12px 16px', color: '#1A1614', fontWeight: 600 }}>
                  Rank
                </th>
                <th style={{ padding: '12px 16px', color: '#1A1614', fontWeight: 600 }}>
                  Contributor
                </th>
                <th style={{ padding: '12px 16px', color: '#1A1614', fontWeight: 600, textAlign: 'right' }}>
                  Rules Proposed
                </th>
                <th style={{ padding: '12px 16px', color: '#1A1614', fontWeight: 600, textAlign: 'right' }}>
                  Rules Promoted
                </th>
                <th style={{ padding: '12px 16px', color: '#1A1614', fontWeight: 600, textAlign: 'right' }}>
                  Threats Reported
                </th>
              </tr>
            </thead>
            <tbody>
              {contributors.map((c, idx) => (
                <tr
                  key={c.contributorHash}
                  style={{
                    borderBottom: '1px solid #e8e4dc',
                    background: idx === 0 ? '#f9f7f2' : 'transparent',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: idx < 3 ? 700 : 400 }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <code
                      style={{
                        background: '#f0ede6',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.85rem',
                        color: '#5a5a5a',
                      }}
                    >
                      {c.contributorHash.slice(0, 12)}...
                    </code>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                    {c.proposalsSubmitted}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: c.proposalsPromoted > 0 ? '#2d6a4f' : '#888',
                    }}
                  >
                    {c.proposalsPromoted}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {c.skillThreatsReported}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 48, padding: 24, background: '#f5f1e8', borderRadius: 12 }}>
        <h3 style={{ fontSize: '1.1rem', color: '#1A1614', marginBottom: 8 }}>
          How to contribute
        </h3>
        <ol style={{ color: '#5a5a5a', lineHeight: 1.8, paddingLeft: 20 }}>
          <li>
            Install Guard: <code style={{ background: '#e8e4dc', padding: '1px 4px', borderRadius: 3 }}>npm i -g @panguard-ai/panguard-guard</code>
          </li>
          <li>
            Scan your skills: <code style={{ background: '#e8e4dc', padding: '1px 4px', borderRadius: 3 }}>panguard-guard scan</code>
          </li>
          <li>
            Start Guard: <code style={{ background: '#e8e4dc', padding: '1px 4px', borderRadius: 3 }}>panguard-guard start</code>
          </li>
          <li>Guard automatically proposes rules from threats it detects</li>
          <li>Rules that pass community review protect everyone</li>
        </ol>
      </div>
    </section>
  );
}
