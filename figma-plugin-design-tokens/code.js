// ============================================================
// Panguard AI - Design Tokens Page Generator
// Figma Plugin - code.js
// ============================================================

// ---------- HELPERS ----------

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function solidPaint(hex) {
  return [{ type: "SOLID", color: hexToRgb(hex) }];
}

function createColorStyle(name, hex) {
  const style = figma.createPaintStyle();
  style.name = name;
  style.paints = solidPaint(hex);
  return style;
}

async function loadFonts() {
  const fonts = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Semi Bold" },
    { family: "Inter", style: "Bold" },
  ];
  for (const f of fonts) {
    await figma.loadFontAsync(f);
  }
  try {
    await figma.loadFontAsync({ family: "JetBrains Mono", style: "Regular" });
    return true;
  } catch (_e) {
    return false;
  }
}

function txt(parent, content, cfg) {
  const node = figma.createText();
  parent.appendChild(node);
  node.fontName = { family: cfg.family || "Inter", style: cfg.weight || "Regular" };
  node.characters = content;
  node.fontSize = cfg.size || 16;
  if (cfg.lh) node.lineHeight = { value: cfg.size * cfg.lh, unit: "PIXELS" };
  if (cfg.ls !== undefined) node.letterSpacing = { value: cfg.ls * 100, unit: "PERCENT" };
  if (cfg.color) node.fills = solidPaint(cfg.color);
  if (cfg.x !== undefined) node.x = cfg.x;
  if (cfg.y !== undefined) node.y = cfg.y;
  if (cfg.upper) node.textCase = "UPPER";
  return node;
}

function rect(parent, cfg) {
  const node = figma.createRectangle();
  parent.appendChild(node);
  node.resize(cfg.w, cfg.h);
  node.x = cfg.x || 0;
  node.y = cfg.y || 0;
  if (cfg.color) node.fills = solidPaint(cfg.color);
  if (cfg.radius !== undefined) node.cornerRadius = cfg.radius;
  if (cfg.name) node.name = cfg.name;
  if (cfg.effects) node.effects = cfg.effects;
  if (cfg.border) {
    node.strokes = solidPaint(cfg.border);
    node.strokeWeight = cfg.borderW || 1;
  }
  return node;
}

// Section header (overline + title)
function sectionHeader(parent, overline, title, x, y, C) {
  txt(parent, overline, {
    weight: "Medium", size: 11, lh: 1.4, ls: 0.08,
    color: C.sage, x: x, y: y, upper: true,
  });
  txt(parent, title, {
    weight: "Semi Bold", size: 24, lh: 1.3,
    color: C.cream, x: x, y: y + 28,
  });
  return y + 28 + 48;
}

function divider(parent, x, y, w, C) {
  rect(parent, { x, y, w, h: 1, color: C.border, name: "Divider" });
}

// ---------- DATA ----------

const COLOR_GROUPS = {
  Brand: [
    ["Brand/Sage Green", "#8B9A8E"],
    ["Brand/Deep Charcoal", "#1A1614"],
    ["Brand/Cream White", "#F5F1E8"],
  ],
  Semantic: [
    ["Semantic/Safe", "#2ED573"],
    ["Semantic/Caution", "#FBBF24"],
    ["Semantic/Alert", "#FF6B35"],
    ["Semantic/Danger", "#EF4444"],
    ["Semantic/Info", "#3B82F6"],
  ],
  Neutral: [
    ["Neutral/900", "#1A1614"],
    ["Neutral/800", "#242120"],
    ["Neutral/700", "#2E2A28"],
    ["Neutral/600", "#3D3835"],
    ["Neutral/500", "#666666"],
    ["Neutral/400", "#999999"],
    ["Neutral/300", "#CCCCCC"],
    ["Neutral/100", "#F5F1E8"],
    ["Neutral/000", "#FFFFFF"],
  ],
};

