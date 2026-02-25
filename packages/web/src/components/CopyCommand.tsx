import { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface CopyCommandProps {
  command: string;
  className?: string;
}

export default function CopyCommand({ command, className = '' }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <div className={`group relative ${className}`}>
      <div className="code-block flex items-center justify-between gap-4">
        <code className="overflow-x-auto whitespace-nowrap text-sm">
          <span className="text-brand-muted">$</span> {command}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-brand-border px-3 py-1 text-xs text-brand-muted transition-colors hover:border-brand-cyan hover:text-brand-cyan"
        >
          {copied ? t('Copied!', '已複製!') : t('Copy', '複製')}
        </button>
      </div>
    </div>
  );
}
