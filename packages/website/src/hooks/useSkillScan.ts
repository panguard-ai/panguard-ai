'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export interface ScanFinding {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  location?: string;
}

export interface ScanReport {
  skillName: string | null;
  riskScore: number;
  riskLevel: string;
  findings: ScanFinding[];
  checks: Array<{ status: string; label: string }>;
  durationMs: number;
}

export interface ScanResponse {
  ok: boolean;
  error?: string;
  data?: {
    report: ScanReport;
    cached: boolean;
    contentHash: string;
    source: string;
    scannedAt: string;
  };
}

export interface UseSkillScanReturn {
  url: string;
  setUrl: (url: string) => void;
  loading: boolean;
  result: ScanResponse | null;
  report: ScanReport | null;
  meta: ScanResponse['data'] | null;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  handleScan: () => Promise<void>;
  /** Minimum animation delay (ms) before showing results */
  animationPhase: number;
}

const MIN_ANIMATION_MS = 2200;

export function useSkillScan(): UseSkillScanReturn {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const searchParams = useSearchParams();

  const handleScan = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setResult(null);
    setExpanded(false);
    setAnimationPhase(1);

    const startTime = Date.now();

    // Advance animation phases on timer
    const t2 = setTimeout(() => setAnimationPhase(2), 500);
    const t3 = setTimeout(() => setAnimationPhase(3), 1200);
    const t4 = setTimeout(() => setAnimationPhase(4), 1800);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data: ScanResponse = await res.json();

      // Ensure minimum animation time
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_ANIMATION_MS) {
        await new Promise((r) => setTimeout(r, MIN_ANIMATION_MS - elapsed));
      }

      setResult(data);
      if (data.ok && data.data && data.data.report.riskLevel !== 'LOW') {
        setExpanded(true);
      }
    } catch {
      setResult({ ok: false, error: 'Network error. Please try again.' });
    } finally {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setLoading(false);
      setAnimationPhase(0);
    }
  }, [url, loading]);

  // Auto-scan from ?scan= query param
  useEffect(() => {
    const scanUrl = searchParams.get('scan');
    if (scanUrl && !url && !result) {
      setUrl(scanUrl);
    }
  }, [searchParams, url, result]);

  // Trigger scan when URL is set from query param
  useEffect(() => {
    const scanUrl = searchParams.get('scan');
    if (scanUrl && url === scanUrl && !loading && !result) {
      void handleScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const report = result?.ok ? (result.data?.report ?? null) : null;
  const meta = result?.ok ? (result.data ?? null) : null;

  return {
    url,
    setUrl,
    loading,
    result,
    report,
    meta,
    expanded,
    setExpanded,
    handleScan,
    animationPhase,
  };
}
