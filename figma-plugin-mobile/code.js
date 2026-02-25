// ============================================================
// Panguard AI - Mobile App Screens
// Figma Plugin (API 1.0.0 compatible)
// 4 iPhone 15 frames (390x844)
// ============================================================

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

function solid(hex, opacity) {
  var p = { type: "SOLID", color: hexToRgb(hex) };
  if (opacity !== undefined) p.opacity = opacity;
  return [p];
}

function radialGrad(hex, centerOpacity) {
  var c = hexToRgb(hex);
  return [{
    type: "GRADIENT_RADIAL",
    gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
    gradientStops: [
      { position: 0, color: { r: c.r, g: c.g, b: c.b, a: centerOpacity } },
      { position: 1, color: { r: c.r, g: c.g, b: c.b, a: 0 } },
    ],
  }];
}

async function loadFonts() {
  var fonts = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Semi Bold" },
    { family: "Inter", style: "Bold" },
  ];
  for (var i = 0; i < fonts.length; i++) await figma.loadFontAsync(fonts[i]);
}

function txt(content, cfg) {
  var t = figma.createText();
  t.fontName = { family: "Inter", style: cfg.weight || "Regular" };
  t.characters = content;
  t.fontSize = cfg.size || 16;
  if (cfg.lh) t.lineHeight = { value: cfg.size * cfg.lh, unit: "PIXELS" };
  if (cfg.ls !== undefined) t.letterSpacing = { value: cfg.ls * 100, unit: "PERCENT" };
  if (cfg.color) t.fills = solid(cfg.color);
  if (cfg.upper) t.textCase = "UPPER";
  if (cfg.align) t.textAlignHorizontal = cfg.align;
  return t;
}

function fr(cfg) {
  var f = figma.createFrame();
  f.name = cfg.name || "Frame";
  f.layoutMode = cfg.dir || "HORIZONTAL";
  f.primaryAxisAlignItems = cfg.mainAlign || "MIN";
  f.counterAxisAlignItems = cfg.crossAlign || "MIN";
  f.itemSpacing = cfg.gap || 0;
  f.paddingTop = cfg.pt !== undefined ? cfg.pt : (cfg.py !== undefined ? cfg.py : (cfg.p || 0));
  f.paddingBottom = cfg.pb !== undefined ? cfg.pb : (cfg.py !== undefined ? cfg.py : (cfg.p || 0));
  f.paddingLeft = cfg.pl !== undefined ? cfg.pl : (cfg.px !== undefined ? cfg.px : (cfg.p || 0));
  f.paddingRight = cfg.pr !== undefined ? cfg.pr : (cfg.px !== undefined ? cfg.px : (cfg.p || 0));
  if (cfg.bg) f.fills = solid(cfg.bg);
  else if (cfg.fills) f.fills = cfg.fills;
  else f.fills = [];
  if (cfg.radius !== undefined) f.cornerRadius = cfg.radius;
  if (cfg.stroke) { f.strokes = solid(cfg.stroke); f.strokeWeight = cfg.strokeW || 1; }
  if (cfg.clip !== undefined) f.clipsContent = cfg.clip;
  if (cfg.w && cfg.h) {
    f.resize(cfg.w, cfg.h);
    f.primaryAxisSizingMode = cfg.hugMain ? "AUTO" : "FIXED";
    f.counterAxisSizingMode = cfg.hugCross ? "AUTO" : "FIXED";
  } else {
    f.primaryAxisSizingMode = "AUTO";
    f.counterAxisSizingMode = "AUTO";
  }
  return f;
}

function rect(w, h, hex, radius, opacity) {
  var r = figma.createRectangle();
  r.resize(w, h);
  r.fills = solid(hex, opacity);
  if (radius !== undefined) r.cornerRadius = radius;
  return r;
}

function circle(size, hex, opacity) {
  var e = figma.createEllipse();
  e.resize(size, size);
  e.fills = solid(hex, opacity);
  return e;
}

