import { useState, useEffect, useCallback } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useApi<T>(url: string): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {};
    const token = localStorage.getItem('panguard_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(url, { headers })
      .then(res => {
        if (res.status === 401) {
          // Token expired or invalid - clear and redirect to login
          localStorage.removeItem('panguard_token');
          localStorage.removeItem('panguard_email');
          window.location.href = '/login';
          throw new Error('Session expired');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: { ok: boolean; data: T; error?: string }) => {
        if (cancelled) return;
        if (json.ok) {
          setData(json.data);
        } else {
          setError(json.error ?? 'Unknown error');
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url, tick]);

  return { data, loading, error, refresh };
}