const TYPE_SCALE = [
  { name: "Display", family: "Inter", weight: "Bold", size: 48, lh: 1.15, ls: -0.02, sample: "Panguard AI", spec: "Inter Bold 48 / 1.15 / -0.02em" },
  { name: "Heading 1", family: "Inter", weight: "Semi Bold", size: 36, lh: 1.2, ls: -0.01, sample: "Endpoint Protection", spec: "Inter Semibold 36 / 1.2 / -0.01em" },
  { name: "Heading 2", family: "Inter", weight: "Semi Bold", size: 24, lh: 1.3, sample: "Threat Detection", spec: "Inter Semibold 24 / 1.3" },
  { name: "Heading 3", family: "Inter", weight: "Medium", size: 20, lh: 1.4, sample: "Security Alerts", spec: "Inter Medium 20 / 1.4" },
  { name: "Body", family: "Inter", weight: "Regular", size: 16, lh: 1.6, sample: "Panguard AI monitors your endpoints 24/7, detecting threats in real-time using a three-layer AI funnel.", spec: "Inter Regular 16 / 1.6" },
  { name: "Body Small", family: "Inter", weight: "Regular", size: 14, lh: 1.5, sample: "Installed on 2,400+ endpoints across Asia-Pacific region.", spec: "Inter Regular 14 / 1.5" },
  { name: "Caption", family: "Inter", weight: "Medium", size: 12, lh: 1.4, ls: 0.02, sample: "Last scan: 2 minutes ago", spec: "Inter Medium 12 / 1.4 / 0.02em" },
  { name: "Overline", family: "Inter", weight: "Medium", size: 11, lh: 1.4, ls: 0.08, upper: true, sample: "SECURITY STATUS", spec: "Inter Medium 11 / 1.4 / 0.08em / UPPERCASE" },
  { name: "Code", family: "JetBrains Mono", weight: "Regular", size: 14, lh: 1.6, sample: "curl -fsSL https://get.panguard.ai | sh", spec: "JetBrains Mono Regular 14 / 1.6" },
];

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64, 96];

const RADII = [
  { label: "Small", value: 4 },
  { label: "Medium", value: 8 },
  { label: "Large", value: 12 },
  { label: "XL", value: 16 },
  { label: "Full", value: 9999 },
];

const SHADOWS = [
  { label: "Card", spec: "0 4px 24px rgba(0,0,0,0.2)", fx: { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 4 }, radius: 24, spread: 0, visible: true, blendMode: "NORMAL" } },
  { label: "Dropdown", spec: "0 8px 32px rgba(0,0,0,0.3)", fx: { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 8 }, radius: 32, spread: 0, visible: true, blendMode: "NORMAL" } },
  { label: "Modal", spec: "0 16px 48px rgba(0,0,0,0.4)", fx: { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.4 }, offset: { x: 0, y: 16 }, radius: 48, spread: 0, visible: true, blendMode: "NORMAL" } },
];

// ---------- MAIN ----------

