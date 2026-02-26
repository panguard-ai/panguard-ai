import { useTranslations } from "next-intl";
import { Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "@/navigation";
import BrandLogo from "./ui/BrandLogo";

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
  const t = useTranslations("footer");
  const tc = useTranslations("common");

  const columns = [
    {
      title: t("product"),
      links: [
        { label: t("scan"), href: "/product/scan" },
        { label: t("guard"), href: "/product/guard" },
        { label: t("chat"), href: "/product/chat" },
        { label: t("trap"), href: "/product/trap" },
        { label: t("report"), href: "/product/report" },
        { label: t("compliance"), href: "/compliance" },
        { label: t("integrations"), href: "/integrations" },
      ],
    },
    {
      title: t("resources"),
      links: [
        { label: t("documentation"), href: "/docs" },
        { label: t("apiReference"), href: "/docs/api" },
        { label: t("blog"), href: "/blog" },
        { label: t("resourceCenter"), href: "/resources" },
        { label: t("changelog"), href: "/changelog" },
        { label: t("statusPage"), href: "/status" },
      ],
    },
    {
      title: t("company"),
      links: [
        { label: t("about"), href: "/company" },
        { label: t("careers"), href: "/careers" },
        { label: t("contact"), href: "/contact" },
        { label: t("press"), href: "/press" },
        { label: t("partners"), href: "/partners" },
        { label: t("customers"), href: "/customers" },
        { label: t("trustCenter"), href: "/trust" },
        { label: t("security"), href: "/security" },
      ],
    },
    {
      title: t("legal"),
      links: [
        { label: t("privacyPolicy"), href: "/legal/privacy" },
        { label: t("termsOfService"), href: "/legal/terms" },
        { label: t("cookiePolicy"), href: "/legal/cookies" },
        { label: t("dpa"), href: "/legal/dpa" },
        { label: t("sla"), href: "/legal/sla" },
        { label: t("responsibleDisclosure"), href: "/legal/responsible-disclosure" },
      ],
    },
  ];

  return (
    <footer className="bg-surface-1 border-t border-border py-12 sm:py-16 px-6 lg:px-[120px]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <FooterLogo />
            <p className="text-sm text-text-tertiary mt-3 leading-relaxed">
              {tc("footerTagline")}
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
            &copy; {tc("copyright")}
          </p>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span>{tc("soc2")}</span>
            <span>&middot;</span>
            <span>{tc("gdpr")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