var C = {
  bg: "#1A1614", card: "#242120", border: "#2E2A28",
  cream: "#F5F1E8", sage: "#8B9A8E", muted: "#999999",
  dim: "#666666", white: "#FFFFFF", danger: "#EF4444",
  safe: "#2ED573", caution: "#FBBF24", alert: "#FF6B35",
  info: "#3B82F6", dotInactive: "#3D3835",
};

var W = 390;
var H = 844;
var PX = 24;

// Reusable: shield logo placeholder
function shieldLogo(size) {
  var wrap = fr({ name: "Shield Logo", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: size, h: size });
  wrap.fills = solid(C.sage, 0.15);
  wrap.cornerRadius = size * 0.2;
  var inner = rect(size * 0.5, size * 0.55, C.sage, size * 0.1, 0.6);
  inner.name = "Shield";
  wrap.appendChild(inner);
  return wrap;
}

// Reusable: top bar with brand
function topBarBrand(leftText, showBell) {
  var bar = fr({
    name: "Top Bar", dir: "HORIZONTAL", mainAlign: "SPACE_BETWEEN", crossAlign: "CENTER",
    px: PX, w: W, h: 56,
  });
  bar.fills = [];

  var left = fr({ name: "Brand", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 6 });
  var parts = leftText.split("[icon]");
  if (parts.length === 2) {
    var t1 = txt(parts[0].trim(), { weight: "Semi Bold", size: 14, lh: 1.2, color: C.sage });
    left.appendChild(t1);
    var miniShield = shieldLogo(20);
    left.appendChild(miniShield);
    var t2 = txt(parts[1].trim(), { weight: "Semi Bold", size: 14, lh: 1.2, color: C.sage });
    left.appendChild(t2);
  } else {
    var t0 = txt(leftText, { weight: "Semi Bold", size: 14, lh: 1.2, color: C.sage });
    left.appendChild(t0);
  }
  bar.appendChild(left);

  if (showBell) {
    var bell = fr({ name: "Bell", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: 24, h: 24 });
    bell.fills = solid(C.sage, 0.15);
    bell.cornerRadius = 6;
    var bellT = txt("B", { weight: "Medium", size: 11, lh: 1, color: C.sage });
    bell.appendChild(bellT);
    bar.appendChild(bell);
  }

  return bar;
}

// Reusable: back arrow + title
function topBarBack(title) {
  var bar = fr({
    name: "Top Bar", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER",
    px: PX, gap: 16, w: W, h: 56,
  });
  bar.fills = [];

  var arrow = txt("<", { weight: "Medium", size: 24, lh: 1, color: C.cream });
  bar.appendChild(arrow);
  var titleT = txt(title, { weight: "Semi Bold", size: 24, lh: 1.3, color: C.cream });
  bar.appendChild(titleT);
  return bar;
}

// Reusable: icon placeholder for menu items
function iconBox(label, color, size) {
  var box = fr({ name: "Icon", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: size || 24, h: size || 24 });
  box.fills = solid(color || C.dim, 0.15);
  box.cornerRadius = 6;
  var t = txt(label, { weight: "Medium", size: 10, lh: 1, color: color || C.dim });
  box.appendChild(t);
  return box;
}

