// ============================================================
// Panguard AI - Components Page Generator
// Figma Plugin (compatible with API 1.0.0)
// ============================================================

// ---------- HELPERS ----------

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

function solid(hex, opacity) {
  var paint = { type: "SOLID", color: hexToRgb(hex) };
  if (opacity !== undefined) paint.opacity = opacity;
  return [paint];
}

async function loadFonts() {
  var fonts = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Semi Bold" },
    { family: "Inter", style: "Bold" },
  ];
  for (var i = 0; i < fonts.length; i++) {
    await figma.loadFontAsync(fonts[i]);
  }
}

function makeText(content, cfg) {
  var t = figma.createText();
  t.fontName = { family: cfg.family || "Inter", style: cfg.weight || "Regular" };
  t.characters = content;
  t.fontSize = cfg.size || 16;
  if (cfg.lh) t.lineHeight = { value: cfg.size * cfg.lh, unit: "PIXELS" };
  if (cfg.ls !== undefined) t.letterSpacing = { value: cfg.ls * 100, unit: "PERCENT" };
  if (cfg.color) t.fills = solid(cfg.color);
  if (cfg.upper) t.textCase = "UPPER";
  return t;
}

// Create a component with auto layout
function makeComp(name, cfg) {
  var c = figma.createComponent();
  c.name = name;
  c.layoutMode = cfg.dir || "HORIZONTAL";
  c.primaryAxisAlignItems = cfg.mainAlign || "CENTER";
  c.counterAxisAlignItems = cfg.crossAlign || "CENTER";
  c.itemSpacing = cfg.gap || 0;
  c.paddingTop = cfg.pt !== undefined ? cfg.pt : (cfg.py !== undefined ? cfg.py : (cfg.p || 0));
  c.paddingBottom = cfg.pb !== undefined ? cfg.pb : (cfg.py !== undefined ? cfg.py : (cfg.p || 0));
  c.paddingLeft = cfg.pl !== undefined ? cfg.pl : (cfg.px !== undefined ? cfg.px : (cfg.p || 0));
  c.paddingRight = cfg.pr !== undefined ? cfg.pr : (cfg.px !== undefined ? cfg.px : (cfg.p || 0));
  if (cfg.fills) c.fills = cfg.fills;
  else if (cfg.bg) c.fills = solid(cfg.bg);
  else c.fills = [];
  if (cfg.radius !== undefined) c.cornerRadius = cfg.radius;
  if (cfg.stroke) {
    c.strokes = solid(cfg.stroke, cfg.strokeOpacity);
    c.strokeWeight = cfg.strokeW || 1;
  }
  if (cfg.opacity !== undefined) c.opacity = cfg.opacity;
  if (cfg.effects) c.effects = cfg.effects;
  // Sizing
  if (cfg.fixedW) {
    c.resize(cfg.fixedW, cfg.fixedH || 100);
    c.primaryAxisSizingMode = cfg.hugW ? "AUTO" : "FIXED";
    c.counterAxisSizingMode = cfg.hugH ? "AUTO" : "FIXED";
  } else {
    c.primaryAxisSizingMode = "AUTO";
    c.counterAxisSizingMode = "AUTO";
  }
  return c;
}

// Create a frame (non-component) with auto layout
function makeFrame(cfg) {
  var f = figma.createFrame();
  f.layoutMode = cfg.dir || "HORIZONTAL";
  f.primaryAxisAlignItems = cfg.mainAlign || "CENTER";
  f.counterAxisAlignItems = cfg.crossAlign || "CENTER";
  f.itemSpacing = cfg.gap || 0;
  f.paddingTop = cfg.pt !== undefined ? cfg.pt : (cfg.py !== undefined ? cfg.py : (cfg.p || 0));
  f.paddingBottom = cfg.pb !== undefined ? cfg.pb : (cfg.py !== undefined ? cfg.py : (cfg.p || 0));
  f.paddingLeft = cfg.pl !== undefined ? cfg.pl : (cfg.px !== undefined ? cfg.px : (cfg.p || 0));
  f.paddingRight = cfg.pr !== undefined ? cfg.pr : (cfg.px !== undefined ? cfg.px : (cfg.p || 0));
  if (cfg.fills) f.fills = cfg.fills;
  else if (cfg.bg) f.fills = solid(cfg.bg);
  else f.fills = [];
  if (cfg.radius !== undefined) f.cornerRadius = cfg.radius;
  if (cfg.stroke) {
    f.strokes = solid(cfg.stroke, cfg.strokeOpacity);
    f.strokeWeight = cfg.strokeW || 1;
  }
  if (cfg.name) f.name = cfg.name;
  if (cfg.opacity !== undefined) f.opacity = cfg.opacity;
  if (cfg.effects) f.effects = cfg.effects;
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  if (cfg.fixedW) {
    f.resize(cfg.fixedW, cfg.fixedH || 40);
    f.primaryAxisSizingMode = "FIXED";
  }
  return f;
}

