"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

const legalPages = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/dpa", label: "Data Processing Agreement" },
  { href: "/legal/cookies", label: "Cookie Policy" },
  { href: "/legal/acceptable-use", label: "Acceptable Use Policy" },
  { href: "/legal/responsible-disclosure", label: "Vulnerability Disclosure" },
  { href: "/legal/sla", label: "Service Level Agreement" },
  { href: "/legal/security", label: "Security Whitepaper" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <NavBar />
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 lg:py-16">
        <div className="flex gap-12">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-24">
              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-4">
                Legal
              </p>
              <ul className="space-y-1">
                {legalPages.map((page) => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      className={`block text-sm py-1.5 px-3 rounded-md transition-colors duration-150 ${
                        pathname === page.href
                          ? "text-text-primary bg-surface-2 font-medium"
                          : "text-text-tertiary hover:text-text-secondary hover:bg-surface-1"
                      }`}
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 max-w-prose">{children}</main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
