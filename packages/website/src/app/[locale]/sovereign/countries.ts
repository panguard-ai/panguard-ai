/**
 * Country-aware sovereign content.
 *
 * Public-safe display data curated from the sovereign country packs: the crypto
 * profile, deployment posture, and the compliance crosswalk (control capability
 * -> that country's governing framework references, kept in their authoritative
 * local form). This is display data for the marketing page — it does NOT import
 * from the private sovereign packages, and it deliberately omits the packs'
 * internal strategic notes. Regulatory references reflect research current as of
 * 2026-07-11 and are design-intent mappings, not certifications.
 *
 * Keyed by ISO 3166-1 alpha-2 (plus the synthetic 'EU'); a visitor's country is
 * resolved to one of these or to the GENERIC fallback.
 */

export interface CrosswalkRow {
  readonly capability: string;
  readonly frameworks: string;
}

export interface SovereignCountry {
  readonly code: string;
  readonly name: string;
  readonly flag: string;
  /** Signing algorithm the country's approved lists accept. */
  readonly alg: 'Ed25519' | 'ECDSA P-256';
  /** True where a validated hardware crypto module is legally required. */
  readonly hsm: boolean;
  readonly residency: string;
  readonly airGap: string;
  readonly retention: string;
  readonly crosswalk: readonly CrosswalkRow[];
  /** A short, public-safe caveat (crypto/HSM posture). */
  readonly note?: string;
}

export const SOVEREIGN_COUNTRIES: Readonly<Record<string, SovereignCountry>> = {
  TW: {
    code: 'TW',
    name: 'Taiwan',
    flag: '🇹🇼',
    alg: 'Ed25519',
    hsm: false,
    residency: 'In-country (government / Tier-A)',
    airGap: 'Required for Tier-A critical systems',
    retention: '12 months (baseline)',
    crosswalk: [
      { capability: 'Signed decision ledger', frameworks: '資通安全管理法 · 資通系統防護基準（高）· NIST 800-53 AU' },
      { capability: 'Policy-as-code + least-privilege', frameworks: '資通系統防護基準 — 存取控制 · 資通安全責任等級分級辦法' },
      { capability: 'Human approval + kill-switch', frameworks: '資通安全事件通報及應變辦法 · 資通系統防護基準 — 事件應變' },
      { capability: 'Data classification + egress', frameworks: '個人資料保護法 · 資通安全責任等級分級辦法 — 資料分級' },
      { capability: 'AI-governance alignment', frameworks: '人工智慧基本法（principle-level, no penalties）· 行政院生成式 AI 參考指引' },
      { capability: 'Supply-chain provenance', frameworks: '大陸廠牌資通訊產品禁令 — dependency / BOM provenance' },
    ],
    note: 'Ed25519 accepted; no validated-module mandate — the fastest of the sovereign profiles to deploy.',
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    alg: 'Ed25519',
    hsm: false,
    residency: 'In-country (specified-secret systems out of scope)',
    airGap: 'Not required',
    retention: '12 months (baseline)',
    crosswalk: [
      { capability: 'Signed decision ledger', frameworks: 'NISC 統一基準群（R7）· FISC 安全対策基準 第14版 · NIST 800-53 AU' },
      { capability: 'Policy-as-code + least-privilege', frameworks: 'デジタル庁 DS-920 v2.0 · NISC 統一基準' },
      { capability: 'Human approval + traceable log', frameworks: 'AI事業者ガイドライン v1.2（input → tool → conclusion）' },
      { capability: 'Data classification + egress', frameworks: '個人情報保護法 · 経済安全保障推進法' },
    ],
    note: 'EdDSA is CRYPTREC-recommended (LS-0001-2022R2); no HSM required.',
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    alg: 'Ed25519',
    hsm: false,
    residency: 'By classification (CII / defense isolated)',
    airGap: 'Not required (CII isolated regions)',
    retention: '12 months (baseline)',
    crosswalk: [
      { capability: 'Signed decision ledger', frameworks: 'IM8 (OSCAL machine-readable) · NIST 800-53 AU' },
      { capability: 'Human approval + technical controls', frameworks: 'IMDA Model AI Governance Framework for Agentic AI v1.0 · CSA Securing Agentic AI Addendum' },
      { capability: 'Supply-chain + runtime security', frameworks: 'Cybersecurity (Amendment) Act 2024 · CCoP 2.0' },
      { capability: 'Data classification + contractor obligations', frameworks: 'PDPA · IM8 data classification L0/1/2' },
    ],
    note: 'IM8 is machine-readable (OSCAL). CII / defense tiers may require a FIPS 140-3 validated module.',
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    alg: 'Ed25519',
    hsm: false,
    residency: 'In-country (federal / sovereign cloud)',
    airGap: 'Not required',
    retention: '12 months (baseline)',
    crosswalk: [
      { capability: 'Signed decision ledger', frameworks: 'UAE Information Assurance (IA) Standard V2 · NIST 800-53 AU' },
      { capability: 'Emirate-level controls', frameworks: 'DESC ISR v3.0 (Dubai) · ADDA NIAF (Abu Dhabi)' },
      { capability: 'Data protection + autonomous systems', frameworks: 'Federal PDPL · DIFC Regulation 10' },
      { capability: 'AI-governance alignment', frameworks: 'UAE Charter for AI (non-binding)' },
    ],
    note: 'Target-based controls; Ed25519 acceptable with a formal crypto policy and HSM/KMS for sensitive keys.',
  },
  EU: {
    code: 'EU',
    name: 'European Union',
    flag: '🇪🇺',
    alg: 'ECDSA P-256',
    hsm: false,
    residency: 'In-country / EU (per procurement; SecNumCloud, C5)',
    airGap: 'Not required',
    retention: '≥ 6 months (AI Act Art. 26)',
    crosswalk: [
      { capability: 'Signed ledger + automatic event logging', frameworks: 'EU AI Act Art. 12 · Art. 26 (logs ≥ 6 mo) · NIST 800-53 AU' },
      { capability: 'Human oversight + kill-switch', frameworks: 'EU AI Act Art. 14 · Art. 27 (public-sector FRIA)' },
      { capability: 'Supply-chain + vulnerability handling', frameworks: 'NIS2 · CRA' },
      { capability: 'Cloud security + provenance', frameworks: 'BSI C5:2026 · ANSSI SecNumCloud 3.2 · EUCC' },
    ],
    note: 'BSI TR-02102-1 / ANSSI approved lists exclude Ed25519 → ECDSA (or RSA-PSS); PQC-hybrid (ML-DSA) planned.',
  },
  KR: {
    code: 'KR',
    name: 'South Korea',
    flag: '🇰🇷',
    alg: 'ECDSA P-256',
    hsm: true,
    residency: 'In-country + physical isolation (C-tier)',
    airGap: 'Required (C-tier / MLS)',
    retention: '5 years (high-impact AI)',
    crosswalk: [
      { capability: 'Signed ledger + document retention', frameworks: 'AI 기본법 시행령 (5-yr retention) · 국가정보보안기본지침 · NIST 800-53 AU' },
      { capability: 'High-impact AI controls + human oversight', frameworks: 'AI 기본법 · NIS agentic-AI security guidebook' },
      { capability: 'Certified crypto module', frameworks: 'KCMVP (전자정부법 §56 → 시행령 §69)' },
      { capability: 'Security-product assurance', frameworks: 'domestic CC / 보안기능확인서 · K-ISMS · CSAP' },
    ],
    note: 'KCMVP mandates a validated crypto module (Ed25519 is not on the list) — typically a Korean OEM validated module. Requires a real HSM.',
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    alg: 'ECDSA P-256',
    hsm: true,
    residency: 'In-country (CCC / NDMO)',
    airGap: 'Not required',
    retention: '12 months (baseline)',
    crosswalk: [
      { capability: 'Signed ledger + certified crypto', frameworks: 'NCA ECC-2:2024 · NCA NCS-1:2020 · NIST 800-53 AU' },
      { capability: 'Critical-systems controls', frameworks: 'NCA CSCC-1:2019 · OTCC-1:2022' },
      { capability: 'Data classification + residency', frameworks: 'NCA CCC-2:2024 · NDMO · PDPL' },
      { capability: 'AI-governance alignment', frameworks: 'SDAIA Generative AI Guidelines for Government (non-binding)' },
    ],
    note: 'NCS-1:2020 ADVANCED tier requires a hardware crypto module (Ed25519 is not in the standard). Requires a real HSM.',
  },
};

