import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://panguard.ai";
  const now = new Date().toISOString();

  const pages = [
    "/",
    "/product",
    "/product/scan",
    "/product/guard",
    "/product/chat",
    "/product/trap",
    "/product/report",
    "/integrations",
    "/pricing",
    "/early-access",
    "/demo",
    "/scan",
    "/security",
    "/technology",
    "/company",
    "/contact",
    "/solutions/developers",
    "/solutions/smb",
    "/solutions/enterprise",
    "/blog",
    "/docs",
    "/customers",
    "/careers",
    "/changelog",
    "/resources",
    "/partners",
    "/press",
    "/status",
    "/trust",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookies",
    "/legal/dpa",
    "/legal/sla",
    "/legal/acceptable-use",
    "/legal/subprocessors",
    "/legal/responsible-disclosure",
  ];

  return pages.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : path === "/blog" || path === "/changelog" || path === "/status" ? "weekly" : "monthly",
    priority: path === "/" ? 1.0 : path.startsWith("/product") || path === "/integrations" ? 0.8 : path === "/blog" || path === "/docs" || path === "/pricing" ? 0.7 : 0.6,
  }));
}
