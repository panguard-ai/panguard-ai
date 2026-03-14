import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_LAST_UPDATED } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Service Level Agreement',
  description: 'Panguard AI Service Level Agreement. Uptime commitments for the Panguard platform.',
};

export default function SLAPage() {
  return (
    <article className="prose-legal">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Service Level Agreement</h1>
        <p className="text-sm text-text-tertiary">Last updated: {LEGAL_LAST_UPDATED}</p>
      </header>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <section>
          <p>
            This Service Level Agreement (&quot;SLA&quot;) describes the uptime commitments Panguard
            AI, Inc. (&quot;Panguard&quot;) makes to all users of the Panguard platform. Panguard is
            free and open-source software licensed under the MIT License.
          </p>
        </section>

        {/* 1 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">1. Uptime Commitment</h2>
          <p>
            Panguard commits to maintaining{' '}
            <strong className="text-text-primary">99.9% uptime</strong> for the Panguard hosted
            services, measured on a monthly basis. This commitment covers:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Panguard Website (panguard.ai)</li>
            <li>Panguard Threat Cloud (tc.panguard.ai)</li>
            <li>Panguard Guard rule synchronization endpoints</li>
            <li>Panguard Scan initiation and reporting endpoints</li>
          </ul>
          <p className="mt-3">
            99.9% uptime equates to a maximum of approximately 43 minutes and 50 seconds of
            unplanned downtime per month.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">2. Measurement</h2>
          <p>
            2.1 <strong className="text-text-primary">Uptime Percentage</strong> is calculated as:
            ((Total Minutes in Month - Downtime Minutes) / Total Minutes in Month) x 100.
          </p>
          <p className="mt-2">
            2.2 <strong className="text-text-primary">&quot;Downtime&quot;</strong> is defined as
            any period during which the Service is unavailable or materially degraded, as measured
            by Panguard&apos;s external monitoring systems from multiple geographic locations. A
            service is considered unavailable when more than 5% of requests to the service endpoint
            fail within a 5-minute measurement window.
          </p>
          <p className="mt-2">
            2.3 Panguard uses independent third-party monitoring services to verify uptime. Current
            uptime status and historical data are available on our public status page at{' '}
            <Link href="/status" className="text-brand-sage hover:text-brand-sage-light underline">
              status.panguard.ai
            </Link>
            .
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">3. Exclusions</h2>
          <p>
            The following events are excluded from downtime calculations and do not count against
            the uptime commitment:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              <strong className="text-text-primary">Scheduled Maintenance:</strong> Planned
              maintenance windows for which Panguard provides at least 72 hours prior notice.
              Scheduled maintenance is typically performed during low-traffic periods (Sundays 02:00
              - 06:00 UTC).
            </li>
            <li>
              <strong className="text-text-primary">Force Majeure:</strong> Events beyond
              Panguard&apos;s reasonable control, including natural disasters, acts of war,
              government actions, pandemics, or widespread internet outages.
            </li>
            <li>
              <strong className="text-text-primary">Third-Party Services:</strong> Outages caused by
              third-party services, including cloud infrastructure providers, DNS providers, or CDN
              services, to the extent such outages are not within Panguard&apos;s control.
            </li>
            <li>
              <strong className="text-text-primary">User Causes:</strong> Downtime resulting from
              misuse, misconfiguration, or actions taken by the user that affect Service
              availability.
            </li>
            <li>
              <strong className="text-text-primary">Emergency Maintenance:</strong> Unscheduled
              maintenance required to address critical security vulnerabilities, provided that
              Panguard uses commercially reasonable efforts to minimize the duration and provides
              notice as soon as practicable.
            </li>
          </ul>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">4. Remediation</h2>
          <p>
            If Panguard fails to meet the uptime commitment in any calendar month, Panguard will:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Publish a post-incident report within 5 business days</li>
            <li>Identify root cause and implement corrective measures</li>
            <li>Provide status updates via the public status page during any outage</li>
          </ul>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 text-text-primary font-medium">Monthly Uptime</th>
                  <th className="py-3 pr-4 text-text-primary font-medium">Response</th>
                  <th className="py-3 text-text-primary font-medium">Approximate Downtime</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">99.0% - 99.9%</td>
                  <td className="py-3 pr-4 font-semibold text-text-primary">
                    Post-incident report
                  </td>
                  <td className="py-3">44 min - 7.3 hours</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">95.0% - 99.0%</td>
                  <td className="py-3 pr-4 font-semibold text-text-primary">
                    Report + corrective action plan
                  </td>
                  <td className="py-3">7.3 hours - 36.5 hours</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4">Below 95.0%</td>
                  <td className="py-3 pr-4 font-semibold text-text-primary">
                    Report + architecture review
                  </td>
                  <td className="py-3">More than 36.5 hours</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">5. Incident Reporting</h2>
          <p>
            To report a service outage or request a post-incident report, contact{' '}
            <a
              href="mailto:support@panguard.ai"
              className="text-brand-sage hover:text-brand-sage-light underline"
            >
              support@panguard.ai
            </a>{' '}
            or open an issue on our{' '}
            <a
              href="https://github.com/panguard-ai/panguard-ai/issues"
              className="text-brand-sage hover:text-brand-sage-light underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>
            . Please include:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>The dates and times of the observed downtime (in UTC)</li>
            <li>Which services were affected</li>
            <li>A description of the impact on your use of the Service</li>
            <li>Any supporting evidence, such as error logs or screenshots</li>
          </ul>
          <p className="mt-3">
            Panguard will review the report against its monitoring records and respond within 15
            business days. Panguard&apos;s monitoring records shall be the definitive source for
            determining uptime and downtime.
          </p>
        </section>

        <section>
          <div className="mt-6 p-4 bg-surface-1 border border-border rounded-lg">
            <p className="font-medium text-text-primary">Panguard AI, Inc.</p>
            <p className="mt-1">Open Source Support</p>
            <p>
              Email:{' '}
              <a
                href="mailto:support@panguard.ai"
                className="text-brand-sage hover:text-brand-sage-light underline"
              >
                support@panguard.ai
              </a>
            </p>
            <p>
              GitHub:{' '}
              <a
                href="https://github.com/panguard-ai/panguard-ai"
                className="text-brand-sage hover:text-brand-sage-light underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                panguard-ai/panguard-ai
              </a>
            </p>
            <p>Taipei, Taiwan</p>
          </div>
        </section>
      </div>
    </article>
  );
}