// ---------- THEME ----------

var C = {
  bg: "#1A1614",
  card: "#242120",
  border: "#2E2A28",
  borderHover: "#3D3835",
  cream: "#F5F1E8",
  sage: "#8B9A8E",
  muted: "#999999",
  dim: "#666666",
  white: "#FFFFFF",
  danger: "#EF4444",
  safe: "#2ED573",
  caution: "#FBBF24",
  alert: "#FF6B35",
  info: "#3B82F6",
};

// ============================================================
// 1. BUTTON
// ============================================================
function buildButton(style, size, state) {
  var sizes = {
    Small:  { h: 32, px: 16, py: 8,  fs: 14 },
    Medium: { h: 40, px: 24, py: 12, fs: 14 },
    Large:  { h: 48, px: 32, py: 16, fs: 16 },
  };
  var sz = sizes[size];

  var bg, textColor, borderCol, borderOp, fOpacity;
  bg = []; textColor = C.bg; borderCol = null; borderOp = undefined; fOpacity = 1;

  if (style === "Primary") {
    bg = solid(C.sage);
    textColor = C.bg;
    if (state === "Hover") bg = solid("#9AAB9D");
    if (state === "Active") bg = solid("#7A8B7E");
    if (state === "Disabled") { bg = solid(C.sage, 0.4); fOpacity = 0.6; }
  } else if (style === "Secondary") {
    bg = [];
    textColor = C.sage;
    borderCol = C.sage;
    if (state === "Hover") bg = solid(C.sage, 0.1);
    if (state === "Active") bg = solid(C.sage, 0.15);
    if (state === "Disabled") { borderOp = 0.4; fOpacity = 0.6; }
  } else if (style === "Ghost") {
    bg = [];
    textColor = C.muted;
    if (state === "Hover") { textColor = C.cream; bg = solid(C.white, 0.05); }
    if (state === "Active") { textColor = C.cream; bg = solid(C.white, 0.08); }
    if (state === "Disabled") { fOpacity = 0.4; }
  } else if (style === "Danger") {
    bg = solid(C.danger);
    textColor = C.white;
    if (state === "Hover") bg = solid("#FF5555");
    if (state === "Active") bg = solid("#DC3333");
    if (state === "Disabled") { bg = solid(C.danger, 0.4); fOpacity = 0.6; }
  }

  var comp = makeComp("Style=" + style + ", Size=" + size + ", State=" + state, {
    dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER",
    px: sz.px, py: sz.py, fills: bg, radius: 8, opacity: fOpacity,
    fixedW: sz.px * 2 + 60, fixedH: sz.h, hugW: true,
  });
  comp.resize(comp.width, sz.h);
  comp.counterAxisSizingMode = "FIXED";
  comp.primaryAxisSizingMode = "AUTO";

  if (borderCol) {
    comp.strokes = solid(borderCol, borderOp);
    comp.strokeWeight = 1;
  }

  var label = makeText("Button", { weight: "Semi Bold", size: sz.fs, lh: 1.2, color: textColor });
  comp.appendChild(label);

  return comp;
}

