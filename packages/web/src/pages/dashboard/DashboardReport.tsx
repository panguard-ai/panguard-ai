import { useState, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../hooks/useApi';

interface Framework {
  id: string;
  name: string;
  nameZh: string;
  description: string;
}

interface ReportResult {
  report: Record<string, unknown>;
  summary: string;
}

export default function DashboardReport() {
  const { language, t } = useLanguage();
  const frameworks = useApi<Framework[]>('/api/report/frameworks');
  const [selectedFramework, setSelectedFramework] = useState('iso27001');
  const [selectedLang, setSelectedLang] = useState(language === 'zh-TW' ? 'zh-TW' : 'en');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework: selectedFramework, language: selectedLang }),
      });
      const json = await res.json() as { ok: boolean; data?: ReportResult; error?: string };

      if (json.ok && json.data) {
        setResult(json.data);
      } else {
        setError(json.error ?? 'Failed to generate report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }, [selectedFramework, selectedLang]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('Compliance Reports', '合規報告')}</h1>
        <p className="text-sm text-brand-muted">
          {t('Generate compliance reports for various frameworks', '產生各種合規框架的報告')}
        </p>
      </div>

      {/* Controls */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Framework selector */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-brand-muted">
            {t('Framework', '框架')}
          </label>
          <select
            value={selectedFramework}
            onChange={e => setSelectedFramework(e.target.value)}
            className="w-full rounded-lg border border-brand-border bg-brand-card px-4 py-2.5 text-sm text-brand-text focus:border-brand-cyan focus:outline-none"
          >
            {frameworks.data?.map(f => (
              <option key={f.id} value={f.id}>
                {language === 'en' ? f.name : f.nameZh}
              </option>
            )) ?? (
              <>
                <option value="iso27001">ISO 27001</option>
                <option value="soc2">SOC 2</option>
                <option value="tw_cyber_security_act">
                  {t('Taiwan Cyber Security Act', '資通安全管理法')}
                </option>
              </>
            )}
          </select>
        </div>

        {/* Language selector */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-brand-muted">
            {t('Report Language', '報告語言')}
          </label>
          <select
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value)}
            className="w-full rounded-lg border border-brand-border bg-brand-card px-4 py-2.5 text-sm text-brand-text focus:border-brand-cyan focus:outline-none"
          >
            <option value="en">English</option>
            <option value="zh-TW">繁體中文</option>
          </select>
        </div>

        {/* Generate button */}
        <div className="flex items-end">
          <button
            onClick={generate}
            disabled={generating}
            className={`btn-primary w-full justify-center ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {generating
              ? t('Generating...', '產生中...')
              : t('Generate Report', '產生報告')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Report result */}
      {result && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">{t('Report Summary', '報告摘要')}</h2>
          <div className="code-block max-h-[600px] overflow-auto whitespace-pre-wrap text-xs leading-relaxed">
            {result.summary}
          </div>
        </div>
      )}

      {/* Framework cards */}
      {!result && !generating && (
        <>
          <h2 className="mb-4 text-lg font-semibold">{t('Available Frameworks', '可用框架')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(frameworks.data ?? []).map(f => (
              <div
                key={f.id}
                onClick={() => setSelectedFramework(f.id)}
                className={`card cursor-pointer transition-all ${
                  selectedFramework === f.id ? 'border-brand-cyan/50 shadow-lg shadow-brand-cyan/10' : ''
                }`}
              >
                <h3 className="font-semibold">{language === 'en' ? f.name : f.nameZh}</h3>
                <p className="mt-2 text-xs text-brand-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