// ============================================================
// SCREEN 1: HOME
// ============================================================
function buildHome() {
  var screen = fr({
    name: "Home", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "CENTER",
    w: W, h: H, bg: C.bg, clip: true,
  });

  // Top bar
  var topBar = topBarBrand("PANGUARD [icon] AI", true);
  screen.appendChild(topBar);

  // Spacer
  var spacer1 = fr({ name: "Spacer", w: W, h: 80 }); spacer1.fills = [];
  screen.appendChild(spacer1);

  // Glow effect behind logo
  var glowWrap = fr({ name: "Logo Area", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: W, h: 200 });
  glowWrap.fills = [];

  // Glow circle
  var glow = figma.createEllipse();
  glow.resize(240, 240);
  glow.fills = radialGrad(C.sage, 0.05);
  glow.x = (W - 240) / 2;
  glow.y = -20;
  glow.name = "Glow";
  glowWrap.appendChild(glow);

  // Logo on top
  var logo = shieldLogo(120);
  logo.x = (W - 120) / 2;
  logo.y = 40;
  glowWrap.appendChild(logo);

  screen.appendChild(glowWrap);

  // Status row
  var statusRow = fr({ name: "Status", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 10, w: W, h: 40 });
  statusRow.fills = [];
  var dot = circle(8, C.safe);
  dot.name = "Status Dot";
  statusRow.appendChild(dot);
  var statusText = txt("All Systems Secure", { weight: "Semi Bold", size: 24, lh: 1.3, color: C.cream });
  statusRow.appendChild(statusText);
  screen.appendChild(statusRow);

  // Last scan
  var scanRow = fr({ name: "Last Scan", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: W, h: 24 });
  scanRow.fills = [];
  var scanT = txt("Last scan: 1m ago", { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: C.muted });
  scanRow.appendChild(scanT);
  screen.appendChild(scanRow);

  // Spacer
  var spacer2 = fr({ name: "Spacer", w: W, h: 60 }); spacer2.fills = [];
  screen.appendChild(spacer2);

  // KPI row
  var kpiRow = fr({
    name: "KPIs", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "MIN",
    gap: 12, px: PX, w: W, h: 120,
  });
  kpiRow.fills = [];

  var kpis = [
    { icon: "S", label: "Threats Blocked", value: "2,847" },
    { icon: "N", label: "Endpoints", value: "24" },
    { icon: "C", label: "Uptime", value: "99.9%" },
  ];

  var kpiW = Math.floor((W - PX * 2 - 24) / 3);
  for (var i = 0; i < kpis.length; i++) {
    var k = kpis[i];
    var kpiCard = fr({
      name: "KPI: " + k.label, dir: "VERTICAL", mainAlign: "CENTER", crossAlign: "CENTER",
      gap: 8, py: 16, w: kpiW, h: 110, bg: C.card, radius: 12, stroke: C.border, strokeW: 1,
    });

    var kIcon = iconBox(k.icon, C.sage, 28);
    kpiCard.appendChild(kIcon);

    var kVal = txt(k.value, { weight: "Medium", size: 20, lh: 1.4, color: C.cream });
    kpiCard.appendChild(kVal);

    var kLabel = txt(k.label, { weight: "Medium", size: 11, lh: 1.4, ls: 0.02, color: C.muted });
    kpiCard.appendChild(kLabel);

    kpiRow.appendChild(kpiCard);
  }
  screen.appendChild(kpiRow);

  return screen;
}

// ============================================================
// SCREEN 2: RECENT THREATS
// ============================================================
function buildThreats() {
  var screen = fr({
    name: "Recent Threats", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    w: W, h: H, bg: C.bg, clip: true,
  });

  // Top bar
  var topBar = topBarBack("Recent Threats");
  screen.appendChild(topBar);

  // Spacer
  var sp = fr({ name: "Spacer", w: W, h: 16 }); sp.fills = [];
  screen.appendChild(sp);

  // Threat list
  var threats = [
    { name: "Port scan blocked", status: "Safe", color: C.safe, time: "2m" },
    { name: "Login attempt", status: "Caution", color: C.caution, time: "15m" },
    { name: "Update complete", status: "Safe", color: C.safe, time: "1h" },
    { name: "Attack blocked", status: "Critical", color: C.danger, time: "2h" },
  ];

  var listWrap = fr({
    name: "Threat List", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "CENTER",
    gap: 12, px: PX, w: W, h: H - 72,
  });
  listWrap.fills = [];
  listWrap.primaryAxisSizingMode = "AUTO";

  for (var i = 0; i < threats.length; i++) {
    var th = threats[i];
    var cardW = W - PX * 2;

    var card = fr({
      name: "Threat: " + th.name, dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER",
      gap: 12, p: 16, w: cardW, h: 80, bg: C.card, radius: 12, stroke: C.border, strokeW: 1,
    });

    // Icon
    var thIcon = iconBox("!", C.dim, 24);
    card.appendChild(thIcon);

    // Center: name + badge
    var centerCol = fr({ name: "Info", dir: "VERTICAL", mainAlign: "CENTER", crossAlign: "MIN", gap: 6 });
    centerCol.fills = [];
    centerCol.layoutGrow = 1;

    var nameT = txt(th.name, { weight: "Regular", size: 16, lh: 1.6, color: C.cream });
    centerCol.appendChild(nameT);

    // Badge
    var badge = fr({
      name: "Badge", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", px: 10, py: 3,
    });
    badge.fills = solid(th.color, 0.1);
    badge.cornerRadius = 9999;
    badge.strokes = solid(th.color, 0.2);
    badge.strokeWeight = 1;
    var badgeT = txt(th.status, { weight: "Medium", size: 11, lh: 1.4, ls: 0.02, color: th.color });
    badge.appendChild(badgeT);
    centerCol.appendChild(badge);

    card.appendChild(centerCol);

    // Time
    var timeT = txt(th.time, { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: C.muted });
    card.appendChild(timeT);

    listWrap.appendChild(card);
  }

  screen.appendChild(listWrap);
  return screen;
}