function buildAllButtons() {
  var styles = ["Primary", "Secondary", "Ghost", "Danger"];
  var sizes = ["Small", "Medium", "Large"];
  var states = ["Default", "Hover", "Active", "Disabled"];
  var comps = [];
  for (var a = 0; a < styles.length; a++) {
    for (var b = 0; b < sizes.length; b++) {
      for (var c = 0; c < states.length; c++) {
        comps.push(buildButton(styles[a], sizes[b], states[c]));
      }
    }
  }
  var set = figma.combineAsVariants(comps, figma.currentPage);
  set.name = "Button";
  set.fills = solid(C.bg);
  set.layoutMode = "VERTICAL";
  set.itemSpacing = 16;
  set.paddingTop = 32; set.paddingBottom = 32;
  set.paddingLeft = 32; set.paddingRight = 32;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  return set;
}

// ============================================================
// 2. STATUS BADGE
// ============================================================
function buildBadge(variant) {
  var defs = {
    Safe:     { color: C.safe,    label: "Safe" },
    Caution:  { color: C.caution, label: "Caution" },
    Alert:    { color: C.alert,   label: "Alert" },
    Critical: { color: C.danger,  label: "Critical" },
    Info:     { color: C.info,    label: "Info" },
  };
  var d = defs[variant];

  var comp = makeComp("Status=" + variant, {
    dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER",
    px: 12, py: 4, fills: solid(d.color, 0.1), radius: 9999,
    stroke: d.color, strokeOpacity: 0.2, strokeW: 1,
  });

  var label = makeText(d.label, { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: d.color });
  comp.appendChild(label);
  return comp;
}

function buildAllBadges() {
  var variants = ["Safe", "Caution", "Alert", "Critical", "Info"];
  var comps = [];
  for (var i = 0; i < variants.length; i++) comps.push(buildBadge(variants[i]));
  var set = figma.combineAsVariants(comps, figma.currentPage);
  set.name = "Status Badge";
  set.fills = solid(C.bg);
  set.layoutMode = "HORIZONTAL";
  set.itemSpacing = 16;
  set.paddingTop = 32; set.paddingBottom = 32;
  set.paddingLeft = 32; set.paddingRight = 32;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  return set;
}

// ============================================================
// 3. CARD
// ============================================================
function buildCard(variant) {
  var borderColor = C.border;
  if (variant === "Hover") borderColor = C.borderHover;
  if (variant === "Selected") borderColor = C.sage;

  var comp = makeComp("State=" + variant, {
    dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    p: 24, gap: 12, bg: C.card, radius: 12,
    stroke: borderColor, strokeW: 1,
    fixedW: 320, fixedH: 200,
  });
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";

  var title = makeText("Card Title", { weight: "Semi Bold", size: 20, lh: 1.4, color: C.cream });
  comp.appendChild(title);

  var desc = makeText("Card description text goes here.", { weight: "Regular", size: 14, lh: 1.5, color: C.muted });
  comp.appendChild(desc);
  desc.layoutGrow = 1;

  return comp;
}

function buildAllCards() {
  var variants = ["Default", "Hover", "Selected"];
  var comps = [];
  for (var i = 0; i < variants.length; i++) comps.push(buildCard(variants[i]));
  var set = figma.combineAsVariants(comps, figma.currentPage);
  set.name = "Card";
  set.fills = solid(C.bg);
  set.layoutMode = "HORIZONTAL";
  set.itemSpacing = 24;
  set.paddingTop = 32; set.paddingBottom = 32;
  set.paddingLeft = 32; set.paddingRight = 32;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  return set;
}

// ============================================================
// 4. INPUT FIELD
// ============================================================
function buildInput(state) {
  var borderColor = C.border;
  var textContent = "Placeholder text";
  var textColor = C.dim;
  var fOpacity = 1;

  if (state === "Focus") { borderColor = C.sage; textContent = "Input text"; textColor = C.cream; }
  if (state === "Error") { borderColor = C.danger; textContent = "Input text"; textColor = C.cream; }
  if (state === "Disabled") { textContent = "Disabled"; fOpacity = 0.5; }

  var comp = makeComp("State=" + state, {
    dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER",
    px: 12, bg: C.bg, radius: 8,
    stroke: borderColor, strokeW: 1, opacity: fOpacity,
    fixedW: 280, fixedH: 40,
  });
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";

  var label = makeText(textContent, { weight: "Regular", size: 16, lh: 1.6, color: textColor });
  comp.appendChild(label);
  label.layoutGrow = 1;

  return comp;
}

