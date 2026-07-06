'use client';
import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Menu, X, ChevronDown, Star } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/navigation';
import type { Locale } from '@/navigation';
import BrandLogo from './ui/BrandLogo';
/* ─── Locale Switcher ─── */
function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (target: Locale) => {
    router.replace(pathname, { locale: target });
  };

  // compact = inside the desktop pill (pill itself is the hit area);
  // default keeps 44px touch targets for the mobile menu.
  const sizing = compact ? 'px-3 py-1.5' : 'px-3 py-1 min-h-[44px] min-w-[44px]';

  return (
    <div className="inline-flex items-center bg-surface-1 border border-border rounded-full p-0.5">
      <button
        onClick={() => switchTo('en')}
        className={`relative ${sizing} text-xs font-medium rounded-full transition-all duration-300 ${
          locale === 'en'
            ? 'text-surface-0 bg-brand-sage'
            : 'text-text-tertiary hover:text-text-secondary'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchTo('zh-TW')}
        className={`relative ${sizing} text-xs font-medium rounded-full transition-all duration-300 ${
          locale === 'zh-TW'
            ? 'text-surface-0 bg-brand-sage'
            : 'text-text-tertiary hover:text-text-secondary'
        }`}
      >
        中文
      </button>
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

/* ─── Desktop Dropdown ─── */
type DropdownItem = { label: string; desc: string; href: string; comingSoon?: boolean };

function NavDropdown({ label, items }: { label: string; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };

  // Close on click outside (for touch/mobile/headless where mouseLeave doesn't fire)
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition duration-200"
      >
        {label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 pt-2 z-[100]">
          <div className="nav-pill rounded-2xl p-1.5 min-w-[260px]">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col px-4 py-2.5 rounded-lg hover:bg-surface-2 transition-colors group ${item.comingSoon ? 'opacity-60' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className="text-sm font-semibold text-text-primary group-hover:text-brand-sage transition-colors flex items-center gap-2">
                  {item.label}
                  {item.comingSoon && (
                    <span className="text-[10px] font-medium text-text-muted bg-surface-2 rounded-full px-2 py-0.5">
                      Coming Soon
                    </span>
                  )}
                </span>
                <span className="text-xs text-text-muted mt-0.5">{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  const t = useTranslations('nav');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileAtrOpen, setMobileAtrOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const productItems: DropdownItem[] = [
    {
      label: t('productLinks.skillAuditor'),
      desc: t('productLinks.skillAuditorDesc'),
      href: '/product/skill-auditor',
    },
    { label: t('productLinks.guard'), desc: t('productLinks.guardDesc'), href: '/product/guard' },
    { label: t('productLinks.mcp'), desc: t('productLinks.mcpDesc'), href: '/product/mcp' },
    {
      label: t('productLinks.migrator'),
      desc: t('productLinks.migratorDesc'),
      href: '/migrator',
    },
    { label: t('productLinks.atrStandard'), desc: t('productLinks.atrStandardDesc'), href: '/atr' },
  ];

  const atrItems: DropdownItem[] = [
    { label: t('atrLinks.overview'), desc: t('atrLinks.overviewDesc'), href: '/atr' },
    { label: t('atrLinks.spec'), desc: t('atrLinks.specDesc'), href: '/atr/spec' },
    {
      label: t('atrLinks.governance'),
      desc: t('atrLinks.governanceDesc'),
      href: '/atr/governance',
    },
    {
      label: t('atrLinks.crosswalks'),
      desc: t('atrLinks.crosswalksDesc'),
      href: '/atr/crosswalks',
    },
    { label: t('atrLinks.adopters'), desc: t('atrLinks.adoptersDesc'), href: '/atr/adopters' },
    { label: t('atrLinks.cite'), desc: t('atrLinks.citeDesc'), href: '/atr/cite' },
  ];

  const topLinks = [
    { label: t('howItWorks'), href: '/how-it-works' },
    { label: t('threatCloud'), href: '/threat-cloud' },
    { label: t('docs'), href: 'https://docs.panguard.ai' },
    { label: t('about'), href: '/about' },
    { label: t('blog'), href: '/blog' },
  ];

  return (
    <nav
      aria-label="Main navigation"
      data-scrolled={scrolled}
      className="sticky top-3 sm:top-4 z-50 py-2"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Logo pill */}
        <div className="nav-pill rounded-full h-12 px-4 flex items-center">
          <Logo />
        </div>

        {/* Links pill: desktop nav + CTA + locale switcher + mobile hamburger */}
        <div className="nav-pill rounded-full h-12 px-2 flex items-center gap-1">
          {/* Desktop nav — xl gate: at lg the full row overflows max-w-7xl */}
          <div className="hidden xl:flex items-center gap-0.5">
            <NavDropdown label={t('product')} items={productItems} />
            <NavDropdown label={t('atr')} items={atrItems} />
            {topLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA + Locale Switcher */}
          <div className="hidden xl:flex items-center gap-2 pl-1">
            <LocaleSwitcher compact />
            <a
              href="https://github.com/panguard-ai/panguard-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary border border-border hover:border-text-tertiary rounded-full px-4 py-1.5 transition-all duration-200"
            >
              <Star className="w-3.5 h-3.5" /> GitHub
            </a>
            <Link
              href="/docs/getting-started"
              className="sheen lift bg-panguard-green text-surface-hero font-semibold text-sm rounded-full px-5 py-2 hover:bg-panguard-green-light transition-all duration-200 active:scale-[0.98]"
            >
              {t('install')}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="xl:hidden p-2 text-text-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — inline disclosure (page stays interactive), not a modal dialog */}
      {mobileOpen && (
        <div
          aria-label="Navigation menu"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-2 xl:hidden"
        >
          <div className="nav-pill rounded-2xl overflow-y-auto max-h-[calc(100vh-7rem)] p-6 space-y-1">
            <div className="flex justify-center mb-4">
              <LocaleSwitcher />
            </div>

            {/* Products accordion */}
            <button
              onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
              className="flex items-center justify-between w-full py-3 min-h-[44px] text-sm text-text-secondary hover:text-text-primary"
              aria-expanded={mobileProductsOpen}
            >
              {t('product')}
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${mobileProductsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {mobileProductsOpen && (
              <div className="pl-4 pb-2 space-y-1">
                {productItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block py-3 min-h-[44px] text-sm text-text-tertiary hover:text-text-primary ${item.comingSoon ? 'opacity-60' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                    {item.comingSoon && (
                      <span className="ml-2 text-[10px] font-medium text-text-muted bg-surface-2 rounded-full px-2 py-0.5">
                        Coming Soon
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* ATR accordion */}
            <button
              onClick={() => setMobileAtrOpen(!mobileAtrOpen)}
              className="flex items-center justify-between w-full py-3 min-h-[44px] text-sm text-text-secondary hover:text-text-primary"
              aria-expanded={mobileAtrOpen}
            >
              {t('atr')}
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${mobileAtrOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {mobileAtrOpen && (
              <div className="pl-4 pb-2 space-y-1">
                {atrItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block py-3 min-h-[44px] text-sm text-text-tertiary hover:text-text-primary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Top links */}
            {topLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-3 min-h-[44px] text-sm text-text-secondary hover:text-text-primary"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <a
              href="https://github.com/panguard-ai/panguard-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-3 min-h-[44px] text-sm text-text-secondary hover:text-text-primary"
              onClick={() => setMobileOpen(false)}
            >
              GitHub
            </a>

            <div className="pt-4 border-t border-border space-y-3">
              <Link
                href="/docs/getting-started"
                className="block text-center bg-panguard-green text-surface-hero font-semibold text-sm rounded-full px-5 py-3 hover:bg-panguard-green-light transition-colors duration-200"
                onClick={() => setMobileOpen(false)}
              >
                {t('install')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
