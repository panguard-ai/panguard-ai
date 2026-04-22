import { Card } from '@/components/ui/card';
import { CheckCircle } from '@/components/icons';

export default function DeviceApprovedPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <Card padding="lg" className="text-center">
        <CheckCircle className="mx-auto h-10 w-10 text-brand-sage" />
        <h1 className="mt-4 text-xl font-semibold text-text-primary">
          CLI authorized
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          You can close this tab. The <code className="font-mono">pga</code> CLI
          should now be logged in to your workspace. Run{' '}
          <code className="font-mono">pga whoami</code> in the terminal to confirm.
        </p>
        <p className="mt-6 text-xs text-text-muted">
          Keys can be revoked any time from <code className="font-mono">Settings → API keys</code>.
        </p>
      </Card>
    </main>
  );
}
