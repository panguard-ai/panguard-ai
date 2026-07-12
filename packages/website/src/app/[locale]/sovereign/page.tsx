import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './sovereign.css';
import {
  resolveCountry,
  SOVEREIGN_COUNTRIES,
  GENERIC_COUNTRY,
  COUNTRY_ORDER,
  type SovereignCountry,
} from './countries';

// Dynamic: the §03 crosswalk is rendered for the visitor's jurisdiction, read
// from the `?c=` selection or the request geo (Vercel x-vercel-ip-country).
export const dynamic = 'force-dynamic';

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Build the §03 section for a resolved jurisdiction: a country selector, the
 * deployment profile (algorithm / HSM / residency / air-gap / retention), and
 * the compliance crosswalk in that country's own framework vocabulary. All data
 * is author-controlled display copy (see countries.ts) — escaped defensively.
 */
function crosswalkSection(country: SovereignCountry): string {
  const isGeneric = country.code === GENERIC_COUNTRY.code;
  const chips = [...COUNTRY_ORDER.map((code) => SOVEREIGN_COUNTRIES[code]!), GENERIC_COUNTRY]
    .map((c) => {
      const active = c.code === country.code ? ' active' : '';
      const param = c.code === GENERIC_COUNTRY.code ? 'gen' : c.code;
      return `<a class="cchip${active}" href="?c=${param}"><span class="cf">${c.flag}</span>${escapeHtml(c.name)}</a>`;
    })
    .join('');
  const rows = country.crosswalk
    .map(
      (r) =>
        `<tr><td class="k">${escapeHtml(r.capability)}</td><td class="std">${escapeHtml(r.frameworks)}</td></tr>`
    )
    .join('');
  const hsmVal = country.hsm
    ? '<div class="pfv req">Required (validated module)</div>'
    : '<div class="pfv">Not required</div>';
  const heading = isGeneric
    ? 'Built to produce the evidence that governing frameworks require'
    : `Mapped to the frameworks that govern ${escapeHtml(country.name)}`;
  const sub = isGeneric
    ? 'Showing a general, cross-framework mapping. Select your jurisdiction to see its deployment profile and the specific frameworks this maps to.'
    : `Showing <b>${escapeHtml(country.name)}</b> — detected or selected. Choose another jurisdiction to compare its deployment profile and frameworks.`;
  const note = country.note ? `<p class="cnote reveal">${escapeHtml(country.note)}</p>` : '';
  const colHead = isGeneric
    ? 'Framework reference'
    : `${escapeHtml(country.name)} framework reference`;
  return `<section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 07</span><span class="slabel">Compliance crosswalk — by jurisdiction</span></div>
      <h2 class="reveal">${heading}</h2>
      <p class="sub reveal">${sub} <span class="note">Design-intent mapping — not a certification or accreditation.</span></p>
      <div class="cselect reveal">${chips}</div>
      <div class="profile reveal">
        <div class="pf"><div class="pfk">Signing algorithm</div><div class="pfv">${escapeHtml(country.alg)}</div></div>
        <div class="pf"><div class="pfk">Hardware module</div>${hsmVal}</div>
        <div class="pf"><div class="pfk">Data residency</div><div class="pfv">${escapeHtml(country.residency)}</div></div>
        <div class="pf"><div class="pfk">Air-gap</div><div class="pfv">${escapeHtml(country.airGap)}</div></div>
        <div class="pf"><div class="pfk">Audit-log retention</div><div class="pfv">${escapeHtml(country.retention)}</div></div>
      </div>
      <div class="tbl reveal"><table>
        <thead><tr><th>Control capability</th><th>${colHead}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      ${note}
    </div>
  </section>`;
}

export const metadata: Metadata = {
  title: 'Sovereign AI — Capability Brief',
  description:
    'PanGuard Sovereign is a governance and assurance layer that enforces national policy at every autonomous-agent action and produces cryptographic, offline-verifiable evidence of every decision. A reference architecture for national institutions.',
  openGraph: {
    title: 'PanGuard Sovereign — Capability Brief',
    description:
      'Sovereign control over autonomous AI systems. Enforced at every agent action; cryptographic proof of every decision; verifiable offline.',
  },
};