function buildAllInputs() {
  var states = ["Default", "Focus", "Error", "Disabled"];
  var comps = [];
  for (var i = 0; i < states.length; i++) comps.push(buildInput(states[i]));
  var set = figma.combineAsVariants(comps, figma.currentPage);
  set.name = "Input Field";
  set.fills = solid(C.bg);
  set.layoutMode = "HORIZONTAL";
  set.itemSpacing = 24;
  set.paddingTop = 32; set.paddingBottom = 32;
  set.paddingLeft = 32; set.paddingRight = 32;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  return set;
}

// ============================================================
// 5. NOTIFICATION TOAST
// ============================================================
function buildToast(variant) {
  var defs = {
    Info:    { color: C.info,    icon: "i",  title: "Information" },
    Success: { color: C.safe,    icon: "ok", title: "Success" },
    Warning: { color: C.caution, icon: "!",  title: "Warning" },
    Error:   { color: C.danger,  icon: "x",  title: "Error" },
  };
  var d = defs[variant];

  var comp = makeComp("Type=" + variant, {
    dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "MIN",
    bg: C.card, radius: 12, stroke: C.border, strokeW: 1,
    fixedW: 400, fixedH: 100,
  });
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "AUTO";

  // Left accent bar
  var accent = figma.createRectangle();
  accent.resize(3, 80);
  accent.fills = solid(d.color);
  accent.name = "Accent";
  comp.appendChild(accent);
  accent.layoutAlign = "STRETCH";

  // Content wrapper
  var content = makeFrame({
    dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "MIN",
    p: 16, gap: 12, name: "Content",
  });
  content.fills = [];
  comp.appendChild(content);
  content.layoutGrow = 1;
  content.counterAxisSizingMode = "AUTO";

  // Icon
  var iconWrap = makeFrame({
    dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER",
    name: "Icon",
  });
  iconWrap.fills = solid(d.color, 0.15);
  iconWrap.cornerRadius = 9999;
  iconWrap.resize(24, 24);
  iconWrap.primaryAxisSizingMode = "FIXED";
  iconWrap.counterAxisSizingMode = "FIXED";
  var iconT = makeText(d.icon, { weight: "Semi Bold", size: 11, lh: 1, color: d.color });
  iconWrap.appendChild(iconT);
  content.appendChild(iconWrap);

  // Text column
  var textCol = makeFrame({
    dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    gap: 4, name: "Text",
  });
  textCol.fills = [];
  textCol.counterAxisSizingMode = "AUTO";
  var titleT = makeText(d.title, { weight: "Medium", size: 20, lh: 1.4, color: C.cream });
  textCol.appendChild(titleT);
  var descT = makeText("This is a notification message.", { weight: "Regular", size: 14, lh: 1.5, color: C.muted });
  textCol.appendChild(descT);
  descT.layoutGrow = 1;
  content.appendChild(textCol);
  textCol.layoutGrow = 1;

  // Close
  var closeT = makeText("x", { weight: "Regular", size: 14, lh: 1, color: C.dim });
  content.appendChild(closeT);

  return comp;
}

function buildAllToasts() {
  var variants = ["Info", "Success", "Warning", "Error"];
  var comps = [];
  for (var i = 0; i < variants.length; i++) comps.push(buildToast(variants[i]));
  var set = figma.combineAsVariants(comps, figma.currentPage);
  set.name = "Notification Toast";
  set.fills = solid(C.bg);
  set.layoutMode = "VERTICAL";
  set.itemSpacing = 16;
  set.paddingTop = 32; set.paddingBottom = 32;
  set.paddingLeft = 32; set.paddingRight = 32;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  return set;
}

