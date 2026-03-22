import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_LAST_UPDATED } from '@/lib/constants';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;

  const { locale } = params;

  return {
    title: locale === 'zh-TW' ? '服務條款' : 'Terms of Service',
    description: 'Panguard AI Terms of Service. Usage terms, intellectual property, and liability.',
  };
}

export default async function TermsOfServicePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const { locale } = params;

  return (
    <article className="prose-legal">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Terms of Service</h1>
        <p className="text-sm text-text-tertiary">Last updated: {LEGAL_LAST_UPDATED}</p>
        {locale === 'zh-TW' && (
          <p className="mt-3 text-sm text-text-muted border border-border rounded-lg px-4 py-3 bg-surface-1">
            本服務條款目前僅提供英文版本。中文翻譯版本正在準備中，如有任何疑問請聯繫
            <a
              href="mailto:legal@panguard.ai"
              className="text-brand-sage hover:text-brand-sage-light underline ml-1"
            >
              legal@panguard.ai
            </a>
          </p>
        )}
      </header>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        {/* 1 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">1. Acceptance of Terms</h2>
          <p>
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement
            between you (&quot;Customer,&quot; &quot;you,&quot; or &quot;your&quot;) and Panguard
            AI, Inc. (&quot;Panguard,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), a
            company incorporated in Taipei, Taiwan. By accessing or using our website, products, or
            services (collectively, the &quot;Service&quot;), you agree to be bound by these Terms.
            If you are entering into these Terms on behalf of an organization, you represent that
            you have the authority to bind that organization.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            2. Description of Service
          </h2>
          <p>
            Panguard provides an AI-powered endpoint security platform that includes, but is not
            limited to: automated vulnerability scanning (Panguard Scan), continuous endpoint
            protection (Panguard Guard), AI-assisted security analysis (Panguard Chat), intelligent
            honeypot deployment (Panguard Trap), and automated compliance reporting (Panguard
            Report). All features are available to all users under the MIT License at no cost.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">3. No Account Required</h2>
          <p>
            Panguard is a free, open source CLI tool. No account registration, login, or personal
            information is required to use any feature. You may download, install, and use the
            software without providing any credentials or contact information.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">4. Open Source License</h2>
          <p>
            4.1 <strong className="text-text-primary">License.</strong> Panguard is released under
            the MIT License. You are free to use, modify, and distribute the software in accordance
            with the terms of the MIT License. The full license text is available in the project
            repository.
          </p>
          <p className="mt-2">
            4.2 <strong className="text-text-primary">No Fees.</strong> Panguard is free and open
            source software. No subscription, payment, or account registration is required to use
            any feature of the Service.
          </p>
          <p className="mt-2">
            4.3 <strong className="text-text-primary">Optional Services.</strong> Panguard may offer
            optional hosted services (such as Threat Cloud) in the future. Any paid services will be
            clearly identified and offered separately from the open source software.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            5. Community Contributions
          </h2>
          <p>
            Panguard welcomes community contributions including code, detection rules, threat
            intelligence, and documentation. By submitting contributions to the project, you agree
            to license your contributions under the same MIT License that governs the project.
            Panguard reserves the right to accept, modify, or decline contributions at its
            discretion.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">6. Acceptable Use</h2>
          <p>
            Your use of the Service is subject to our{' '}
            <Link
              href="/legal/acceptable-use"
              className="text-brand-sage hover:text-brand-sage-light underline"
            >
              Acceptable Use Policy
            </Link>
            , which is incorporated into these Terms by reference. You agree not to use the Service
            in any manner that is unlawful, harmful, fraudulent, or in violation of any applicable
            regulations.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">7. Intellectual Property</h2>
          <p>
            7.1 <strong className="text-text-primary">Panguard IP.</strong> The Service, including
            all software, algorithms, AI models, user interfaces, designs, documentation, and
            trademarks, is owned by Panguard and is protected by intellectual property laws. These
            Terms do not grant you any right, title, or interest in the Service except for the
            limited right to use it in accordance with these Terms.
          </p>
          <p className="mt-2">
            7.2 <strong className="text-text-primary">Customer Data.</strong> You retain all rights
            to the data you submit to the Service (&quot;Customer Data&quot;). You grant Panguard a
            limited, non-exclusive license to process Customer Data solely for the purpose of
            providing the Service.
          </p>
          <p className="mt-2">
            7.3 <strong className="text-text-primary">Feedback.</strong> If you provide suggestions,
            ideas, or feedback about the Service, you grant Panguard a perpetual, irrevocable,
            royalty-free license to use and incorporate such feedback into our products.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">8. Data Rights</h2>
          <p>
            Panguard processes Customer Data in accordance with our{' '}
            <Link
              href="/legal/privacy"
              className="text-brand-sage hover:text-brand-sage-light underline"
            >
              Privacy Policy
            </Link>{' '}
            and, where applicable, our{' '}
            <Link
              href="/legal/dpa"
              className="text-brand-sage hover:text-brand-sage-light underline"
            >
              Data Processing Agreement
            </Link>
            . You acknowledge that anonymized and aggregated threat intelligence data derived from
            the Service may be used by Panguard to improve its products and contribute to collective
            cybersecurity efforts.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            9. Service Level Agreement
          </h2>
          <p>
            For users of Panguard&apos;s optional hosted services, Panguard may provide a Service
            Level Agreement (SLA) guaranteeing uptime availability. The full terms of the SLA,
            including service credits and exclusions, are set forth in our{' '}
            <Link
              href="/legal/sla"
              className="text-brand-sage hover:text-brand-sage-light underline"
            >
              Service Level Agreement
            </Link>
            .
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            10. Limitation of Liability
          </h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL PANGUARD, ITS
            AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION
            LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN
            CONNECTION WITH YOUR USE OF THE SERVICE.
          </p>
          <p className="mt-2">
            PANGUARD IS PROVIDED FREE OF CHARGE UNDER THE MIT LICENSE. PANGUARD&apos;S TOTAL
            AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE
            SERVICE SHALL NOT EXCEED ONE HUNDRED US DOLLARS (US$100).
          </p>
          <p className="mt-2">
            THE SERVICE IS A SECURITY TOOL DESIGNED TO ASSIST WITH THREAT DETECTION AND RESPONSE.
            PANGUARD DOES NOT GUARANTEE THAT THE SERVICE WILL DETECT OR PREVENT ALL SECURITY
            THREATS. YOU ACKNOWLEDGE THAT NO SECURITY SOLUTION CAN PROVIDE ABSOLUTE PROTECTION.
          </p>
        </section>

        {/* 11 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">11. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Panguard and its affiliates, officers,
            directors, employees, and agents from and against any claims, damages, losses,
            liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising out
            of or relating to: (a) your use of the Service; (b) your violation of these Terms; (c)
            your violation of any third-party rights; or (d) any Customer Data you submit to the
            Service.
          </p>
        </section>

        {/* 12 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">12. Termination</h2>
          <p>
            You may stop using Panguard at any time by uninstalling it. No account closure is
            needed. Panguard may discontinue the Service or cease development with 90 days prior
            notice posted on the project repository. Since Panguard is MIT-licensed open source
            software, you retain the right to use, modify, and distribute any version you have
            obtained.
          </p>
        </section>

        {/* 13 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            Republic of China (Taiwan), without regard to its conflict of law provisions. Any legal
            action or proceeding arising under these Terms shall be brought exclusively in the
            courts located in Taipei, Taiwan, and the parties hereby consent to the personal
            jurisdiction and venue of such courts.
          </p>
        </section>

        {/* 14 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">14. Dispute Resolution</h2>
          <p>
            14.1 <strong className="text-text-primary">Informal Resolution.</strong> Before
            initiating any formal dispute resolution proceeding, the parties agree to first attempt
            to resolve any dispute informally by contacting each other and negotiating in good faith
            for a period of at least 30 days.
          </p>
          <p className="mt-2">
            14.2 <strong className="text-text-primary">Arbitration.</strong> If informal resolution
            fails, any dispute arising out of or relating to these Terms shall be finally resolved
            by binding arbitration administered by the Chinese Arbitration Association, Taipei, in
            accordance with its arbitration rules. The arbitration shall be conducted in English,
            and the arbitral award shall be final and binding.
          </p>
          <p className="mt-2">
            14.3 <strong className="text-text-primary">Class Action Waiver.</strong> You agree that
            any dispute resolution proceeding will be conducted only on an individual basis and not
            in a class, consolidated, or representative action.
          </p>
        </section>

        {/* 15 */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            15. Changes to These Terms
          </h2>
          <p>
            Panguard reserves the right to modify these Terms at any time. We will notify you of
            material changes by posting the updated Terms on our website and updating the &quot;Last
            updated&quot; date. For material changes that affect your rights, we will provide at
            least 30 days prior notice via email or through the Service. Your continued use of the
            Service after the effective date of any changes constitutes your acceptance of the
            revised Terms.
          </p>
        </section>

        <section>
          <div className="mt-6 p-4 bg-surface-1 border border-border rounded-lg">
            <p className="font-medium text-text-primary">Panguard AI, Inc.</p>
            <p className="mt-1">
              Email:{' '}
              <a
                href="mailto:legal@panguard.ai"
                className="text-brand-sage hover:text-brand-sage-light underline"
              >
                legal@panguard.ai
              </a>
            </p>
            <p>Taipei, Taiwan</p>
          </div>
        </section>
      </div>
    </article>
  );
}