// ============================================================
// SCREEN 3: ONBOARDING WELCOME
// ============================================================
function buildOnboarding() {
  var screen = fr({
    name: "Onboarding", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "CENTER",
    w: W, h: H, bg: C.bg, clip: true,
  });

  // Top brand centered
  var topRow = fr({ name: "Top Brand", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: W, h: 56 });
  topRow.fills = [];
  var brandRow = fr({ name: "Brand", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 6 });
  var b1 = txt("PANGUARD", { weight: "Semi Bold", size: 14, lh: 1.2, color: C.sage });
  brandRow.appendChild(b1);
  var bShield = shieldLogo(20);
  brandRow.appendChild(bShield);
  var b2 = txt("AI", { weight: "Semi Bold", size: 14, lh: 1.2, color: C.sage });
  brandRow.appendChild(b2);
  topRow.appendChild(brandRow);
  screen.appendChild(topRow);

  // Spacer
  var sp1 = fr({ name: "Spacer", w: W, h: 140 }); sp1.fills = [];
  screen.appendChild(sp1);

  // Glow + Logo
  var glowWrap = fr({ name: "Logo Area", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: W, h: 200 });
  glowWrap.fills = [];

  // Breathing glow (two concentric radial circles)
  var glow1 = figma.createEllipse();
  glow1.resize(280, 280);
  glow1.fills = radialGrad(C.sage, 0.06);
  glow1.x = (W - 280) / 2;
  glow1.y = -40;
  glow1.name = "Glow Outer";
  glowWrap.appendChild(glow1);

  var glow2 = figma.createEllipse();
  glow2.resize(180, 180);
  glow2.fills = radialGrad(C.sage, 0.08);
  glow2.x = (W - 180) / 2;
  glow2.y = 10;
  glow2.name = "Glow Inner";
  glowWrap.appendChild(glow2);

  var logo = shieldLogo(120);
  logo.x = (W - 120) / 2;
  logo.y = 40;
  glowWrap.appendChild(logo);

  screen.appendChild(glowWrap);

  // Spacer
  var sp2 = fr({ name: "Spacer", w: W, h: 40 }); sp2.fills = [];
  screen.appendChild(sp2);

  // Welcome text
  var welcomeWrap = fr({ name: "Welcome Text", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 12, w: W, h: 80 });
  welcomeWrap.fills = [];

  var welcomeTitle = txt("Welcome to PANGUARD AI", { weight: "Semi Bold", size: 36, lh: 1.2, ls: -0.01, color: C.cream, align: "CENTER" });
  welcomeWrap.appendChild(welcomeTitle);

  var welcomeDesc = txt("Your AI-powered security guardian.", { weight: "Regular", size: 16, lh: 1.6, color: C.muted, align: "CENTER" });
  welcomeWrap.appendChild(welcomeDesc);

  screen.appendChild(welcomeWrap);

  // Spacer to push dots to bottom area
  var sp3 = fr({ name: "Spacer", w: W, h: 160 }); sp3.fills = [];
  screen.appendChild(sp3);

  // Page dots
  var dotsRow = fr({ name: "Page Dots", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 8, w: W, h: 20 });
  dotsRow.fills = [];

  for (var d = 0; d < 4; d++) {
    var dotColor = d === 0 ? C.sage : C.dotInactive;
    var dotSize = d === 0 ? 10 : 8;
    var dot = circle(dotSize, dotColor);
    dot.name = "Dot " + (d + 1);
    dotsRow.appendChild(dot);
  }

  screen.appendChild(dotsRow);

  return screen;
}

