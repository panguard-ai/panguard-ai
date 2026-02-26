"use client";
import { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X, ChevronDown } from "lucide-react";
import { Link, usePathname, useRouter } from "@/navigation";
import type { Locale } from "@/navigation";
import {
  ScanIcon, ShieldIcon, TerminalIcon, NetworkIcon, AnalyticsIcon,
  GlobalIcon, AlertIcon, EnterpriseIcon, LockIcon, HistoryIcon, TeamIcon,
  IntegrationIcon, CheckIcon,
} from "@/components/ui/BrandIcons";
import BrandLogo from "./ui/BrandLogo";

type IconComponent = typeof ScanIcon;

interface NavLink {
  href: string;
  icon: IconComponent;
  label: string;
  desc: string;
}

/* ─── Locale Switcher ─── */
function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (target: Locale) => {
    router.replace(pathname, { locale: target });
  };

  return (
    <div className="inline-flex items-center bg-surface-1 border border-border rounded-full p-0.5">
      <button
        onClick={() => switchTo("en")}
        className={`relative px-3 py-1 text-xs font-medium rounded-full transition-all duration-300 ${
          locale === "en"
            ? "text-surface-0 bg-brand-sage"
            : "text-text-tertiary hover:text-text-secondary"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchTo("zh")}
        className={`relative px-3 py-1 text-xs font-medium rounded-full transition-all duration-300 ${
          locale === "zh"
            ? "text-surface-0 bg-brand-sage"
            : "text-text-tertiary hover:text-text-secondary"
        }`}
      >
        中文
      </button>
    </div>
  );
}

/* ─── Dropdown ─── */
function Dropdown({ links, cta }: { links: NavLink[]; cta?: { label: string; href: string } }) {
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

/* ─── Logo ─── */
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 shrink-0">
      <span className="font-semibold tracking-wider text-text-primary text-[15px]">PANGUARD</span>
      <BrandLogo size={22} className="text-brand-sage" />
      <span className="font-semibold tracking-wider text-text-primary text-[15px]">AI</span>
    </Link>
  );
}

type DropdownId = "product" | "solutions" | "resources" | "company" | null;

export default function NavBar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
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

  const productLinks: NavLink[] = [
    { href: "/product", icon: ScanIcon, label: t("productLinks.overview"), desc: t("productLinks.overviewDesc") },
    { href: "/product/scan", icon: ScanIcon, label: t("productLinks.scan"), desc: t("productLinks.scanDesc") },
    { href: "/product/guard", icon: ShieldIcon, label: t("productLinks.guard"), desc: t("productLinks.guardDesc") },
    { href: "/product/chat", icon: TerminalIcon, label: t("productLinks.chat"), desc: t("productLinks.chatDesc") },
    { href: "/product/trap", icon: NetworkIcon, label: t("productLinks.trap"), desc: t("productLinks.trapDesc") },
    { href: "/product/report", icon: AnalyticsIcon, label: t("productLinks.report"), desc: t("productLinks.reportDesc") },
    { href: "/compliance", icon: CheckIcon, label: t("productLinks.compliance"), desc: t("productLinks.complianceDesc") },
    { href: "/integrations", icon: IntegrationIcon, label: t("productLinks.integrations"), desc: t("productLinks.integrationsDesc") },
  ];

  const solutionLinks: NavLink[] = [
    { href: "/solutions/developers", icon: TerminalIcon, label: t("solutionLinks.developers"), desc: t("solutionLinks.developersDesc") },
    { href: "/solutions/smb", icon: EnterpriseIcon, label: t("solutionLinks.smb"), desc: t("solutionLinks.smbDesc") },
    { href: "/solutions/enterprise", icon: TeamIcon, label: t("solutionLinks.enterprise"), desc: t("solutionLinks.enterpriseDesc") },
    { href: "/customers", icon: CheckIcon, label: t("solutionLinks.customers"), desc: t("solutionLinks.customersDesc") },
    { href: "/partners", icon: GlobalIcon, label: t("solutionLinks.partners"), desc: t("solutionLinks.partnersDesc") },
  ];

  const resourceLinks: NavLink[] = [
    { href: "/blog", icon: AnalyticsIcon, label: t("resourceLinks.blog"), desc: t("resourceLinks.blogDesc") },
    { href: "/docs", icon: AnalyticsIcon, label: t("resourceLinks.docs"), desc: t("resourceLinks.docsDesc") },
    { href: "/docs/api", icon: TerminalIcon, label: t("resourceLinks.api"), desc: t("resourceLinks.apiDesc") },
    { href: "/changelog", icon: HistoryIcon, label: t("resourceLinks.changelog"), desc: t("resourceLinks.changelogDesc") },
    { href: "/status", icon: AnalyticsIcon, label: t("resourceLinks.status"), desc: t("resourceLinks.statusDesc") },
    { href: "/resources", icon: AnalyticsIcon, label: t("resourceLinks.resources"), desc: t("resourceLinks.resourcesDesc") },
  ];

  const companyLinks: NavLink[] = [
    { href: "/company", icon: AlertIcon, label: t("companyLinks.about"), desc: t("companyLinks.aboutDesc") },
    { href: "/careers", icon: EnterpriseIcon, label: t("companyLinks.careers"), desc: t("companyLinks.careersDesc") },
    { href: "/contact", icon: TerminalIcon, label: t("companyLinks.contact"), desc: t("companyLinks.contactDesc") },
    { href: "/press", icon: AnalyticsIcon, label: t("companyLinks.press"), desc: t("companyLinks.pressDesc") },
    { href: "/trust", icon: LockIcon, label: t("companyLinks.trust"), desc: t("companyLinks.trustDesc") },
    { href: "/partners", icon: GlobalIcon, label: t("companyLinks.partners"), desc: t("companyLinks.partnersDesc") },
    { href: "/security", icon: ShieldIcon, label: t("companyLinks.security"), desc: t("companyLinks.securityDesc") },
  ];

  const navItems: { id: DropdownId; label: string; links: NavLink[]; cta?: { label: string; href: string } }[] = [
    { id: "product", label: t("product"), links: productLinks, cta: { label: t("startFreeScan"), href: "/scan" } },
    { id: "solutions", label: t("solutions"), links: solutionLinks },
    { id: "resources", label: t("resources"), links: resourceLinks },
    { id: "company", label: t("company"), links: companyLinks },
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
          {t("pricing")}
        </Link>
        <Link
          href="/docs"
          className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          {t("docs")}
        </Link>
      </div>

      {/* Desktop CTA + Locale Switcher */}
      <div className="hidden lg:flex items-center gap-4">
        <LocaleSwitcher />
        <Link
          href="/early-access"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          {tc("signIn")}
        </Link>
        <Link
          href="/early-access"
          className="bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-5 py-2.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
        >
          {tc("getStarted")}
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
            {/* Mobile locale switcher */}
            <div className="flex justify-center">
              <LocaleSwitcher />
            </div>

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
              {t("pricing")}
            </Link>
            <div className="pt-4 border-t border-border space-y-3">
              <Link href="/early-access" className="block text-sm text-text-secondary">{tc("signIn")}</Link>
              <Link
                href="/early-access"
                className="block text-center bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-5 py-3"
              >
                {tc("getStarted")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