// ============================================================
// 6. NAV BAR
// ============================================================
function buildNavBar() {
  var comp = figma.createComponent();
  comp.name = "Nav Bar";
  comp.layoutMode = "HORIZONTAL";
  comp.primaryAxisAlignItems = "SPACE_BETWEEN";
  comp.counterAxisAlignItems = "CENTER";
  comp.paddingLeft = 32; comp.paddingRight = 32;
  comp.resize(1280, 64);
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.fills = solid(C.bg);
  comp.strokes = solid(C.border);
  comp.strokeWeight = 1;

  // Logo placeholder
  var logo = figma.createRectangle();
  logo.resize(140, 32);
  logo.fills = solid(C.sage, 0.5);
  logo.cornerRadius = 6;
  logo.name = "Logo";
  comp.appendChild(logo);

  // Right group
  var right = makeFrame({ dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 32, name: "Nav Items" });
  right.fills = [];

  var items = ["Dashboard", "Scan", "Guard", "Alerts", "Reports"];
  for (var i = 0; i < items.length; i++) {
    var t = makeText(items[i], { weight: "Regular", size: 16, lh: 1.6, color: i === 0 ? C.cream : C.muted });
    right.appendChild(t);
  }

  var avatar = figma.createEllipse();
  avatar.resize(32, 32);
  avatar.fills = solid(C.sage, 0.3);
  avatar.name = "Avatar";
  right.appendChild(avatar);

  comp.appendChild(right);
  return comp;
}

// ============================================================
// 7. KPI CARD
// ============================================================
function buildKpiCard(trend) {
  var comp = figma.createComponent();
  comp.name = "Trend=" + trend;
  comp.layoutMode = "VERTICAL";
  comp.primaryAxisAlignItems = "MIN";
  comp.counterAxisAlignItems = "MIN";
  comp.paddingTop = 24; comp.paddingBottom = 24;
  comp.paddingLeft = 24; comp.paddingRight = 24;
  comp.itemSpacing = 12;
  comp.resize(280, 180);
  comp.primaryAxisSizingMode = "FIXED";
  comp.counterAxisSizingMode = "FIXED";
  comp.fills = solid(C.card);
  comp.cornerRadius = 12;
  comp.strokes = solid(C.border);
  comp.strokeWeight = 1;

  // Icon
  var icon = figma.createRectangle();
  icon.resize(24, 24);
  icon.fills = solid(C.sage);
  icon.cornerRadius = 6;
  icon.name = "Icon";
  comp.appendChild(icon);

  // Number row
  var row = makeFrame({ dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "MAX", gap: 12, name: "Value" });
  row.fills = [];
  var num = makeText("2,847", { weight: "Bold", size: 48, lh: 1.15, ls: -0.02, color: C.cream });
  row.appendChild(num);

  if (trend === "Up") {
    var up = makeText("+12%", { weight: "Medium", size: 14, lh: 1.5, color: C.safe });
    row.appendChild(up);
  } else if (trend === "Down") {
    var down = makeText("-5%", { weight: "Medium", size: 14, lh: 1.5, color: C.danger });
    row.appendChild(down);
  }

  comp.appendChild(row);

  // Label
  var label = makeText("Endpoints Protected", { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: C.muted });
  comp.appendChild(label);

  return comp;
}

