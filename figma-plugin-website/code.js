// ============================================================
// Panguard AI - Website Landing Page
// Figma Plugin (API 1.0.0 compatible)
// Single scrollable 1440px frame
// ============================================================

function hexToRgb(hex) {
  return { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 };
}
function solid(hex, op) {
  var p = { type: "SOLID", color: hexToRgb(hex) };
  if (op !== undefined) p.opacity = op;
  return [p];
}
function radGrad(hex, op) {
  var c = hexToRgb(hex);
  return [{ type: "GRADIENT_RADIAL", gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
    gradientStops: [{ position: 0, color: { r: c.r, g: c.g, b: c.b, a: op } }, { position: 1, color: { r: c.r, g: c.g, b: c.b, a: 0 } }] }];
}

async function loadFonts() {
  var f = [{ family: "Inter", style: "Regular" }, { family: "Inter", style: "Medium" }, { family: "Inter", style: "Semi Bold" }, { family: "Inter", style: "Bold" }];
  for (var i = 0; i < f.length; i++) await figma.loadFontAsync(f[i]);
}

function txt(s, cfg) {
  var t = figma.createText();
  t.fontName = { family: "Inter", style: cfg.weight || "Regular" };
  t.characters = s; t.fontSize = cfg.size || 16;
  if (cfg.lh) t.lineHeight = { value: cfg.size * cfg.lh, unit: "PIXELS" };
  if (cfg.ls !== undefined) t.letterSpacing = { value: cfg.ls * 100, unit: "PERCENT" };
  if (cfg.color) t.fills = solid(cfg.color);
  if (cfg.upper) t.textCase = "UPPER";
  if (cfg.align) t.textAlignHorizontal = cfg.align;
  return t;
}

