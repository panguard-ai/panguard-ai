import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../hooks/useApi';

interface SystemStatus {
  version: string;
  modules: Record<string, { name: string; available: boolean; description: string }>;
  uptime: number;
  timestamp: string;
}

interface ScanData {
  riskScore: number;
  safetyScore: number;
  grade: string;
  findingsCount: number;
  findings: Array<{ title: string; severity: string; description: string }>;
  scanDuration: number;
}

export default function DashboardOverview() {
  const { t } = useLanguage();
  const status = useApi<SystemStatus>('/api/status');
  const scan = useApi<ScanData | null>('/api/scan/latest');

  const gradeColor = (grade: string) => {
    if (grade === 'A') return 'text-green-400';
    if (grade === 'B') return 'text-blue-400';
    if (grade === 'C') return 'text-yellow-400';
    if (grade === 'D') return 'text-orange-400';
    return 'text-red-400';
  };

  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-red-500/20 text-red-400';
    if (s === 'high') return 'bg-orange-500/20 text-orange-400';
    if (s === 'medium') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('Security Overview', '安全總覽')}</h1>
        <p className="text-sm text-brand-muted">
          {t('Monitor your system security status', '監控你的系統安全狀態')}
        </p>
      </div>

      {/* Score + Status Row */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Security Score */}
        <div className="card flex flex-col items-center justify-center py-8">
          {scan.data ? (
            <>
              <div className={`text-6xl font-bold ${gradeColor(scan.data.grade)}`}>
                {scan.data.grade}
              </div>
              <div className="mt-2 text-3xl font-semibold">{scan.data.safetyScore}/100</div>
              <div className="mt-1 text-sm text-brand-muted">
                {t('Security Score', '安全分數')}
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl font-bold text-brand-muted">--</div>
              <div className="mt-2 text-sm text-brand-muted">
                {t('No scan data yet', '尚未掃描')}
              </div>
              <a
                href="/dashboard/scan"
                className="mt-3 text-sm text-brand-cyan hover:underline"
              >
                {t('Run your first scan', '執行第一次掃描')}
              </a>
            </>
          )}
        </div>

        {/* Risk Summary */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold">{t('Risk Summary', '風險摘要')}</h3>
          {scan.data ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">{t('Risk Score', '風險分數')}</span>
                <span className="font-mono font-bold">{scan.data.riskScore}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">{t('Issues Found', '發現問題')}</span>
                <span className="font-mono font-bold">{scan.data.findingsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">{t('Scan Duration', '掃描時間')}</span>
                <span className="font-mono">{(scan.data.scanDuration / 1000).toFixed(1)}s</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-brand-muted">{t('Run a scan to see results', '執行掃描以查看結果')}</p>
          )}
        </div>

        {/* System Status */}
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold">{t('System Info', '系統資訊')}</h3>
          {status.loading ? (
            <p className="text-sm text-brand-muted">{t('Loading...', '載入中...')}</p>
          ) : status.data ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">{t('Version', '版本')}</span>
                <span className="font-mono text-brand-cyan">v{status.data.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">{t('Uptime', '運行時間')}</span>
                <span className="font-mono">{Math.floor(status.data.uptime)}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">{t('Modules', '模組')}</span>
                <span className="font-mono text-green-400">
                  {Object.keys(status.data.modules).length} {t('active', '啟用')}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-400">{t('Failed to load', '載入失敗')}</p>
          )}
        </div>
      </div>

      {/* Module Status Grid */}
      <h2 className="mb-4 text-lg font-semibold">{t('Modules', '模組')}</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {status.data && Object.entries(status.data.modules).map(([key, mod]) => (
          <div key={key} className="card flex items-center gap-4">
            <div className={`h-3 w-3 rounded-full ${mod.available ? 'bg-green-400' : 'bg-red-400'}`} />
            <div>
              <div className="font-semibold">{mod.name}</div>
              <div className="text-xs text-brand-muted">{mod.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Findings */}
      {scan.data && scan.data.findings.length > 0 && (
        <>
          <h2 className="mb-4 text-lg font-semibold">{t('Recent Findings', '最近發現')}</h2>
          <div className="space-y-2">
            {scan.data.findings.map((f, i) => (
              <div key={i} className="card flex items-center gap-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityColor(f.severity)}`}>
                  {f.severity.toUpperCase()}
                </span>
                <div>
                  <div className="font-medium">{f.title}</div>
                  <div className="text-xs text-brand-muted">{f.description}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