function buildAllKpiCards() {
  var trends = ["None", "Up", "Down"];
  var comps = [];
  for (var i = 0; i < trends.length; i++) comps.push(buildKpiCard(trends[i]));
  var set = figma.combineAsVariants(comps, figma.currentPage);
  set.name = "KPI Card";
  set.fills = solid(C.bg);
  set.layoutMode = "HORIZONTAL";
  set.itemSpacing = 24;
  set.paddingTop = 32; set.paddingBottom = 32;
  set.paddingLeft = 32; set.paddingRight = 32;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  return set;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  await loadFonts();

  var page = figma.root.children.find(function (p) { return p.name === "Components"; });
  if (!page) {
    page = figma.createPage();
    page.name = "Components";
  }
  figma.currentPage = page;
  page.children.forEach(function (c) { return c.remove(); });

  var PAD = 80;
  var GAP = 100;
  var Y = PAD;
  var W = 3200;

  // Background
  var bg = figma.createRectangle();
  bg.resize(W, 8000);
  bg.fills = solid(C.bg);
  bg.name = "Background";
  page.appendChild(bg);

  // Page header
  var ov = makeText("COMPONENTS", { weight: "Medium", size: 11, lh: 1.4, ls: 0.08, color: C.sage, upper: true });
  ov.x = PAD; ov.y = Y; page.appendChild(ov); Y += 28;

  var pt = makeText("Panguard AI Component Library", { weight: "Bold", size: 48, lh: 1.15, ls: -0.02, color: C.cream });
  pt.x = PAD; pt.y = Y; page.appendChild(pt); Y += 72;

  var pd = makeText("Reusable UI components built on the Panguard AI design token system. All components use Auto Layout.", { weight: "Regular", size: 16, lh: 1.6, color: C.muted });
  pd.x = PAD; pd.y = Y; page.appendChild(pd); Y += 60;

  var d0 = figma.createRectangle(); d0.resize(W - PAD * 2, 1); d0.fills = solid(C.border);
  d0.x = PAD; d0.y = Y; d0.name = "Divider"; page.appendChild(d0); Y += GAP;

  // Helper for section labels
  function sec(overline, title) {
    var a = makeText(overline, { weight: "Medium", size: 11, lh: 1.4, ls: 0.08, color: C.sage, upper: true });
    a.x = PAD; a.y = Y; page.appendChild(a); Y += 28;
    var b = makeText(title, { weight: "Semi Bold", size: 24, lh: 1.3, color: C.cream });
    b.x = PAD; b.y = Y; page.appendChild(b); Y += 52;
  }

  // 1. Buttons
  sec("INTERACTIVE", "Button");
  var btnSet = buildAllButtons();
  btnSet.x = PAD; btnSet.y = Y;
  Y += btnSet.height + GAP;

  // 2. Status Badge
  sec("FEEDBACK", "Status Badge");
  var badgeSet = buildAllBadges();
  badgeSet.x = PAD; badgeSet.y = Y;
  Y += badgeSet.height + GAP;

  // 3. Card
  sec("CONTAINERS", "Card");
  var cardSet = buildAllCards();
  cardSet.x = PAD; cardSet.y = Y;
  Y += cardSet.height + GAP;

  // 4. Input
  sec("FORMS", "Input Field");
  var inputSet = buildAllInputs();
  inputSet.x = PAD; inputSet.y = Y;
  Y += inputSet.height + GAP;

  // 5. Toast
  sec("FEEDBACK", "Notification Toast");
  var toastSet = buildAllToasts();
  toastSet.x = PAD; toastSet.y = Y;
  Y += toastSet.height + GAP;

  // 6. Nav Bar
  sec("NAVIGATION", "Nav Bar");
  var navBar = buildNavBar();
  navBar.x = PAD; navBar.y = Y;
  page.appendChild(navBar);
  Y += 64 + GAP;

  // 7. KPI Card
  sec("DATA DISPLAY", "KPI Card");
  var kpiSet = buildAllKpiCards();
  kpiSet.x = PAD; kpiSet.y = Y;
  Y += kpiSet.height + GAP;

  // Footer
  var dEnd = figma.createRectangle(); dEnd.resize(W - PAD * 2, 1); dEnd.fills = solid(C.border);
  dEnd.x = PAD; dEnd.y = Y; dEnd.name = "Divider"; page.appendChild(dEnd); Y += 48;

  var f1 = makeText("Panguard AI Component Library v1.0", { weight: "Regular", size: 14, lh: 1.5, color: C.dim });
  f1.x = PAD; f1.y = Y; page.appendChild(f1);
  var f2 = makeText("7 Components  |  68 Variants  |  Auto Layout", { weight: "Regular", size: 14, lh: 1.5, color: C.dim });
  f2.x = PAD; f2.y = Y + 24; page.appendChild(f2);
  Y += 80;

  bg.resize(W, Y + PAD);
  figma.viewport.scrollAndZoomIntoView(page.children);
  figma.closePlugin("Components page created: 7 components, 68 variants.");
}

main();