// ============================================================
// SCREEN 4: SETTINGS
// ============================================================
function buildSettings() {
  var screen = fr({
    name: "Settings", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    w: W, h: H, bg: C.bg, clip: true,
  });

  // Top bar
  var topBar = topBarBack("Settings");
  screen.appendChild(topBar);

  // Spacer
  var sp = fr({ name: "Spacer", w: W, h: 16 }); sp.fills = [];
  screen.appendChild(sp);

  // Menu list
  var menuItems = [
    { icon: "B", label: "Notifications" },
    { icon: "S", label: "Security Level" },
    { icon: "M", label: "Endpoints" },
    { icon: "U", label: "Account" },
    { icon: "?", label: "Help & Support" },
  ];

  var listWrap = fr({
    name: "Menu List", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    px: PX, w: W, h: menuItems.length * 56,
  });
  listWrap.fills = [];
  listWrap.primaryAxisSizingMode = "AUTO";

  for (var i = 0; i < menuItems.length; i++) {
    var mi = menuItems[i];
    var rowW = W - PX * 2;

    var row = fr({
      name: "Menu: " + mi.label, dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER",
      gap: 16, w: rowW, h: 56, stroke: C.border, strokeW: 1,
    });
    row.fills = [];

    // Icon
    var mIcon = iconBox(mi.icon, C.sage, 24);
    row.appendChild(mIcon);

    // Label
    var mLabel = txt(mi.label, { weight: "Regular", size: 16, lh: 1.6, color: C.cream });
    mLabel.layoutGrow = 1;
    row.appendChild(mLabel);

    // Chevron
    var chevron = txt(">", { weight: "Regular", size: 16, lh: 1, color: C.dim });
    row.appendChild(chevron);

    listWrap.appendChild(row);
  }

  screen.appendChild(listWrap);

  // Spacer to push logout down
  var sp2 = fr({ name: "Spacer", w: W, h: H - 56 - 16 - (menuItems.length * 56) - 80 });
  sp2.fills = [];
  screen.appendChild(sp2);

  // Logout button
  var logoutRow = fr({ name: "Logout", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: W, h: 48 });
  logoutRow.fills = [];

  var logoutBtn = fr({
    name: "Logout Button", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER",
    px: 32, py: 12, radius: 8,
  });
  logoutBtn.fills = [];
  var logoutT = txt("Logout", { weight: "Semi Bold", size: 16, lh: 1.2, color: C.danger });
  logoutBtn.appendChild(logoutT);
  logoutRow.appendChild(logoutBtn);

  screen.appendChild(logoutRow);

  return screen;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  await loadFonts();

  var page = figma.root.children.find(function (p) { return p.name === "Mobile App"; });
  if (!page) {
    page = figma.createPage();
    page.name = "Mobile App";
  }
  figma.currentPage = page;
  page.children.forEach(function (c) { return c.remove(); });

  var GAP = 80;
  var screens = [buildHome(), buildThreats(), buildOnboarding(), buildSettings()];
  var names = ["1. Home", "2. Recent Threats", "3. Onboarding", "4. Settings"];

  for (var i = 0; i < screens.length; i++) {
    var s = screens[i];
    s.name = names[i];
    s.x = i * (W + GAP);
    s.y = 0;
    page.appendChild(s);
  }

  figma.viewport.scrollAndZoomIntoView(page.children);
  figma.closePlugin("Mobile App page created: 4 iPhone 15 screens (390x844).");
}

main();
