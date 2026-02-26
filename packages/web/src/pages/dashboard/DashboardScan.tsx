import { useState, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../hooks/useApi';

interface ScanData {
  riskScore: number;
  safetyScore: number;
  grade: string;
  findingsCount: number;
  findings: Array<{ title: string; severity: string; description: string }>;
  scanDuration: number;
  timestamp: string;
}

interface ScanEvent {
  phase: string;
  progress: number;
  result?: ScanData;
  error?: string;
}

export default function DashboardScan() {
  const { t } = useLanguage();
  const latest = useApi<ScanData | null>('/api/scan/latest');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScanData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const startScan = useCallback(() => {
    setScanning(true);
    setProgress(0);
    setScanResult(null);
    setScanError(null);

    const source = new EventSource('/api/scan/start');

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ScanEvent;
        setProgress(data.progress);

        if (data.phase === 'complete' && data.result) {
          setScanResult(data.result);
          setScanning(false);
          source.close();
        } else if (data.phase === 'error') {
          setScanError(data.error ?? 'Scan failed');
          setScanning(false);
          source.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    source.onerror = () => {
      setScanError('Connection lost');
      setScanning(false);
      source.close();
    };
  }, []);

  const result = scanResult ?? latest.data;

  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (s === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (s === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const gradeColor = (grade: string) => {
    if (grade === 'A') return 'text-green-400 border-green-400';
    if (grade === 'B') return 'text-blue-400 border-blue-400';
    if (grade === 'C') return 'text-yellow-400 border-yellow-400';
    if (grade === 'D') return 'text-orange-400 border-orange-400';
    return 'text-red-400 border-red-400';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Security Scan', '安全掃描')}</h1>
          <p className="text-sm text-brand-muted">
            {t('Scan your system for security issues', '掃描你的系統以發現安全問題')}
          </p>
        </div>
        <button
          onClick={startScan}
          disabled={scanning}
          className={`btn-primary ${scanning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {scanning
            ? t('Scanning...', '掃描中...')
            : t('Run Scan', '執行掃描')}
        </button>
      </div>

      {/* Progress bar */}
      {scanning && (
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-brand-muted">{t('Scanning system...', '正在掃描系統...')}</span>
            <span className="font-mono text-brand-cyan">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-card">
            <div
              className="h-full rounded-full bg-brand-cyan transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {scanError && (
        <div className="mb-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {scanError}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Score Cards */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="card flex flex-col items-center py-6">
              <div className={`mb-2 flex h-20 w-20 items-center justify-center rounded-full border-4 text-3xl font-bold ${gradeColor(result.grade)}`}>
                {result.grade}
              </div>
              <div className="text-2xl font-bold">{result.safetyScore}</div>
              <div className="text-xs text-brand-muted">{t('Safety Score', '安全分數')}</div>
            </div>

            <div className="card flex flex-col items-center justify-center py-6">
              <div className="text-3xl font-bold text-brand-cyan">{result.riskScore}</div>
              <div className="text-xs text-brand-muted">{t('Risk Score', '風險分數')}</div>
            </div>

            <div className="card flex flex-col items-center justify-center py-6">
              <div className="text-3xl font-bold">
                {result.findingsCount}
              </div>
              <div className="text-xs text-brand-muted">{t('Issues Found', '發現問題')}</div>
            </div>
          </div>

          {/* Findings Table */}
          {result.findings.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">{t('Findings', '發現')}</h2>
              <div className="overflow-hidden rounded-xl border border-brand-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brand-border bg-brand-card/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-brand-muted">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-brand-muted">
                        {t('Severity', '嚴重度')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-brand-muted">
                        {t('Finding', '發現')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-brand-muted">
                        {t('Description', '說明')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.findings.map((f, i) => (
                      <tr key={i} className="border-b border-brand-border/50 hover:bg-brand-card/30">
                        <td className="px-4 py-3 font-mono text-sm text-brand-muted">{i + 1}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${severityColor(f.severity)}`}>
                            {f.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{f.title}</td>
                        <td className="px-4 py-3 text-sm text-brand-muted">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.findings.length === 0 && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-8 text-center">
              <div className="text-4xl">OK</div>
              <div className="mt-2 text-green-400">{t('No security issues found!', '未發現安全問題!')}</div>
            </div>
          )}
        </>
      )}

      {/* No data */}
      {!result && !scanning && (
        <div className="rounded-xl border border-brand-border bg-brand-card/50 p-12 text-center">
          <div className="text-4xl text-brand-muted">?</div>
          <div className="mt-4 text-brand-muted">
            {t('Click "Run Scan" to start your first security scan', '點擊「執行掃描」開始第一次安全掃描')}
          </div>
        </div>
      )}
    </div>
  );
}
