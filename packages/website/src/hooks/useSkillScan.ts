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

export type ScanMode = 'url' | 'paste';
export type PasteContentType = 'skill' | 'mcp-config';

export interface ScanHistoryEntry {
  url: string;
  skillName: string | null;
  riskLevel: string;
  riskScore: number;
  findingCount: number;
  scannedAt: string;
}

const HISTORY_KEY = 'pg_scan_history';
const MAX_HISTORY = 10;

function loadHistory(): ScanHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entry: ScanHistoryEntry): void {
  try {
    const history = loadHistory();
    const updated = [entry, ...history.filter((h) => h.url !== entry.url)].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}

export interface UseSkillScanReturn {
  url: string;
  setUrl: (url: string) => void;
  pasteContent: string;
  setPasteContent: (content: string) => void;
  pasteContentType: PasteContentType;
  setPasteContentType: (type: PasteContentType) => void;
  scanMode: ScanMode;
  setScanMode: (mode: ScanMode) => void;
  loading: boolean;
  result: ScanResponse | null;
  report: ScanReport | null;
  meta: ScanResponse['data'] | null;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  handleScan: () => Promise<void>;
  /** Minimum animation delay (ms) before showing results */
  animationPhase: number;
  history: ScanHistoryEntry[];
}

const MIN_ANIMATION_MS = 2200;

export function useSkillScan(): UseSkillScanReturn {
  const [url, setUrl] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteContentType, setPasteContentType] = useState<PasteContentType>('skill');
  const [scanMode, setScanMode] = useState<ScanMode>('url');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const searchParams = useSearchParams();

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleScan = useCallback(async () => {
    const isUrlMode = scanMode === 'url';
    const hasInput = isUrlMode ? url.trim() : pasteContent.trim();
    if (!hasInput || loading) return;

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
      const body = isUrlMode
        ? { url: url.trim() }
        : { content: pasteContent.trim(), contentType: pasteContentType };

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: ScanResponse = await res.json();

      // Ensure minimum animation time
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_ANIMATION_MS) {
        await new Promise((r) => setTimeout(r, MIN_ANIMATION_MS - elapsed));
      }

      setResult(data);
      if (data.ok && data.data) {
        if (data.data.report.riskLevel !== 'LOW') {
          setExpanded(true);
        }
        // Save to history
        const entry: ScanHistoryEntry = {
          url: isUrlMode ? url.trim() : `paste:${pasteContentType}`,
          skillName: data.data.report.skillName,
          riskLevel: data.data.report.riskLevel,
          riskScore: data.data.report.riskScore,
          findingCount: data.data.report.findings.length,
          scannedAt: data.data.scannedAt,
        };
        saveHistory(entry);
        setHistory(loadHistory());
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
  }, [url, pasteContent, pasteContentType, scanMode, loading]);

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
    pasteContent,
    setPasteContent,
    pasteContentType,
    setPasteContentType,
    scanMode,
    setScanMode,
    loading,
    result,
    report,
    meta,
    expanded,
    setExpanded,
    handleScan,
    animationPhase,
    history,
  };
}
