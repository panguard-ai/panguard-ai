import type { MetadataRoute } from "next";

const locales = ["en", "zh"] as const;

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
    "/docs/api",
    "/compliance",
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
    "/legal/responsible-disclosure",
  ];

  const getFrequency = (path: string): "weekly" | "monthly" => {
    if (path === "/" || path === "/blog" || path === "/changelog" || path === "/status") return "weekly";
    return "monthly";
  };

  const getPriority = (path: string): number => {
    if (path === "/") return 1.0;
    if (path.startsWith("/product") || path === "/integrations") return 0.8;
    if (path === "/blog" || path === "/docs" || path === "/pricing") return 0.7;
    return 0.6;
  };

  return locales.flatMap((locale) =>
    pages.map((path) => ({
      url: `${base}/${locale}${path === "/" ? "" : path}`,
      lastModified: now,
      changeFrequency: getFrequency(path),
      priority: getPriority(path),
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [
            l === "zh" ? "zh-TW" : l,
            `${base}/${l}${path === "/" ? "" : path}`,
          ])
        ),
      },
    }))
  );
}