async function main() {
  const hasJBMono = await loadFonts();

  // Theme constants
  const C = {
    bg: "#1A1614",
    card: "#242120",
    border: "#2E2A28",
    cream: "#F5F1E8",
    sage: "#8B9A8E",
    muted: "#999999",
    dim: "#666666",
    white: "#FFFFFF",
  };

  const W = 2400;
  const PAD = 80;
  const CONTENT_W = W - PAD * 2;
  const GAP = 120;

  // ---- Page setup ----
  let page = figma.root.children.find(function (p) { return p.name === "Design Tokens"; });
  if (!page) {
    page = figma.createPage();
    page.name = "Design Tokens";
  }
  figma.currentPage = page;
  page.children.forEach(function (c) { return c.remove(); });

  let Y = PAD;

  // ---- Background ----
  const bg = rect(page, { x: 0, y: 0, w: W, h: 8000, color: C.bg, name: "Background" });

  // ============================================================
  // PAGE HEADER
  // ============================================================
  txt(page, "DESIGN TOKENS", {
    weight: "Medium", size: 11, lh: 1.4, ls: 0.08,
    color: C.sage, x: PAD, y: Y, upper: true,
  });
  Y += 28;

  txt(page, "Panguard AI Design System", {
    weight: "Bold", size: 48, lh: 1.15, ls: -0.02,
    color: C.cream, x: PAD, y: Y,
  });
  Y += 72;

  txt(page, "Foundation tokens for the Panguard AI cybersecurity platform. All colors, typography, spacing, radii, and shadows defined here.", {
    weight: "Regular", size: 16, lh: 1.6,
    color: C.muted, x: PAD, y: Y,
  });
  Y += 60;

  divider(page, PAD, Y, CONTENT_W, C);
  Y += GAP;

  // ============================================================
  // 1. CREATE FIGMA PAINT STYLES
  // ============================================================
  for (var groupName in COLOR_GROUPS) {
    var colors = COLOR_GROUPS[groupName];
    for (var i = 0; i < colors.length; i++) {
      createColorStyle(colors[i][0], colors[i][1]);
    }
  }

  // ============================================================
  // 2. CREATE FIGMA TEXT STYLES
  // ============================================================
  for (var ti = 0; ti < TYPE_SCALE.length; ti++) {
    var t = TYPE_SCALE[ti];
    var ts = figma.createTextStyle();
    ts.name = t.name;
    var fam = t.family;
    var wt = t.weight;
    if (fam === "JetBrains Mono" && !hasJBMono) {
      fam = "Inter";
      wt = "Regular";
    }
    ts.fontName = { family: fam, style: wt };
    ts.fontSize = t.size;
    ts.lineHeight = { value: t.size * t.lh, unit: "PIXELS" };
    if (t.ls !== undefined) ts.letterSpacing = { value: t.ls * 100, unit: "PERCENT" };
    if (t.upper) ts.textCase = "UPPER";
  }

  // ============================================================
  // 3. CREATE FIGMA EFFECT STYLES
  // ============================================================
  for (var si = 0; si < SHADOWS.length; si++) {
    var es = figma.createEffectStyle();
    es.name = "Shadow/" + SHADOWS[si].label;
    es.effects = [SHADOWS[si].fx];
  }

  // ============================================================
  // VISUAL: COLOR PALETTE
  // ============================================================
  Y = sectionHeader(page, "COLOR PALETTE", "Colors", PAD, Y, C);

  var SWATCH = 96;
  var SWATCH_GAP = 24;

  var groupNames = ["Brand", "Semantic", "Neutral"];
  for (var gi = 0; gi < groupNames.length; gi++) {
    var gn = groupNames[gi];
    var group = COLOR_GROUPS[gn];

    txt(page, gn, {
      weight: "Semi Bold", size: 20, lh: 1.4,
      color: C.cream, x: PAD, y: Y,
    });
    Y += 40;

    var sx = PAD;
    for (var ci = 0; ci < group.length; ci++) {
      var name = group[ci][0];
      var hex = group[ci][1];
      var label = name.split("/")[1];
      var isDark = ["Deep Charcoal", "900", "800", "700", "600"].indexOf(label) >= 0;

      rect(page, {
        x: sx, y: Y, w: SWATCH, h: SWATCH,
        color: hex, radius: 12, name: name,
        border: isDark ? C.border : undefined,
      });

      txt(page, label, {
        weight: "Medium", size: 13, lh: 1.5,
        color: C.cream, x: sx, y: Y + SWATCH + 10,
      });

      txt(page, hex, {
        weight: "Regular", size: 11, lh: 1.4,
        color: C.muted, x: sx, y: Y + SWATCH + 28,
      });

      sx += SWATCH + SWATCH_GAP;
    }
    Y += SWATCH + 64;
  }

  divider(page, PAD, Y, CONTENT_W, C);
  Y += GAP;

  // ============================================================
  // VISUAL: TYPOGRAPHY
  // ============================================================
  Y = sectionHeader(page, "TYPOGRAPHY", "Type Scale", PAD, Y, C);

  for (var ti2 = 0; ti2 < TYPE_SCALE.length; ti2++) {
    var t2 = TYPE_SCALE[ti2];

    // Card
    var cardPad = 28;
    var sampleH = Math.ceil(t2.size * t2.lh) + 4;
    var cardH = cardPad + 20 + 12 + sampleH + cardPad;
    var cardBg = rect(page, {
      x: PAD, y: Y, w: CONTENT_W, h: cardH,
      color: C.card, radius: 12, name: "Type/" + t2.name,
    });

    // Style name
    txt(page, t2.name, {
      weight: "Medium", size: 12, lh: 1.4, ls: 0.02,
      color: C.sage, x: PAD + cardPad, y: Y + cardPad,
    });

    // Spec
    txt(page, t2.spec, {
      weight: "Regular", size: 12, lh: 1.4,
      color: C.dim, x: PAD + 200, y: Y + cardPad,
    });

    // Sample
    var sampleFam = t2.family;
    var sampleWt = t2.weight;
    if (sampleFam === "JetBrains Mono" && !hasJBMono) {
      sampleFam = "Inter";
      sampleWt = "Regular";
    }
    var sampleNode = txt(page, t2.sample, {
      family: sampleFam, weight: sampleWt,
      size: t2.size, lh: t2.lh, ls: t2.ls,
      color: C.cream,
      x: PAD + cardPad, y: Y + cardPad + 20 + 12,
    });
    if (t2.upper) sampleNode.textCase = "UPPER";

    Y += cardH + 12;
  }

  Y += GAP - 12;
  divider(page, PAD, Y, CONTENT_W, C);
  Y += GAP;

  // ============================================================
  // VISUAL: SPACING
  // ============================================================
  Y = sectionHeader(page, "SPACING", "Spacing Scale", PAD, Y, C);

  var BAR_MAX = 960;
  for (var spi = 0; spi < SPACING.length; spi++) {
    var sp = SPACING[spi];
    var barW = Math.max((sp / 96) * BAR_MAX, 4);

    txt(page, sp + "px", {
      weight: "Medium", size: 14, lh: 1.5,
      color: C.cream, x: PAD, y: Y + 3,
    });

    rect(page, {
      x: PAD + 80, y: Y, w: barW, h: 24,
      color: C.sage, radius: 4, name: "Spacing/" + sp,
    });

    txt(page, "" + sp, {
      weight: "Regular", size: 12, lh: 1.4,
      color: C.muted, x: PAD + 80 + barW + 16, y: Y + 5,
    });

    Y += 40;
  }

  Y += GAP - 40;
  divider(page, PAD, Y, CONTENT_W, C);
  Y += GAP;

  // ============================================================
  // VISUAL: BORDER RADIUS
  // ============================================================
  Y = sectionHeader(page, "BORDER RADIUS", "Corner Radius", PAD, Y, C);

  var RB = 96;
  var rx = PAD;
  for (var ri = 0; ri < RADII.length; ri++) {
    var r = RADII[ri];
    rect(page, {
      x: rx, y: Y, w: RB, h: RB,
      color: C.card, radius: Math.min(r.value, RB / 2),
      name: "Radius/" + r.label, border: C.sage, borderW: 2,
    });
    txt(page, r.label, {
      weight: "Medium", size: 14, lh: 1.5,
      color: C.cream, x: rx, y: Y + RB + 12,
    });
    txt(page, r.value === 9999 ? "9999px" : r.value + "px", {
      weight: "Regular", size: 12, lh: 1.4,
      color: C.muted, x: rx, y: Y + RB + 32,
    });
    rx += RB + 48;
  }

  Y += RB + 72;
  divider(page, PAD, Y, CONTENT_W, C);
  Y += GAP;

  // ============================================================
  // VISUAL: SHADOWS
  // ============================================================
  Y = sectionHeader(page, "SHADOWS", "Elevation", PAD, Y, C);

  var SB = 200;
  var shx = PAD;
  for (var shi = 0; shi < SHADOWS.length; shi++) {
    var s = SHADOWS[shi];
    rect(page, {
      x: shx, y: Y, w: SB, h: 140,
      color: C.card, radius: 12,
      name: "Shadow/" + s.label, effects: [s.fx],
    });
    txt(page, s.label, {
      weight: "Medium", size: 14, lh: 1.5,
      color: C.cream, x: shx, y: Y + 156,
    });
    txt(page, s.spec, {
      weight: "Regular", size: 12, lh: 1.4,
      color: C.muted, x: shx, y: Y + 176,
    });
    shx += SB + 60;
  }

  Y += 220;

  // ============================================================
  // FOOTER
  // ============================================================
  divider(page, PAD, Y, CONTENT_W, C);
  Y += 48;
  txt(page, "Panguard AI Design System v1.0", {
    weight: "Regular", size: 14, lh: 1.5,
    color: C.dim, x: PAD, y: Y,
  });
  txt(page, "OpenClaw Security  |  Taipei, Taiwan", {
    weight: "Regular", size: 14, lh: 1.5,
    color: C.dim, x: PAD, y: Y + 24,
  });
  Y += 80;

  // Resize background
  bg.resize(W, Y + PAD);

  // Zoom to page
  figma.viewport.scrollAndZoomIntoView(page.children);
  figma.closePlugin("Design Tokens page created with 17 color styles, 9 text styles, 3 effect styles.");
}

main();
