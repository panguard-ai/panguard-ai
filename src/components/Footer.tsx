import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";
import BrandLogo from "./ui/BrandLogo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Scan", href: "/product/scan" },
      { label: "Guard", href: "/product/guard" },
      { label: "Chat", href: "/product/chat" },
      { label: "Trap", href: "/product/trap" },
      { label: "Report", href: "/product/report" },
      { label: "Integrations", href: "/integrations" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/docs/api" },
      { label: "Blog", href: "/blog" },
      { label: "Resources", href: "/resources" },
      { label: "Changelog", href: "/changelog" },
      { label: "Status Page", href: "/status" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/company" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Press", href: "/press" },
      { label: "Partners", href: "/partners" },
      { label: "Customers", href: "/customers" },
      { label: "Trust Center", href: "/trust" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Cookie Policy", href: "/legal/cookies" },
      { label: "DPA", href: "/legal/dpa" },
      { label: "SLA", href: "/legal/sla" },
      { label: "Responsible Disclosure", href: "/legal/responsible-disclosure" },
    ],
  },
];

const socials = [
  { icon: Github, href: "https://github.com/panguard", label: "GitHub" },
  { icon: Twitter, href: "https://x.com/panguard_ai", label: "Twitter" },
  { icon: Linkedin, href: "https://linkedin.com/company/panguard-ai", label: "LinkedIn" },
];

function FooterLogo() {
  return (
    <Link href="/" className="flex items-center gap-1.5">
      <span className="font-semibold tracking-wider text-text-primary text-sm">PANGUARD</span>
      <BrandLogo size={16} className="text-brand-sage" />
      <span className="font-semibold tracking-wider text-text-primary text-sm">AI</span>
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="bg-surface-1 border-t border-border py-12 sm:py-16 px-6 lg:px-[120px]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <FooterLogo />
            <p className="text-sm text-text-tertiary mt-3 leading-relaxed">
              Your AI Security Guard. One command to install. AI protects everything.
            </p>
            <div className="flex gap-3 mt-4">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-4">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-text-muted">
            &copy; 2026 Panguard AI, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span>SOC 2</span>
            <span>&middot;</span>
            <span>ISO 27001</span>
            <span>&middot;</span>
            <span>GDPR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
