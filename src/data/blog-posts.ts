export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  readingTime: string;
}

export const categories = [
  "All",
  "Engineering",
  "Threat Intelligence",
  "Product Updates",
  "Compliance",
  "Industry",
];

export const blogPosts: BlogPost[] = [
  {
    slug: "ai-powered-threat-detection-vs-rules",
    title: "Why AI-Powered Threat Detection Outperforms Rule-Based Systems",
    excerpt: "Traditional rule-based detection catches known threats. AI catches what rules miss. Here is how Panguard combines both approaches for 99.7% detection accuracy.",
    category: "Engineering",
    date: "2026-02-20",
    author: "Engineering Team",
    readingTime: "8 min",
  },
  {
    slug: "true-cost-data-breach-small-business",
    title: "The True Cost of a Data Breach for Small Businesses in 2026",
    excerpt: "The average cost of a data breach for SMBs reached $4.9M in 2025. We break down the numbers and explain why proactive security costs a fraction of incident response.",
    category: "Industry",
    date: "2026-02-15",
    author: "Security Research",
    readingTime: "6 min",
  },
  {
    slug: "introducing-panguard-scan",
    title: "Introducing Panguard Scan: Free 60-Second Security Audits",
    excerpt: "One command. 60 seconds. A complete security audit of your server with AI-prioritized findings. Available today, free forever.",
    category: "Product Updates",
    date: "2026-02-10",
    author: "Product Team",
    readingTime: "4 min",
  },
  {
    slug: "honeypot-intelligence-panguard-trap",
    title: "Honeypot Intelligence: How Panguard Trap Learns from Attackers",
    excerpt: "Instead of waiting for attackers to find your real systems, deploy decoys that study their techniques. Panguard Trap turns offense into intelligence.",
    category: "Threat Intelligence",
    date: "2026-02-05",
    author: "Threat Research",
    readingTime: "10 min",
  },
  {
    slug: "soc2-compliance-startups-guide",
    title: "SOC 2 Compliance for Startups: A Practical Guide",
    excerpt: "SOC 2 does not require a $60K consultant. With the right tooling, a startup team can achieve compliance in weeks. Here is the playbook.",
    category: "Compliance",
    date: "2026-01-28",
    author: "Compliance Team",
    readingTime: "12 min",
  },
  {
    slug: "lateral-movement-detection",
    title: "Lateral Movement Detection: How Panguard Guard Stops Attackers",
    excerpt: "Once an attacker gets in, they move laterally. Panguard Guard's three-layer AI engine detects lateral movement in real time, before data exfiltration begins.",
    category: "Engineering",
    date: "2026-01-20",
    author: "Engineering Team",
    readingTime: "7 min",
  },
  {
    slug: "security-speaks-human-design-philosophy",
    title: "Building Security That Speaks Human: The Design Philosophy Behind Panguard Chat",
    excerpt: "Security alerts are useless if nobody understands them. We built Panguard Chat to explain threats in plain language, in the messaging apps teams already use.",
    category: "Product Updates",
    date: "2026-01-15",
    author: "Product Team",
    readingTime: "5 min",
  },
  {
    slug: "open-source-scan-engine",
    title: "Open Source Security: Why We Publish Our Scan Engine",
    excerpt: "Transparency builds trust. Our scan engine is MIT licensed. Every detection rule, every test, every line of code is auditable.",
    category: "Engineering",
    date: "2026-01-10",
    author: "Engineering Team",
    readingTime: "4 min",
  },
];
