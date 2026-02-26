import { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * Complete the CLI auth flow by exchanging the web token for a CLI session
 * and redirecting the browser to the CLI's local callback server.
 */
async function completeCliAuth(webToken: string, cliState: string): Promise<string> {
  const res = await fetch('/api/auth/cli/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: webToken, state: cliState }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? 'CLI auth exchange failed');
  return data.data.redirectUrl;
}

export default function LoginPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'cli-done'>('idle');
  const [error, setError] = useState('');

  const cliState = searchParams.get('cli_state');

  // Handle Google OAuth redirect with ?token=xxx
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    if (cliState) {
      // CLI auth flow: exchange web token for CLI session and redirect
      completeCliAuth(token, cliState).then((redirectUrl) => {
        window.location.href = redirectUrl;
      }).catch(() => {
        // Fallback: store token and go to CLI success page
        localStorage.setItem('panguard_token', token);
        window.location.href = '/cli/auth-success';
      });
    } else {
      // Normal web login - store token and fetch user email
      localStorage.setItem('panguard_token', token);
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.data?.user?.email) {
            localStorage.setItem('panguard_email', data.data.user.email);
          }
        })
        .catch(() => {})
        .finally(() => { window.location.href = '/dashboard'; });
    }
  }, [searchParams, cliState]);

  const handleLoginSuccess = useCallback(async (webToken: string, userEmail?: string) => {
    if (cliState) {
      // CLI auth flow
      try {
        const redirectUrl = await completeCliAuth(webToken, cliState);
        setStatus('cli-done');
        window.location.href = redirectUrl;
      } catch {
        setStatus('error');
        setError(t('CLI authentication failed.', 'CLI \u8A8D\u8B49\u5931\u6557\u3002'));
      }
    } else {
      localStorage.setItem('panguard_token', webToken);
      if (userEmail) localStorage.setItem('panguard_email', userEmail);
      window.location.href = '/dashboard';
    }
  }, [cliState, t]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.ok) {
        await handleLoginSuccess(data.data.token, data.data.user?.email ?? email);
      } else {
        setStatus('error');
        setError(data.error ?? t('Login failed.', '\u767B\u5165\u5931\u6557\u3002'));
      }
    } catch {
      setStatus('error');
      setError(t('Network error.', '\u7DB2\u8DEF\u932F\u8AA4\u3002'));
    }
  }, [email, password, t, handleLoginSuccess]);

  if (status === 'cli-done') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-brand-cyan/50 bg-brand-card p-8 text-center">
          <div className="mb-4 text-4xl text-brand-cyan">&gt;_</div>
          <h2 className="mb-3 text-xl font-bold text-brand-text">
            {t('CLI Authentication Complete', 'CLI \u8A8D\u8B49\u5B8C\u6210')}
          </h2>
          <p className="text-brand-muted">
            {t(
              'You can close this tab and return to your terminal.',
              '\u53EF\u4EE5\u95DC\u9589\u6B64\u5206\u9801\u4E26\u56DE\u5230\u7D42\u7AEF\u6A5F\u3002',
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-brand-border bg-brand-card p-8">
        {cliState && (
          <div className="mb-4 rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-3 text-center text-sm text-brand-cyan">
            {t(
              'Signing in for Panguard CLI',
              '\u6B63\u5728\u70BA Panguard CLI \u767B\u5165',
            )}
          </div>
        )}
        <h2 className="mb-6 text-center text-2xl font-bold text-brand-text">
          {t('Sign In', '\u767B\u5165')}
        </h2>

        {/* Google OAuth button */}
        <a
          href="/api/auth/google"
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-brand-border bg-brand-dark px-4 py-3 text-brand-text transition hover:border-brand-cyan"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {t('Sign in with Google', '\u4F7F\u7528 Google \u767B\u5165')}
        </a>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-brand-border" />
          <span className="text-sm text-brand-muted">{t('or', '\u6216')}</span>
          <div className="h-px flex-1 bg-brand-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('Email', 'Email')}
            required
            className="w-full rounded-lg border border-brand-border bg-brand-dark px-4 py-3 text-brand-text placeholder-brand-muted outline-none transition focus:border-brand-cyan"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('Password', '\u5BC6\u78BC')}
            required
            className="w-full rounded-lg border border-brand-border bg-brand-dark px-4 py-3 text-brand-text placeholder-brand-muted outline-none transition focus:border-brand-cyan"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full py-3 text-base disabled:opacity-50"
          >
            {status === 'loading'
              ? t('Signing in...', '\u767B\u5165\u4E2D...')
              : t('Sign In', '\u767B\u5165')}
          </button>
        </form>

        {status === 'error' && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}

        <p className="mt-6 text-center text-sm text-brand-muted">
          {t("Don't have an account?", '\u9084\u6C92\u6709\u5E33\u865F\uFF1F')}{' '}
          <Link to="/register" className="text-brand-cyan hover:underline">
            {t('Register', '\u8A3B\u518A')}
          </Link>
        </p>
      </div>
    </div>
  );
}
