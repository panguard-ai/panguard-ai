"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import {
  ScanIcon, ShieldIcon, TerminalIcon, NetworkIcon, AnalyticsIcon,
  GlobalIcon, AlertIcon, EnterpriseIcon, LockIcon, HistoryIcon, TeamIcon,
  IntegrationIcon, CheckIcon,
} from "@/components/ui/BrandIcons";

const productLinks = [
  { href: "/product", icon: ScanIcon, label: "Product Overview", desc: "See the full platform" },
  { href: "/product/scan", icon: ScanIcon, label: "Panguard Scan", desc: "60-second AI security audit" },
  { href: "/product/guard", icon: ShieldIcon, label: "Panguard Guard", desc: "24/7 AI endpoint protection" },
  { href: "/product/chat", icon: TerminalIcon, label: "Panguard Chat", desc: "AI security copilot" },
  { href: "/product/trap", icon: NetworkIcon, label: "Panguard Trap", desc: "Intelligent honeypots" },
  { href: "/product/report", icon: AnalyticsIcon, label: "Panguard Report", desc: "AI compliance reports" },
  { href: "/integrations", icon: IntegrationIcon, label: "Integrations", desc: "Connect your tools" },
];

const solutionLinks = [
  { href: "/solutions/developers", icon: TerminalIcon, label: "For Developers", desc: "Solo & indie developers" },
  { href: "/solutions/smb", icon: EnterpriseIcon, label: "For Small Business", desc: "5-50 employees" },
  { href: "/solutions/enterprise", icon: TeamIcon, label: "For Mid-size", desc: "50-500 employees" },
  { href: "/customers", icon: CheckIcon, label: "Customers", desc: "Success stories" },
  { href: "/partners", icon: GlobalIcon, label: "For MSPs", desc: "Managed service providers" },
];

const resourceLinks = [
  { href: "/blog", icon: AnalyticsIcon, label: "Blog", desc: "Latest insights" },
  { href: "/docs", icon: AnalyticsIcon, label: "Documentation", desc: "Guides & references" },
  { href: "/docs/api", icon: TerminalIcon, label: "API Reference", desc: "Developer docs" },
  { href: "/changelog", icon: HistoryIcon, label: "Changelog", desc: "What's new" },
  { href: "/status", icon: AnalyticsIcon, label: "Status Page", desc: "System uptime" },
  { href: "/resources", icon: AnalyticsIcon, label: "Resource Center", desc: "Reports & whitepapers" },
];

const companyLinks = [
  { href: "/company", icon: AlertIcon, label: "About", desc: "Our mission" },
  { href: "/careers", icon: EnterpriseIcon, label: "Careers", desc: "Join the team" },
  { href: "/contact", icon: TerminalIcon, label: "Contact", desc: "Get in touch" },
  { href: "/press", icon: AnalyticsIcon, label: "Press", desc: "Newsroom" },
  { href: "/trust", icon: LockIcon, label: "Trust Center", desc: "Security & compliance" },
  { href: "/partners", icon: GlobalIcon, label: "Partners", desc: "Partner ecosystem" },
  { href: "/security", icon: ShieldIcon, label: "Security", desc: "Our practices" },
];

type DropdownId = "product" | "solutions" | "resources" | "company" | null;

function Dropdown({ links, cta }: { links: typeof productLinks; cta?: { label: string; href: string } }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
      <div className="bg-surface-1/95 backdrop-blur-xl border border-border rounded-xl p-3 shadow-2xl min-w-[320px]">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors group"
          >
            <l.icon className="w-4 h-4 text-text-tertiary group-hover:text-brand-sage mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-text-primary font-medium">{l.label}</p>
              <p className="text-xs text-text-tertiary">{l.desc}</p>
            </div>
          </Link>
        ))}
        {cta && (
          <Link
            href={cta.href}
            className="block mt-2 pt-2 border-t border-border text-center text-sm text-brand-sage hover:text-brand-sage-light font-medium py-2"
          >
            {cta.label} &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}

import BrandLogo from "./ui/BrandLogo";

/* Brand logo matching design: PANGUARD [3D shield] AI */
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 shrink-0">
      <span className="font-semibold tracking-wider text-text-primary text-[15px]">PANGUARD</span>
      <BrandLogo size={22} className="text-brand-sage" />
      <span className="font-semibold tracking-wider text-text-primary text-[15px]">AI</span>
    </Link>
  );
}

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownId>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const toggleDd = (id: DropdownId) =>
    setActiveDropdown((prev) => (prev === id ? null : id));

  const navItems: { id: DropdownId; label: string; links: typeof productLinks; cta?: { label: string; href: string } }[] = [
    { id: "product", label: "Product", links: productLinks, cta: { label: "Start Free Scan", href: "/scan" } },
    { id: "solutions", label: "Solutions", links: solutionLinks },
    { id: "resources", label: "Resources", links: resourceLinks },
    { id: "company", label: "Company", links: companyLinks },
  ];

  return (
    <nav
      ref={navRef}
      className={`sticky top-0 z-50 h-16 flex items-center justify-between px-6 lg:px-[120px] transition-all duration-300 ${
        scrolled
          ? "bg-surface-0/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <Logo />

      {/* Desktop nav */}
      <div className="hidden lg:flex items-center gap-1">
        {navItems.map((item) => (
          <div key={item.id} className="relative">
            <button
              onClick={() => toggleDd(item.id)}
              className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                activeDropdown === item.id
                  ? "text-text-primary bg-surface-2"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {item.label}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === item.id ? "rotate-180" : ""}`} />
            </button>
            {activeDropdown === item.id && (
              <Dropdown links={item.links} cta={item.cta} />
            )}
          </div>
        ))}
        <Link
          href="/pricing"
          className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Pricing
        </Link>
        <Link
          href="/docs"
          className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Docs
        </Link>
      </div>

      {/* Desktop CTA */}
      <div className="hidden lg:flex items-center gap-4">
        <Link
          href="/early-access"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/early-access"
          className="bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
        >
          Get Started
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden text-text-secondary"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 top-16 bg-surface-0/98 backdrop-blur-xl z-40 overflow-y-auto lg:hidden">
          <div className="p-6 space-y-6">
            {navItems.map((item) => (
              <div key={item.id}>
                <p className="text-xs uppercase tracking-wider text-text-muted mb-3">
                  {item.label}
                </p>
                <div className="space-y-1">
                  {item.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex items-center gap-3 py-2 text-text-secondary hover:text-text-primary"
                      onClick={() => setMobileOpen(false)}
                    >
                      <l.icon className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm">{l.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Link
              href="/pricing"
              className="block py-2 text-sm text-text-secondary hover:text-text-primary"
              onClick={() => setMobileOpen(false)}
            >
              Pricing
            </Link>
            <div className="pt-4 border-t border-border space-y-3">
              <Link href="/early-access" className="block text-sm text-text-secondary">Sign In</Link>
              <Link
                href="/early-access"
                className="block text-center bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-5 py-3"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