const BRIEF_HTML = `<div class="sv">
  <div class="topglow"></div>
  <div class="grain"></div>

  <div class="docstrip">
    <div class="bar">
      <a class="mark" href="/" aria-label="PanGuard — back to the main site">
        <span class="wm">PANGUARD</span>
        <svg class="logo" viewBox="385 323 1278 1403" fill="none" aria-hidden="true">
          <path fill="#8B9A8E" d="M 1021.5 830.423 C 1026.54 829.911 1045.81 832.659 1051.64 833.401 C 1072.38 835.99 1093.1 838.746 1113.8 841.667 L 1329.99 871.428 L 1329.95 1306.51 L 1330 1422.21 C 1330.01 1450.54 1332.08 1491.81 1325.18 1518.04 C 1318.79 1541.46 1305.62 1562.47 1287.31 1578.42 C 1269.98 1593.59 1234.62 1610.78 1212.96 1622.97 C 1151.4 1657.6 1087.44 1689.5 1026.42 1725.08 L 1024.58 1725.72 C 1020.72 1724.57 1005.67 1715.74 1001.44 1713.38 C 986.676 1705.08 971.857 1696.88 956.982 1688.79 L 836.342 1623.07 C 818.678 1613.37 800.537 1603.48 783.285 1593.93 C 741.183 1570.62 718.225 1528.6 718.162 1480.8 C 718.14 1463.85 718.093 1446.28 718.119 1429.07 L 718.13 1313.33 L 718.15 871.408 C 819.171 858.462 920.068 841.835 1021.5 830.423 z"/>
          <path fill="#0E0C0B" d="M 1022.52 931.436 C 1027.43 930.745 1072.31 937.152 1079.51 938.107 C 1129.15 944.531 1178.76 951.264 1228.32 958.306 L 1228.23 1353.88 L 1228.35 1443.73 C 1228.37 1464.29 1233.5 1493.24 1214.51 1505.36 C 1195.74 1517.34 1175.98 1527.71 1156.43 1538.41 C 1112.57 1561.92 1068.87 1585.75 1025.35 1609.89 L 1024.59 1610.05 C 1019.31 1608.51 1009.91 1602.52 1004.79 1599.72 C 950.803 1570.14 896.481 1541.36 842.686 1511.4 C 829.113 1503.85 820.756 1496.4 820.195 1479.81 C 819.565 1461.16 819.816 1442.57 819.824 1423.9 L 819.867 1314.91 L 819.664 958.376 C 837.727 956.927 860.873 952.653 879.255 950.388 C 926.512 944.567 975.292 936.455 1022.52 931.436 z"/>
          <path fill="#8B9A8E" d="M 687.515 577.4 C 696.504 576.451 715.718 579.584 725.68 580.913 L 782.266 588.553 C 853.62 598.25 926.853 607.634 997.939 618.387 L 997.872 779.654 C 966.188 784.487 928.734 789.954 897.039 793.352 L 897.073 705.399 C 831.524 696.853 760.432 685.286 694.176 678.356 C 683.151 677.203 646.195 683.753 632.643 685.485 L 487.112 705.406 C 488.77 841.757 487.098 980.17 487.357 1116.69 L 487.339 1188.98 C 487.213 1243.94 479.328 1246.69 530.666 1273.69 C 574.625 1298.03 623.372 1322.43 666.093 1347.35 C 665.454 1385.26 666.06 1424.82 666.087 1462.87 C 649.609 1452.6 628.321 1441.62 610.88 1432.12 L 500.871 1372.76 C 476.603 1359.56 440.159 1342.09 421.535 1323.57 C 404.11 1306.02 392.433 1283.59 388.055 1259.25 C 384.254 1237.81 385.323 1203.28 385.354 1180.66 L 385.478 1064.48 L 385.312 618.209 C 414.868 615.376 445.833 609.518 475.437 605.863 C 545.54 597.208 617.46 584.737 687.515 577.4 z"/>
          <path fill="#8B9A8E" d="M 1348.89 577.369 C 1360.73 575.936 1415.83 584.528 1431.77 586.589 C 1508.75 596.536 1585.62 608.685 1662.67 618.335 L 1662.73 1028.87 L 1662.69 1154.09 C 1662.67 1223.3 1674.33 1293.75 1609.64 1337.92 C 1596.01 1347.22 1581.75 1354.57 1567.33 1362.44 L 1512.89 1391.87 L 1382 1462.6 C 1383.76 1427.96 1382.35 1382.83 1382.21 1347.24 C 1420 1324.81 1467.93 1301.58 1507.58 1279.5 C 1524.53 1270.36 1558.74 1256.3 1560.1 1235.39 C 1561.42 1215.18 1560.95 1193.69 1560.9 1173.32 L 1560.87 1066.29 L 1560.68 705.345 C 1543.39 703.65 1521.51 700.068 1504.1 697.576 C 1473.23 693.054 1442.33 688.801 1411.39 684.819 C 1399.03 683.204 1369.09 678.563 1357.99 678.482 C 1343.65 678.377 1310.02 683.839 1294.14 685.904 C 1246.36 692.092 1198.63 698.627 1150.95 705.51 C 1151.37 734.567 1151.1 764.255 1151.14 793.361 C 1118.48 789.558 1083.43 784.206 1050.79 779.597 L 1050.69 617.847 L 1348.89 577.369 z"/>
          <path fill="#8B9A8E" d="M 1017.32 323.354 C 1027.15 321.591 1105.66 333.344 1122.51 335.603 C 1166.74 341.267 1210.92 347.328 1255.05 353.786 C 1279.68 357.183 1305.51 360.23 1329.92 364.192 L 1329.98 526.684 C 1296.55 530.372 1261.73 535.721 1228.25 540.29 C 1228.4 510.591 1228.39 480.892 1228.23 451.193 C 1219.27 449.729 1209.61 448.427 1200.57 447.329 C 1144.13 440.467 1086.78 429.864 1030.24 424.572 C 1018.71 422.967 967.642 430.978 952.027 433.125 L 819.579 450.968 C 820.252 479.945 819.726 511.22 819.879 540.382 C 785.991 535.397 752.051 530.778 718.064 526.526 L 717.99 364.358 C 745.543 359.872 774.642 356.332 802.417 352.399 L 1017.32 323.354 z"/>
        </svg>
        <span class="wm">AI</span>
        <span class="sov">Sovereign</span>
      </a>
      <div class="docref">Capability Brief · Rev 0.3</div>
    </div>
  </div>

  <header class="hero">
    <div class="wrap">
      <div class="eyebrow reveal">Capability Brief · For National Institutions</div>
      <h1 class="reveal"><span class="em">Sovereign</span> control over autonomous AI systems.</h1>
      <div class="register reveal">Enforced at every agent action &nbsp;·&nbsp; Cryptographic proof of every decision &nbsp;·&nbsp; Verifiable offline, without trust in the supplier</div>
      <p class="abstract reveal">As nations bring AI capability in-house, the governing question is no longer which model to procure, but how autonomous agents may act on sovereign data — and how that control is demonstrated to a regulator, an auditor, or an allied state. PanGuard Sovereign is a governance and assurance layer that enforces national policy at every agent action and produces cryptographic evidence of every decision. It operates in front of any model or agent framework, on infrastructure the institution controls — built on an open, vendor-neutral standard developed in a democratic jurisdiction, so sovereignty does not mean trading one foreign dependency for another.</p>
      <div class="heroactions reveal">
        <a class="btn" href="mailto:adam@agentthreatrule.org?subject=PanGuard%20Sovereign%20—%20technical%20briefing">Request a technical briefing <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 12L12 4M12 4H5M12 4V11" stroke="#B4C1B7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <a class="btn ghost" href="/PanGuard-Sovereign-Capability-Brief.pdf" target="_blank" rel="noopener">Download the brief (PDF) <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2V11M8 11L4.5 7.5M8 11L11.5 7.5M3 13.5H13" stroke="#B4C1B7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      </div>
      <div class="controlline reveal">
        <span>STATUS &nbsp;<b>Reference architecture · design-partner stage</b></span>
        <span>MATURITY &nbsp;<b>Laboratory-validated prototype (≈ TRL 4)</b></span>
        <span>ACCREDITATION &nbsp;<b>None claimed</b></span>
      </div>
    </div>
  </header>

  <div class="roster-sec">
    <div class="wrap">
      <div class="roster-h reveal">Nations advancing sovereign AI capability</div>
      <div class="roster reveal"><span class="nchip" title="United States"><span class="nfe">🇺🇸</span><span class="ncode">US</span><span class="nname">United States</span></span><span class="nchip" title="United Kingdom"><span class="nfe">🇬🇧</span><span class="ncode">GB</span><span class="nname">United Kingdom</span></span><span class="nchip" title="European Union"><span class="nfe">🇪🇺</span><span class="ncode">EU</span><span class="nname">European Union</span></span><span class="nchip" title="Japan"><span class="nfe">🇯🇵</span><span class="ncode">JP</span><span class="nname">Japan</span></span><span class="nchip" title="Singapore"><span class="nfe">🇸🇬</span><span class="ncode">SG</span><span class="nname">Singapore</span></span><span class="nchip" title="South Korea"><span class="nfe">🇰🇷</span><span class="ncode">KR</span><span class="nname">South Korea</span></span><span class="nchip" title="France"><span class="nfe">🇫🇷</span><span class="ncode">FR</span><span class="nname">France</span></span><span class="nchip" title="Germany"><span class="nfe">🇩🇪</span><span class="ncode">DE</span><span class="nname">Germany</span></span><span class="nchip" title="Canada"><span class="nfe">🇨🇦</span><span class="ncode">CA</span><span class="nname">Canada</span></span><span class="nchip" title="Australia"><span class="nfe">🇦🇺</span><span class="ncode">AU</span><span class="nname">Australia</span></span><span class="nchip" title="UAE"><span class="nfe">🇦🇪</span><span class="ncode">AE</span><span class="nname">UAE</span></span><span class="nchip" title="Saudi Arabia"><span class="nfe">🇸🇦</span><span class="ncode">SA</span><span class="nname">Saudi Arabia</span></span><span class="nchip" title="India"><span class="nfe">🇮🇳</span><span class="ncode">IN</span><span class="nname">India</span></span><span class="nchip" title="Israel"><span class="nfe">🇮🇱</span><span class="ncode">IL</span><span class="nname">Israel</span></span><span class="nchip" title="Taiwan"><span class="nfe">🇹🇼</span><span class="ncode">TW</span><span class="nname">Taiwan</span></span><span class="nchip" title="Switzerland"><span class="nfe">🇨🇭</span><span class="ncode">CH</span><span class="nname">Switzerland</span></span><span class="nchip" title="Netherlands"><span class="nfe">🇳🇱</span><span class="ncode">NL</span><span class="nname">Netherlands</span></span></div>
    </div>
  </div>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 01</span><span class="slabel">The problem</span></div>
      <h2 class="reveal">Autonomous AI acts faster than any control built for models</h2>
      <p class="sub reveal">Agentic systems call tools, move data, and chain decisions on their own. For a national institution, three gaps open that choosing a model — or a cloud — cannot close.</p>
      <div class="threecol">
        <div class="tc reveal"><div class="tcn">01 · AUTONOMY</div><h3>The risk is the action, not the model</h3><p>An agent that can act can exfiltrate data, escalate privilege, or destroy state in milliseconds, with no human in the loop. A safer model does not govern what the agent is permitted to do.</p></div>
        <div class="tc reveal"><div class="tcn">02 · DEPENDENCE</div><h3>Foreign stacks hold your control plane</h3><p>Governing agents on a US or Chinese hyperscaler's model and cloud puts the keys, the policy, and the audit trail outside your jurisdiction — and outside your reach in a crisis.</p></div>
        <div class="tc reveal"><div class="tcn">03 · PROOF</div><h3>&ldquo;Trust us&rdquo; is not a control</h3><p>A regulator, an auditor, an allied state, or a budget review needs demonstrable proof of what agents did and were allowed to do — not a supplier's assurance.</p></div>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 02</span><span class="slabel">How it works</span></div>
      <h2 class="reveal">One governed chokepoint in front of every agent action</h2>
      <p class="sub reveal">Every tool call an agent makes passes a single decision point — detection against the open Agent Threat Rules standard, then authorization against your own signed national policy — and produces evidence anyone can verify offline. Deny-by-default: the absence of a decision is a denial.</p>
      <div class="diagram reveal">
        <svg class="archdiag" viewBox="0 0 720 284" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Agent to ATR Rules and Policy Engine to signed evidence to tool">
          <rect x="6" y="86" width="116" height="60" rx="3" fill="#141110" stroke="#29241F"/>
          <text x="64" y="112" text-anchor="middle" fill="#ECE6DB" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="12.5">Agent</text>
          <text x="64" y="128" text-anchor="middle" fill="#726A60" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="8.5">any model / framework</text>
          <path d="M122 116 H182" stroke="#8B9A8E" stroke-width="1.4"/><path d="M182 116 l-7 -4 v8 z" fill="#8B9A8E"/>
          <rect x="190" y="42" width="338" height="152" rx="4" fill="#141110" stroke="#8B9A8E" stroke-opacity="0.45"/>
          <text x="206" y="66" fill="#8B9A8E" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="9.5" letter-spacing="1.4">PANGUARD SOVEREIGN CHOKEPOINT</text>
          <rect x="206" y="80" width="306" height="48" rx="3" fill="#0E0C0B" stroke="#29241F"/>
          <text x="220" y="101" fill="#ECE6DB" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="12">ATR Rules</text>
          <text x="220" y="117" fill="#ABA298" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="8.5">detect · open standard · 748 rules</text>
          <rect x="206" y="136" width="306" height="50" rx="3" fill="#0E0C0B" stroke="#29241F"/>
          <text x="220" y="158" fill="#ECE6DB" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="12">Policy Engine</text>
          <text x="220" y="174" fill="#ABA298" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="8.5">authorize · your signed policy · deny-by-default</text>
          <path d="M528 116 H586" stroke="#8B9A8E" stroke-width="1.4"/><path d="M586 116 l-7 -4 v8 z" fill="#8B9A8E"/>
          <rect x="594" y="86" width="120" height="60" rx="3" fill="#141110" stroke="#29241F"/>
          <text x="654" y="112" text-anchor="middle" fill="#ECE6DB" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="12">Tool / Data</text>
          <text x="654" y="128" text-anchor="middle" fill="#726A60" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="8.5">only if allowed</text>
          <path d="M359 194 V224" stroke="#8B9A8E" stroke-width="1.4"/><path d="M359 224 l-4 -7 h8 z" fill="#8B9A8E"/>
          <rect x="190" y="232" width="338" height="46" rx="3" fill="#141110" stroke="#29241F"/>
          <text x="206" y="253" fill="#B4C1B7" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="12">Signed decision ledger</text>
          <text x="206" y="269" fill="#726A60" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="8.5">Ed25519 + Merkle · public-key verifiable, offline · even the operator cannot forge it</text>
        </svg>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 03</span><span class="slabel">Why PanGuard Sovereign</span></div>
      <h2 class="reveal">Three properties a hyperscaler cannot give a sovereign buyer</h2>
      <div class="threecol" style="margin-top:30px">
        <div class="tc reveal"><div class="tcn">SOVEREIGN</div><h3>Runs where you control it</h3><p>On-premise or air-gapped, on infrastructure the institution owns. No outbound dependency, no phone-home, no foreign cloud in the trust path. The signing keys never leave your control.</p></div>
        <div class="tc reveal"><div class="tcn">VERIFIABLE</div><h3>Operator-zero-trust evidence</h3><p>Every decision is public-key signed; an auditor verifies it offline holding only a public key — without trusting the operator, the log, or us. Not &ldquo;trust us&rdquo;: prove it.</p></div>
        <div class="tc reveal"><div class="tcn">OPEN STANDARD</div><h3>Vendor-neutral, no lock-in</h3><p>Built on the open Agent Threat Rules standard — developed in a democratic jurisdiction, not a US or Chinese single-vendor stack — and already shipping in production. Your evidence outlives any one supplier.</p></div>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 04</span><span class="slabel">Adoption — in production</span></div>
      <h2 class="reveal">The open standard underneath is already deployed at scale</h2>
      <p class="sub reveal">PanGuard Sovereign is built on Agent Threat Rules (748 rules) — the open detection standard adopted, through merged public contributions, by leading security vendors and standards bodies. Every entry below is independently verifiable.</p>
      <div class="proof reveal">
        <div class="proofrow"><span class="plab">In production</span><span class="pnames">Microsoft (Agent Governance Toolkit) &nbsp;·&nbsp; Cisco (AI Defense) &nbsp;·&nbsp; Gen Digital (Norton / Avast)</span></div>
        <div class="proofrow"><span class="plab">Standards bodies</span><span class="pnames">MISP / CIRCL &nbsp;·&nbsp; OWASP &nbsp;·&nbsp; FINOS (Linux Foundation) &nbsp;·&nbsp; SigmaHQ</span></div>
        <div class="proofrow"><span class="plab">Also shipping</span><span class="pnames">AMD (GAIA) &nbsp;·&nbsp; Microsoft PyRIT &nbsp;·&nbsp; AG2 (AutoGen) &nbsp;·&nbsp; rulezet / CIRCL</span></div>
      </div>
      <div><a class="btn ghost" href="https://agentthreatrule.org/ecosystem" target="_blank" rel="noopener noreferrer">Verify independently at agentthreatrule.org/ecosystem <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 12L12 4M12 4H5M12 4V11" stroke="#B4C1B7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 05</span><span class="slabel">Sovereign control domains</span></div>
      <h2 class="reveal">An enforceable control for every dimension of sovereignty</h2>
      <p class="sub reveal">Data, compute, model, and governance — the four dimensions nations use to define AI sovereignty. The architecture provides an enforced, auditable control for each, positioned in front of any agent, model, or tool platform already in operation.</p>
      <div class="matrix">
        <div class="cell reveal">
          <div class="ci">D1 — DATA</div><h3>Data sovereignty</h3>
          <p>Sensitive data is classified and its handling enforced as it flows — decrypted only where policy and hardware attestation permit.</p>
          <ul><li>Classification that rides the data (high-water-mark)</li><li>Jurisdiction and residency enforced at every boundary</li><li>Policy-gated decryption with envelope encryption</li><li>Secret-egress prevention on outbound calls</li></ul>
        </div>
        <div class="cell reveal">
          <div class="ci">D2 — COMPUTE</div><h3>Compute sovereignty</h3>
          <p>Executes on hardware the institution controls — fully offline, no phone-home — releasing keys only to attested endpoints.</p>
          <ul><li>Air-gap delivery: signed bundle, verify-before-install</li><li>On-premise runtime, no outbound dependency</li><li class="seam">Confidential-compute attestation (NVIDIA CC / TEE)</li></ul>
        </div>
        <div class="cell reveal">
          <div class="ci">D3 — MODEL</div><h3>Model sovereignty</h3>
          <p>Model-agnostic by design. Governs any agent or LLM; an optional on-premise adjudicator may escalate for review, never authorize.</p>
          <ul><li>Operates in front of any model or agent framework</li><li class="seam">On-premise semantic adjudicator (encoder classifier)</li><li>Tighten-only: advises escalation, never grants authority</li></ul>
        </div>
        <div class="cell reveal">
          <div class="ci">D4 — GOVERNANCE</div><h3>Governance sovereignty</h3>
          <p>Every agent action is decided by the institution's own signed policy and written to a ledger any third party can verify.</p>
          <ul><li>Signed policy-as-code; deny-by-default; anti-rollback</li><li>Signed decision ledger with transparency log</li><li>Human approval, dual-control break-glass, kill-switch</li><li>Continuous, tamper-evident audit trail</li></ul>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 06</span><span class="slabel">Assurance model</span></div>
      <h2 class="reveal">Assurance that does not depend on trusting the supplier</h2>
      <p class="sub reveal">Sovereignty means the institution need never take the supplier's word. Every security-critical action is cryptographically signed, and any party holding only a public key can verify it, offline.</p>
      <div class="principles">
        <div class="pr reveal"><span class="pn">01</span><div><h4>Signed, not asserted</h4><p>Policies, approvals, break-glass grants, key releases, and every gate decision are Ed25519-signed at the point of action.</p></div></div>
        <div class="pr reveal"><span class="pn">02</span><div><h4>Third-party provable</h4><p>An auditor holding only the public key and an inclusion proof confirms a decision occurred — without the log, without the operator.</p></div></div>
        <div class="pr reveal"><span class="pn">03</span><div><h4>Fail-closed by default</h4><p>A missing identity, an unverifiable policy, or a broken audit path denies the action. Absence never resolves to allow.</p></div></div>
        <div class="pr reveal"><span class="pn">04</span><div><h4>Open and inspectable</h4><p>Built on the open Agent Threat Rules standard. No black box and no proprietary data model to adopt.</p></div></div>
      </div>
      <p class="cnote reveal">In practice this is the evidence a national-security audit, a budget or procurement review, and an EU AI Act Art. 12 / 26 high-risk logging obligation require — produced continuously at the point of each decision, not reconstructed after an incident.</p>
    </div>
  </section>

  <!--CROSSWALK-->

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 08</span><span class="slabel">Capability register</span></div>
      <h2 class="reveal">Present capability and maturity</h2>
      <p class="sub reveal">A working prototype under continuous independent adversarial review (approximately 1,700 automated tests; 30 review passes to date). Maturity is stated per capability against a two-state scale, defined in the legend below.</p>
      <div class="tbl reveal"><table>
        <thead><tr><th>#</th><th>Capability</th><th>Function</th><th>Maturity</th></tr></thead>
        <tbody>
          <tr><td class="idx">01</td><td class="k">Identity &amp; least-privilege</td><td class="fn">Per-agent verified principal; delegation only attenuates, never widens</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">02</td><td class="k">Policy-as-code</td><td class="fn">Signed, versioned, deny-by-default; classification / jurisdiction / obligations</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">03</td><td class="k">Signed decision ledger</td><td class="fn">Ed25519 with Merkle transparency; third-party verifiable</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">04</td><td class="k">Data taint &amp; egress control</td><td class="fn">Classification rides data; secret-egress and jurisdiction gates</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">05</td><td class="k">Human approval &amp; break-glass</td><td class="fn">Signed single-use approvals; dual-control emergency override</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">06</td><td class="k">Supply-chain &amp; A2A auth</td><td class="fn">Signed tool-trust catalogue; authenticated inter-agent messages</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">07</td><td class="k">Kill-switch</td><td class="fn">Enforced containment — severs the session; every subsequent call denied</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">08</td><td class="k">Policy-gated key release</td><td class="fn">Sensitive documents decrypt only at an authorized, attested endpoint</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">09</td><td class="k">Air-gap bundle</td><td class="fn">Signed manifest; the receiver verifies provenance before installing</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">10</td><td class="k">Operator console</td><td class="fn">Loopback, token-authenticated control surface with web interface</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">11</td><td class="k">Agent-facing HTTP fleet</td><td class="fn">Multi-session Streamable HTTP transport; per-session isolation and resource bounds</td><td><span class="mat impl">Implemented</span></td></tr>
          <tr><td class="idx">12</td><td class="k">Confidential-compute attestation</td><td class="fn">Measurement allowlist with key-binding anti-relay verification</td><td><span class="mat seam">Integration seam</span></td></tr>
          <tr><td class="idx">13</td><td class="k">On-premise adjudicator</td><td class="fn">Local model advises escalation only (tighten-only)</td><td><span class="mat seam">Integration seam</span></td></tr>
          <tr><td class="idx">14</td><td class="k">HSM / PKCS#11 signing</td><td class="fn">Hardware-held keys for jurisdictions that mandate a validated module</td><td><span class="mat seam">Integration seam</span></td></tr>
        </tbody>
      </table></div>
      <div class="legend reveal">
        <span><b>Implemented</b> — built and validated under independent adversarial review in a laboratory environment (≈ TRL 4).</span>
        <span><b>Integration seam</b> — interface defined and tested against a reference verifier; integration with the institution's own hardware or models is pending.</span>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 09</span><span class="slabel">Engagement path</span></div>
      <h2 class="reveal">A staged path from evaluation to a deployment you operate</h2>
      <p class="sub reveal">Each stage is bounded and low-commitment; you can stop after any one. Nothing requires a purchase to evaluate, and no data leaves your environment at any stage.</p>
      <div class="stages">
        <div class="stg reveal">
          <div class="sn">STAGE 01</div>
          <h4>Technical evaluation</h4>
          <p>An asynchronous evaluation, under NDA where required. You receive the evaluation kit: a reference architecture, a compliance crosswalk for your own jurisdiction, an honest statement of maturity and boundaries, and a demonstration you can run yourself — drive an agent through the governed layer, then verify the signed decision ledger offline holding only a public key.</p>
          <div class="meta">Commitment &nbsp;<b>None</b></div>
        </div>
        <div class="stg reveal">
          <div class="sn">STAGE 02</div>
          <h4>Reference deployment</h4>
          <p>A single deployment in a controlled environment you choose, in your jurisdiction and language. Delivered air-gapped and verified before install. You receive a running, governed reference case, plus the human-signed acceptance and decision evidence you can put in front of a regulator or auditor.</p>
          <div class="meta">Commitment &nbsp;<b>Scoped pilot</b></div>
        </div>
        <div class="stg reveal">
          <div class="sn">STAGE 03</div>
          <h4>Production path</h4>
          <p>Scope the requirements only an external party can satisfy — certification via an accredited path, and a validated hardware module where a jurisdiction mandates one — with support, service levels, and responsibilities defined against the concrete deployment rather than a brochure.</p>
          <div class="meta">Commitment &nbsp;<b>Framework agreement</b></div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 10</span><span class="slabel">Collaboration model</span></div>
      <h2 class="reveal">How a deployment reaches an institution — and who owns what</h2>
      <p class="sub reveal">PanGuard is the technology supplier, not the prime. An in-country partner holds the local relationship and the contract vehicle; the institution keeps sovereign control. Each party owns a distinct part, so accountability and language stay in-country — a familiar supplier-to-integrator arrangement, not a new one to invent.</p>
      <div class="parties">
        <div class="party reveal">
          <div class="phdr"><div class="pname">PanGuard</div><div class="prole">Technology supplier</div></div>
          <div class="prow"><div class="pk">Provides</div><div class="pv">The sovereign runtime, the signing and verification stack, and the open Agent Threat Rules standard.</div></div>
          <div class="prow"><div class="pk">Owns</div><div class="pv own">The engine and its evidence model — maintained in the open.</div></div>
        </div>
        <div class="party reveal">
          <div class="phdr"><div class="pname">In-country partner</div><div class="prole">Prime integrator · SI or national lab</div></div>
          <div class="prow"><div class="pk">Provides</div><div class="pv">The contract vehicle, local delivery, language, first-line support, and the government relationship.</div></div>
          <div class="prow"><div class="pk">Owns</div><div class="pv own">The customer relationship and the deployment.</div></div>
        </div>
        <div class="party reveal">
          <div class="phdr"><div class="pname">National institution</div><div class="prole">Operator · customer</div></div>
          <div class="prow"><div class="pk">Provides</div><div class="pv">Its own signed policy, its data, and the environment the runtime runs in.</div></div>
          <div class="prow"><div class="pk">Owns</div><div class="pv own">Sovereign control — the signing keys, the policy, and the audit trail. Nothing leaves its control.</div></div>
        </div>
      </div>
      <div class="modelnote reveal">
        <div><span class="mk">Procurement</span><span>The institution procures through its in-country partner, who holds the local contract vehicle. PanGuard supplies the technology beneath — the same channel governments already use for complex systems.</span></div>
        <div><span class="mk">Continuity</span><span>Because the standard and the verifier are open, the institution's evidence stays verifiable regardless of any single supplier's future. Sovereignty is never a dependency on one company.</span></div>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 11</span><span class="slabel">Delivery</span></div>
      <h2 class="reveal">Delivered into an environment with no outbound connectivity — verifiable at every step</h2>
      <p class="sub reveal">The delivery mechanism is built for an air-gapped environment and leaves cryptographic evidence at each step, so an auditor can later confirm exactly what was installed and that a human authorized it.</p>
      <div class="steps reveal">
        <div class="step"><span class="qn">01</span><div><h4>Package</h4><p>A signed bundle: a manifest over every file, signed by the delivery key.</p></div></div>
        <div class="step"><span class="qn">02</span><div><h4>Transfer</h4><p>Moved across the air gap on approved media. Nothing phones home; the runtime needs no outbound connectivity.</p></div></div>
        <div class="step"><span class="qn">03</span><div><h4>Verify</h4><p>Offline, with only the published public key. The receiver confirms the signature and that every file matches the manifest before anything is installed; a mismatch fails closed.</p></div></div>
        <div class="step"><span class="qn">04</span><div><h4>Accept</h4><p>A human signs acceptance (検収 / 驗収). The record recomputes the sign-off from the actual delivery steps, binds to the bundle's cryptographic identity, and is itself verifiable with only a public key.</p></div></div>
        <div class="step"><span class="qn">05</span><div><h4>Deploy</h4><p>Configuration and orchestration values are derived from your country pack; an unsafe network exposure is refused at deploy time, not left to a checklist.</p></div></div>
        <div class="step"><span class="qn">06</span><div><h4>Operate</h4><p>A loopback operator console: human approvals, dual-control break-glass, and the kill-switch — every action written to the signed, tamper-evident decision ledger.</p></div></div>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="shead reveal"><span class="snum">§ 12</span><span class="slabel">Next steps</span></div>
      <h2 class="reveal">Start with a briefing — proceed to a pilot when you are ready</h2>
      <p class="sub reveal">Three ways to engage, each bounded and low-commitment. Choose the one that fits where your institution is.</p>
      <div class="nextsteps reveal">
        <a class="nstep" href="mailto:adam@agentthreatrule.org?subject=PanGuard%20Sovereign%20—%20technical%20briefing"><span class="nsn">01</span><span class="nst">Schedule a technical briefing</span><span class="nsd">Async, under NDA where required · architecture, honest boundaries, a verifiable demo · no commitment</span></a>
        <a class="nstep" href="mailto:adam@agentthreatrule.org?subject=PanGuard%20Sovereign%20—%20design-partner%20pilot"><span class="nsn">02</span><span class="nst">Design-partner pilot</span><span class="nsd">A reference deployment in a controlled environment you choose, in your jurisdiction and language</span></a>
        <a class="nstep" href="mailto:adam@agentthreatrule.org?subject=PanGuard%20Sovereign%20—%20sovereign%20PoC"><span class="nsn">03</span><span class="nst">Sovereign PoC</span><span class="nsd">Prove it air-gapped on your own infrastructure — signed delivery, human-signed acceptance, offline-verifiable evidence</span></a>
      </div>
      <div class="engage" style="margin-top:1px">
        <div class="path reveal">
          <h3>National institutions</h3>
          <p>For AI safety and security institutes, AI offices, ministries, and operators of defense and critical infrastructure. Begin at Stage 01 — an asynchronous technical evaluation with the kit above, under NDA where required, with no commercial commitment.</p>
          <div><a class="btn" href="mailto:adam@agentthreatrule.org?subject=PanGuard%20Sovereign%20—%20technical%20briefing">Request a technical briefing <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 12L12 4M12 4H5M12 4V11" stroke="#B4C1B7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>
        </div>
        <div class="path reveal">
          <h3>In-country partners</h3>
          <p>For system integrators and national laboratories with public-sector relationships. Deploy locally, in the customer's jurisdiction and language. PanGuard supplies the runtime and signing stack; the partner owns the relationship and the deployment.</p>
          <div><a class="btn ghost" href="mailto:adam@agentthreatrule.org?subject=PanGuard%20Sovereign%20—%20in-country%20partner">Establish a partnership</a></div>
        </div>
      </div>
    </div>
  </section>

  <div class="docfoot">
    <div class="wrap">
      <div class="ctrl reveal">
        <div><div class="lab">Document</div><div class="val">Sovereign Capability Brief</div></div>
        <div><div class="lab">Revision</div><div class="val">0.3</div></div>
        <div><div class="lab">Classification</div><div class="val">Unrestricted</div></div>
        <div><div class="lab">Contact</div><div class="val">adam@agentthreatrule.org</div></div>
      </div>
      <div class="reveal" style="margin-top:22px"><a class="btn ghost" href="/">&#8592; panguard.ai — PanGuard main site</a></div>
      <p class="disclaimer reveal">PanGuard Sovereign is a reference architecture at design-partner stage, built on the open Agent Threat Rules standard. This brief describes a working prototype under active development — not a generally-available, certified, or accredited product. Framework references indicate design intent and traceability, not certification. Maturity and capability statements are current as of Revision 0.3 and are subject to independent verification.</p>
    </div>
  </div>
</div>`;

export default async function SovereignPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const [sp, hdrs] = await Promise.all([searchParams, headers()]);
  const country = resolveCountry(sp?.c, hdrs.get('x-vercel-ip-country'));
  const html = BRIEF_HTML.replace('<!--CROSSWALK-->', crosswalkSection(country));
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
