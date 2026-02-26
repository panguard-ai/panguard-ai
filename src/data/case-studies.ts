export interface CaseStudy {
  slug: string;
  company: string;
  industry: string;
  companySize: string;
  productsUsed: string[];
  headline: string;
  excerpt: string;
  challenge: string;
  solution: string;
  results: { metric: string; value: string }[];
  quote: string;
  quoteName: string;
  quoteRole: string;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "fintech-soc2-compliance",
    company: "PayStream Technologies",
    industry: "Financial Services",
    companySize: "45 employees",
    productsUsed: ["Guard", "Report", "Chat"],
    headline: "Achieved SOC 2 compliance in 2 weeks with Panguard Report",
    excerpt: "A FinTech startup preparing for Series A needed SOC 2 compliance fast. Panguard automated evidence collection and report generation, cutting months of consultant work to days.",
    challenge: "PayStream was raising a Series A and every enterprise prospect required SOC 2 certification. Traditional consultants quoted $40K and a 3-month timeline. The 4-person engineering team could not afford the distraction.",
    solution: "PayStream deployed Panguard Guard on all 12 endpoints and activated Panguard Report. Automated evidence collection started immediately. The compliance dashboard showed real-time gap analysis against SOC 2 Trust Service Criteria.",
    results: [
      { metric: "Time to compliance", value: "14 days" },
      { metric: "Cost savings vs. consultant", value: "$38K" },
      { metric: "Controls automated", value: "87%" },
      { metric: "Audit findings", value: "0 critical" },
    ],
    quote: "We went from zero compliance documentation to audit-ready in two weeks. Our auditors were impressed by the evidence quality. Panguard paid for itself before we even closed our Series A.",
    quoteName: "Michael Torres",
    quoteRole: "CTO, PayStream Technologies",
  },
  {
    slug: "ecommerce-incident-reduction",
    company: "ShopWave",
    industry: "E-Commerce",
    companySize: "120 employees",
    productsUsed: ["Guard", "Trap", "Chat"],
    headline: "Reduced security incidents 94% after deploying Panguard Guard",
    excerpt: "An e-commerce platform handling 2M transactions per month was losing $50K quarterly to security incidents. Panguard Guard automated detection and response across 50 endpoints.",
    challenge: "ShopWave's infrastructure spanning 50 servers across AWS handled sensitive payment data. With no dedicated security team, they relied on manual log reviews. Average time to detect a breach: 18 days.",
    solution: "Panguard Guard was deployed across all endpoints in under an hour. Panguard Trap added honeypots on 8 unused ports. Panguard Chat sent real-time alerts to the engineering Slack channel.",
    results: [
      { metric: "Security incidents", value: "-94%" },
      { metric: "Mean time to detect", value: "< 30 seconds" },
      { metric: "Quarterly incident cost", value: "$50K to $3K" },
      { metric: "Deployment time", value: "47 minutes" },
    ],
    quote: "Before Panguard, we found out about breaches from our customers. Now our Slack channel tells us about blocked threats before anyone notices. The Trap honeypots caught an attacker we never would have found.",
    quoteName: "Lisa Wang",
    quoteRole: "VP Engineering, ShopWave",
  },
  {
    slug: "saas-lateral-movement",
    company: "CloudMetrics",
    industry: "Technology",
    companySize: "30 employees",
    productsUsed: ["Guard", "Trap", "Scan"],
    headline: "Caught lateral movement attempt using Panguard Trap honeypots",
    excerpt: "A SaaS analytics company discovered an active intrusion through Panguard Trap honeypots that had been evading traditional detection for 6 days.",
    challenge: "CloudMetrics ran a lean engineering team with shared infrastructure. An attacker compromised a developer laptop through a phishing email. Standard AV tools showed nothing suspicious.",
    solution: "Panguard Trap honeypots on unused internal ports detected unusual connection attempts from the compromised laptop. Panguard Guard correlated the activity with behavioral analysis and immediately alerted the team.",
    results: [
      { metric: "Time to detection", value: "< 3 minutes" },
      { metric: "Attacker dwell time", value: "Reduced from 6 days to 0" },
      { metric: "Data exfiltration", value: "0 bytes" },
      { metric: "Recovery time", value: "2 hours" },
    ],
    quote: "The attacker was inside our network for 6 days before Panguard caught them through a honeypot. No traditional tool flagged it. That honeypot saved us from what could have been a catastrophic breach.",
    quoteName: "James Park",
    quoteRole: "CTO, CloudMetrics",
  },
];