/** The neutral cross-framework mapping shown when no country pack applies. */
export const GENERIC_COUNTRY: SovereignCountry = {
  code: 'GEN',
  name: 'General',
  flag: '🌐',
  alg: 'Ed25519',
  hsm: false,
  residency: 'Deployed on infrastructure the institution controls',
  airGap: 'Supported (signed, verify-before-install)',
  retention: 'Per governing framework',
  crosswalk: [
    { capability: 'Signed, tamper-evident decision ledger', frameworks: 'EU AI Act Art. 12 (logging) · NIST 800-53 AU' },
    { capability: 'Policy-as-code + least-privilege identity', frameworks: 'NIST 800-53 AC · ISO/IEC 42001' },
    { capability: 'Signed, versioned policy distribution', frameworks: 'NIST 800-53 CM (anti-rollback)' },
    { capability: 'Classification, egress & jurisdiction control', frameworks: 'NIST 800-53 SC · CUI handling' },
    { capability: 'Human approval, break-glass, kill-switch', frameworks: 'NIST 800-53 IR · human oversight (AI Act)' },
    { capability: 'Air-gap signed delivery + supply-chain trust', frameworks: 'SLSA-style provenance · supply-chain (SR)' },
  ],
  note: 'A country-specific compliance pack can be produced for any jurisdiction on request.',
};

/** EU/EEA member alpha-2 codes that resolve to the EU pack. */
const EU_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
]);

/** The order the country selector is rendered in. */
export const COUNTRY_ORDER = ['TW', 'JP', 'SG', 'AE', 'EU', 'KR', 'SA'] as const;

/**
 * Resolve a display country from an explicit `?c=` selection first, then the
 * request's geo country (Vercel `x-vercel-ip-country`), falling back to the
 * generic mapping. EU/EEA member codes collapse to the EU pack.
 */
export function resolveCountry(
  selected: string | undefined,
  geoCountry: string | null | undefined
): SovereignCountry {
  const pick = (raw: string | null | undefined): SovereignCountry | undefined => {
    if (!raw) return undefined;
    const code = raw.trim().toUpperCase();
    if (code in SOVEREIGN_COUNTRIES) return SOVEREIGN_COUNTRIES[code];
    if (EU_CODES.has(code)) return SOVEREIGN_COUNTRIES['EU'];
    return undefined;
  };
  // An explicit "general" selection pins the neutral view (overrides geo).
  if (selected && selected.trim().toUpperCase() === 'GEN') return GENERIC_COUNTRY;
  return pick(selected) ?? pick(geoCountry) ?? GENERIC_COUNTRY;
}