function fr(cfg) {
  var f = figma.createFrame(); f.name = cfg.name || "Frame";
  f.layoutMode = cfg.dir || "HORIZONTAL";
  f.primaryAxisAlignItems = cfg.mainAlign || "MIN";
  f.counterAxisAlignItems = cfg.crossAlign || "MIN";
  f.itemSpacing = cfg.gap || 0;
  f.paddingTop = cfg.pt !== undefined ? cfg.pt : (cfg.py !== undefined ? cfg.py : (cfg.p || 0));
  f.paddingBottom = cfg.pb !== undefined ? cfg.pb : (cfg.py !== undefined ? cfg.py : (cfg.p || 0));
  f.paddingLeft = cfg.pl !== undefined ? cfg.pl : (cfg.px !== undefined ? cfg.px : (cfg.p || 0));
  f.paddingRight = cfg.pr !== undefined ? cfg.pr : (cfg.px !== undefined ? cfg.px : (cfg.p || 0));
  if (cfg.bg) f.fills = solid(cfg.bg); else if (cfg.fills) f.fills = cfg.fills; else f.fills = [];
  if (cfg.radius !== undefined) f.cornerRadius = cfg.radius;
  if (cfg.stroke) { f.strokes = solid(cfg.stroke, cfg.strokeOp); f.strokeWeight = cfg.strokeW || 1; }
  if (cfg.clip !== undefined) f.clipsContent = cfg.clip;
  if (cfg.w && cfg.h) { f.resize(cfg.w, cfg.h); f.primaryAxisSizingMode = cfg.hugMain ? "AUTO" : "FIXED"; f.counterAxisSizingMode = cfg.hugCross ? "AUTO" : "FIXED"; }
  else { f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO"; }
  return f;
}

function rect(w, h, hex, rad, op) {
  var r = figma.createRectangle(); r.resize(w, h); r.fills = solid(hex, op);
  if (rad !== undefined) r.cornerRadius = rad; return r;
}
function circ(s, hex, op) {
  var e = figma.createEllipse(); e.resize(s, s); e.fills = solid(hex, op); return e;
}

var C = { bg: "#1A1614", card: "#242120", border: "#2E2A28", borderH: "#3D3835",
  cream: "#F5F1E8", sage: "#8B9A8E", muted: "#999999", dim: "#666666",
  white: "#FFFFFF", danger: "#EF4444", safe: "#2ED573", caution: "#FBBF24", info: "#3B82F6" };
var W = 1440;
var PX = 120;
var CW = W - PX * 2; // content width 1200

function shieldLogo(size) {
  var wrap = fr({ name: "Shield", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: size, h: size });
  wrap.fills = solid(C.sage, 0.15); wrap.cornerRadius = size * 0.2;
  var inner = rect(size * 0.5, size * 0.55, C.sage, size * 0.1, 0.6); inner.name = "S";
  wrap.appendChild(inner); return wrap;
}

function btn(label, style, size) {
  var h = size === "Large" ? 48 : 40;
  var px = size === "Large" ? 32 : 24;
  var fs = size === "Large" ? 16 : 14;
  var b = fr({ name: "Button: " + label, dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", px: px, py: 0, radius: 8 });
  b.resize(b.width, h); b.counterAxisSizingMode = "FIXED"; b.primaryAxisSizingMode = "AUTO";
  if (style === "Primary") { b.fills = solid(C.sage); var t = txt(label, { weight: "Semi Bold", size: fs, lh: 1.2, color: C.bg }); b.appendChild(t); }
  else { b.fills = []; b.strokes = solid(C.sage); b.strokeWeight = 1; var t2 = txt(label, { weight: "Semi Bold", size: fs, lh: 1.2, color: C.sage }); b.appendChild(t2); }
  return b;
}

// ============================================================
// HERO
// ============================================================
function buildHero() {
  var sec = fr({ name: "Hero", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN", w: W, h: 700, bg: C.bg, clip: true });

  // Nav
  var nav = fr({ name: "Nav", dir: "HORIZONTAL", mainAlign: "SPACE_BETWEEN", crossAlign: "CENTER", px: PX, w: W, h: 72 });
  nav.fills = [];

  var logoRow = fr({ name: "Logo", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 8 });
  logoRow.appendChild(shieldLogo(28));
  logoRow.appendChild(txt("PANGUARD AI", { weight: "Semi Bold", size: 16, lh: 1.2, color: C.cream }));
  nav.appendChild(logoRow);

  var navLinks = fr({ name: "Links", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 36 });
  var links = ["Product", "Pricing", "Docs", "Blog"];
  for (var i = 0; i < links.length; i++) { navLinks.appendChild(txt(links[i], { weight: "Medium", size: 16, lh: 1.6, color: C.muted })); }
  nav.appendChild(navLinks);

  var signIn = txt("Sign In", { weight: "Medium", size: 16, lh: 1.6, color: C.sage });
  nav.appendChild(signIn);
  sec.appendChild(nav);

  // Hero content row
  var heroBody = fr({ name: "Hero Body", dir: "HORIZONTAL", mainAlign: "SPACE_BETWEEN", crossAlign: "CENTER", px: PX, w: W, h: 628 });
  heroBody.fills = [];

  // Left content
  var left = fr({ name: "Hero Left", dir: "VERTICAL", mainAlign: "CENTER", crossAlign: "MIN", gap: 20, w: 600, h: 500 });
  left.fills = [];

  left.appendChild(txt("Your AI\nSecurity Guard", { weight: "Bold", size: 48, lh: 1.15, ls: -0.02, color: C.cream }));
  left.appendChild(txt("One command to install. AI protects everything.\nIt tells you when something's wrong.", { weight: "Regular", size: 16, lh: 1.6, color: C.muted }));
  left.appendChild(txt("Built for SMBs and developers who don't have time\nto become security experts.", { weight: "Regular", size: 14, lh: 1.5, color: C.dim }));

  var btnRow = fr({ name: "Buttons", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 16 });
  btnRow.appendChild(btn("Start Free Trial", "Primary", "Medium"));
  btnRow.appendChild(btn("View Demo", "Secondary", "Medium"));
  left.appendChild(btnRow);

  left.appendChild(txt("No credit card    5-min setup    24/7 AI monitoring", { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: C.dim }));
  heroBody.appendChild(left);

  // Right: defense network illustration
  var right = fr({ name: "Defense Network", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: 480, h: 400, clip: true });
  right.fills = [];

  var nodes = [
    { x: 240, y: 200, size: 48, op: 1 },
    { x: 100, y: 80, size: 32, op: 0.7 },
    { x: 380, y: 80, size: 32, op: 0.7 },
    { x: 80, y: 320, size: 28, op: 0.5 },
    { x: 400, y: 320, size: 28, op: 0.5 },
  ];
  // Connection lines
  var ctr = nodes[0];
  for (var ni = 1; ni < nodes.length; ni++) {
    var n = nodes[ni];
    var ln = figma.createLine();
    var dx = n.x - ctr.x; var dy = n.y - ctr.y;
    ln.resize(Math.sqrt(dx * dx + dy * dy), 0);
    ln.rotation = -Math.atan2(dy, dx) * 180 / Math.PI;
    ln.x = ctr.x; ln.y = ctr.y;
    ln.strokes = solid(C.sage, 0.2); ln.strokeWeight = 1; ln.name = "Link";
    right.appendChild(ln);
  }
  // Peer links
  var peers = [[1, 2], [3, 4], [1, 3], [2, 4]];
  for (var pi = 0; pi < peers.length; pi++) {
    var a = nodes[peers[pi][0]]; var b = nodes[peers[pi][1]];
    var pdx = b.x - a.x; var pdy = b.y - a.y;
    var pl = figma.createLine();
    pl.resize(Math.sqrt(pdx * pdx + pdy * pdy), 0);
    pl.rotation = -Math.atan2(pdy, pdx) * 180 / Math.PI;
    pl.x = a.x; pl.y = a.y;
    pl.strokes = solid(C.sage, 0.1); pl.strokeWeight = 1; pl.name = "Peer";
    right.appendChild(pl);
  }
  for (var ni2 = 0; ni2 < nodes.length; ni2++) {
    var nd = nodes[ni2];
    var sh = shieldLogo(nd.size);
    sh.x = nd.x - nd.size / 2; sh.y = nd.y - nd.size / 2;
    sh.opacity = nd.op;
    right.appendChild(sh);
  }
  heroBody.appendChild(right);
  sec.appendChild(heroBody);
  return sec;
}

// ============================================================
// HOW IT WORKS
// ============================================================
function buildHowItWorks() {
  var sec = fr({ name: "How It Works", dir: "VERTICAL", mainAlign: "CENTER", crossAlign: "CENTER", px: PX, py: 80, gap: 60, w: W, h: 400, bg: C.card });

  sec.appendChild(txt("How PANGUARD Works", { weight: "Semi Bold", size: 36, lh: 1.2, ls: -0.01, color: C.cream, align: "CENTER" }));

  var cols = fr({ name: "Steps", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "MIN", gap: 60, w: CW, h: 180 });
  cols.fills = [];

  var steps = [
    { icon: ">_", title: "Install", desc: "One line of code.\ncurl -fsSL get.panguard.ai | sh" },
    { icon: "S", title: "Monitor", desc: "AI watches your endpoints\n24/7 in real-time." },
    { icon: "B", title: "Alert", desc: "Instant notifications via\nLINE, Telegram, or Slack." },
  ];

  var colW = Math.floor((CW - 120) / 3);
  for (var i = 0; i < steps.length; i++) {
    var s = steps[i];
    var col = fr({ name: "Step " + (i + 1), dir: "VERTICAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 16, w: colW, h: 180 });
    col.fills = [];

    var icon = fr({ name: "Icon", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: 56, h: 56 });
    icon.fills = solid(C.sage, 0.1); icon.cornerRadius = 16;
    icon.appendChild(txt(s.icon, { weight: "Semi Bold", size: 20, lh: 1, color: C.sage }));
    col.appendChild(icon);

    col.appendChild(txt(s.title, { weight: "Medium", size: 20, lh: 1.4, color: C.cream, align: "CENTER" }));
    col.appendChild(txt(s.desc, { weight: "Regular", size: 14, lh: 1.5, color: C.muted, align: "CENTER" }));
    cols.appendChild(col);
  }
  sec.appendChild(cols);
  return sec;
}

// ============================================================
// SOCIAL PROOF
// ============================================================
function buildSocialProof() {
  var sec = fr({ name: "Social Proof", dir: "VERTICAL", mainAlign: "CENTER", crossAlign: "CENTER", px: PX, py: 80, gap: 48, w: W, h: 500, bg: C.bg });

  sec.appendChild(txt("Trusted by Industry Leaders", { weight: "Semi Bold", size: 36, lh: 1.2, ls: -0.01, color: C.cream, align: "CENTER" }));

  // Big numbers
  var nums = fr({ name: "Stats", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "MIN", gap: 80, w: CW, h: 100 });
  nums.fills = [];
  var stats = [
    { value: "10,000+", label: "Endpoints Protected" },
    { value: "99.9%", label: "Uptime Guarantee" },
    { value: "1M+", label: "Threats Blocked" },
  ];
  for (var i = 0; i < stats.length; i++) {
    var st = fr({ name: "Stat", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 8 });
    st.fills = [];
    st.appendChild(txt(stats[i].value, { weight: "Bold", size: 48, lh: 1.15, ls: -0.02, color: C.cream }));
    st.appendChild(txt(stats[i].label, { weight: "Medium", size: 14, lh: 1.5, color: C.muted }));
    nums.appendChild(st);
  }
  sec.appendChild(nums);

  // Client logos row
  var logos = fr({ name: "Client Logos", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 48, w: CW, h: 40 });
  logos.fills = [];
  for (var j = 0; j < 5; j++) {
    var logo = rect(100, 32, C.dim, 6, 0.2);
    logo.name = "Client " + (j + 1);
    logos.appendChild(logo);
  }
  sec.appendChild(logos);

  // Testimonial
  var testCard = fr({ name: "Testimonial", dir: "VERTICAL", mainAlign: "CENTER", crossAlign: "CENTER", p: 40, gap: 20, w: 800, h: 160, bg: C.card, radius: 16, stroke: C.border, strokeW: 1 });
  testCard.appendChild(txt("\"Panguard AI reduced our security incidents by 80% in the first month.\nIt's like having a full security team for the price of a SaaS tool.\"", { weight: "Regular", size: 16, lh: 1.6, color: C.cream, align: "CENTER" }));
  testCard.appendChild(txt("Chen Wei-Lin, CTO at TechFlow Systems", { weight: "Medium", size: 14, lh: 1.5, color: C.muted, align: "CENTER" }));
  sec.appendChild(testCard);

  return sec;
}

// ============================================================
// PRICING
// ============================================================
function buildPricing() {
  var sec = fr({ name: "Pricing", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "CENTER", px: PX, py: 80, gap: 40, w: W, h: 700, bg: C.card });

  sec.appendChild(txt("Choose Your Plan", { weight: "Semi Bold", size: 36, lh: 1.2, ls: -0.01, color: C.cream, align: "CENTER" }));
  sec.appendChild(txt("30-day free trial on all plans", { weight: "Regular", size: 16, lh: 1.6, color: C.muted, align: "CENTER" }));

  var cards = fr({ name: "Plans", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "MIN", gap: 24, w: CW, h: 480 });
  cards.fills = [];

  var plans = [
    {
      name: "Starter", price: "$19", period: "/month",
      features: ["Up to 3 endpoints", "Layer 1 + Layer 3 AI detection", "LINE / Telegram / Email alerts", "Community support"],
      btnStyle: "Secondary", popular: false,
    },
    {
      name: "Pro", price: "$49", period: "/month",
      features: ["Up to 25 endpoints", "Full 3-Layer AI detection", "Slack / Email / Webhook alerts", "Priority support", "Weekly AI reports"],
      btnStyle: "Primary", popular: true,
    },
    {
      name: "Business", price: "$99", period: "/month",
      features: ["Unlimited endpoints", "Custom AI models", "SIEM integration", "Dedicated support", "SLA 99.9%", "Compliance (ISO 27001)"],
      btnStyle: "Secondary", popular: false,
    },
  ];

  var cardW = Math.floor((CW - 48) / 3);
  for (var i = 0; i < plans.length; i++) {
    var pl = plans[i];
    var card = fr({
      name: "Plan: " + pl.name, dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
      p: 32, gap: 20, w: cardW, h: 480, bg: C.bg, radius: 16,
      stroke: pl.popular ? C.sage : C.border, strokeW: pl.popular ? 2 : 1,
    });

    // Popular badge
    if (pl.popular) {
      var badge = fr({ name: "Badge", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", px: 12, py: 4 });
      badge.fills = solid(C.sage, 0.15); badge.cornerRadius = 9999;
      badge.appendChild(txt("MOST POPULAR", { weight: "Medium", size: 11, lh: 1.4, ls: 0.08, color: C.sage, upper: true }));
      card.appendChild(badge);
    }

    // Plan name
    card.appendChild(txt(pl.name, { weight: "Semi Bold", size: 24, lh: 1.3, color: C.cream }));

    // Price row
    var priceRow = fr({ name: "Price", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "MAX", gap: 4 });
    priceRow.fills = [];
    priceRow.appendChild(txt(pl.price, { weight: "Bold", size: 48, lh: 1.15, ls: -0.02, color: C.cream }));
    priceRow.appendChild(txt(pl.period, { weight: "Regular", size: 16, lh: 1.6, color: C.muted }));
    card.appendChild(priceRow);

    // Divider
    var div = rect(cardW - 64, 1, C.border);
    card.appendChild(div);

    // Features
    var featureList = fr({ name: "Features", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN", gap: 12 });
    featureList.fills = [];
    for (var fi = 0; fi < pl.features.length; fi++) {
      var fRow = fr({ name: "Feature", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 10 });
      fRow.fills = [];
      var check = fr({ name: "Check", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: 16, h: 16 });
      check.fills = solid(C.sage, 0.15); check.cornerRadius = 8;
      var ck = txt("c", { weight: "Medium", size: 9, lh: 1, color: C.sage });
      check.appendChild(ck);
      fRow.appendChild(check);
      fRow.appendChild(txt(pl.features[fi], { weight: "Regular", size: 14, lh: 1.5, color: C.muted }));
      featureList.appendChild(fRow);
    }
    card.appendChild(featureList);

    // Spacer
    var spacer = fr({ name: "Spacer", dir: "VERTICAL", w: 10, h: 480 - 32 * 2 - 20 * 6 - 24 - 60 - 1 - pl.features.length * 32 - (pl.popular ? 28 : 0) });
    spacer.fills = []; spacer.primaryAxisSizingMode = "FIXED"; spacer.counterAxisSizingMode = "AUTO";
    card.appendChild(spacer);

    // Button
    var btnLabel = pl.name === "Business" ? "Contact Sales" : "Start Free Trial";
    var b = btn(btnLabel, pl.btnStyle, "Medium");
    card.appendChild(b);

    cards.appendChild(card);
  }
  sec.appendChild(cards);
  return sec;
}

// ============================================================
// CTA
// ============================================================
function buildCTA() {
  var sec = fr({ name: "CTA", dir: "VERTICAL", mainAlign: "CENTER", crossAlign: "CENTER", py: 80, gap: 24, w: W, h: 400, bg: C.bg, clip: true });

  // Glow
  var glow = figma.createEllipse();
  glow.resize(300, 300); glow.fills = radGrad(C.sage, 0.06);
  glow.x = (W - 300) / 2; glow.y = 10; glow.name = "Glow";
  sec.appendChild(glow);

  var logo = shieldLogo(80);
  logo.x = (W - 80) / 2; logo.y = 60;
  sec.appendChild(logo);

  sec.appendChild(txt("Start Protecting Today", { weight: "Semi Bold", size: 36, lh: 1.2, ls: -0.01, color: C.cream, align: "CENTER" }));
  sec.appendChild(txt("No credit card required. 30-day free trial.", { weight: "Regular", size: 16, lh: 1.6, color: C.muted, align: "CENTER" }));

  var btnRow = fr({ name: "Buttons", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 16 });
  btnRow.appendChild(btn("Start Free Trial", "Primary", "Large"));
  btnRow.appendChild(btn("Schedule Demo", "Secondary", "Large"));
  sec.appendChild(btnRow);

  // Trust badges
  var badges = fr({ name: "Trust Badges", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 24, w: W, h: 32 });
  badges.fills = [];
  var badgeLabels = ["ISO 27001", "SOC 2", "GDPR", "Encrypted"];
  for (var i = 0; i < badgeLabels.length; i++) {
    var b = fr({ name: badgeLabels[i], dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", px: 12, py: 6, radius: 6 });
    b.fills = solid(C.border); b.appendChild(txt(badgeLabels[i], { weight: "Medium", size: 11, lh: 1.4, ls: 0.02, color: C.dim }));
    badges.appendChild(b);
  }
  sec.appendChild(badges);

  return sec;
}

// ============================================================
// FOOTER
// ============================================================
function buildFooter() {
  var sec = fr({ name: "Footer", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN", px: PX, py: 48, gap: 48, w: W, h: 280, bg: C.card });

  // Top row
  var topRow = fr({ name: "Footer Top", dir: "HORIZONTAL", mainAlign: "SPACE_BETWEEN", crossAlign: "MIN", w: CW, h: 160 });
  topRow.fills = [];

  // Brand
  var brand = fr({ name: "Brand", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN", gap: 12 });
  brand.fills = [];
  var logoRow = fr({ name: "Logo", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 8 });
  logoRow.appendChild(shieldLogo(24));
  logoRow.appendChild(txt("PANGUARD AI", { weight: "Semi Bold", size: 14, lh: 1.2, color: C.cream }));
  brand.appendChild(logoRow);
  brand.appendChild(txt("AI-driven endpoint protection\nfor businesses of all sizes.", { weight: "Regular", size: 14, lh: 1.5, color: C.muted }));
  topRow.appendChild(brand);

  // Link columns
  var colData = [
    { title: "Product", items: ["Scan", "Guard", "Chat", "Trap", "Report"] },
    { title: "Resources", items: ["Docs", "API", "Blog", "Status"] },
    { title: "Company", items: ["About", "Careers", "Contact", "Press"] },
  ];
  for (var ci = 0; ci < colData.length; ci++) {
    var cd = colData[ci];
    var col = fr({ name: cd.title, dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN", gap: 12 });
    col.fills = [];
    col.appendChild(txt(cd.title, { weight: "Semi Bold", size: 14, lh: 1.5, color: C.cream, upper: true }));
    for (var li = 0; li < cd.items.length; li++) {
      col.appendChild(txt(cd.items[li], { weight: "Regular", size: 14, lh: 1.5, color: C.muted }));
    }
    topRow.appendChild(col);
  }
  sec.appendChild(topRow);

  // Divider
  sec.appendChild(rect(CW, 1, C.border));

  // Bottom
  var bottom = fr({ name: "Footer Bottom", dir: "HORIZONTAL", mainAlign: "SPACE_BETWEEN", crossAlign: "CENTER", w: CW, h: 24 });
  bottom.fills = [];
  bottom.appendChild(txt("2026 Panguard AI. All rights reserved.", { weight: "Regular", size: 12, lh: 1.4, color: C.dim }));
  var legal = fr({ name: "Legal", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 24 });
  legal.fills = [];
  legal.appendChild(txt("Privacy", { weight: "Regular", size: 12, lh: 1.4, color: C.dim }));
  legal.appendChild(txt("Terms", { weight: "Regular", size: 12, lh: 1.4, color: C.dim }));
  bottom.appendChild(legal);
  sec.appendChild(bottom);

  return sec;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  await loadFonts();

  var page = figma.root.children.find(function (p) { return p.name === "Website"; });
  if (!page) { page = figma.createPage(); page.name = "Website"; }
  figma.currentPage = page;
  page.children.forEach(function (c) { return c.remove(); });

  // Build sections
  var sections = [buildHero(), buildHowItWorks(), buildSocialProof(), buildPricing(), buildCTA(), buildFooter()];

  // Calculate total height
  var totalH = 0;
  for (var i = 0; i < sections.length; i++) totalH += sections[i].height;

  // Main scrollable frame
  var main = fr({ name: "Website - 1440px", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN", w: W, h: totalH, bg: C.bg, clip: true });
  main.primaryAxisSizingMode = "AUTO";

  for (var j = 0; j < sections.length; j++) main.appendChild(sections[j]);

  page.appendChild(main);
  figma.viewport.scrollAndZoomIntoView([main]);
  figma.closePlugin("Website page created: 6 sections, " + totalH + "px tall.");
}

main();
