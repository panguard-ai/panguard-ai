// ============================================================
// Panguard AI - Dashboard Page Generator
// Figma Plugin (API 1.0.0 compatible)
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
  var p = { type: "SOLID", color: hexToRgb(hex) };
  if (opacity !== undefined) p.opacity = opacity;
  return [p];
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

function txt(content, cfg) {
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
  if (cfg.opacity !== undefined) f.opacity = cfg.opacity;
  if (cfg.clip !== undefined) f.clipsContent = cfg.clip;
  // sizing
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

function line(x1, y1, x2, y2, hex, weight) {
  var l = figma.createLine();
  l.x = x1;
  l.y = y1;
  var dx = x2 - x1;
  var dy = y2 - y1;
  var len = Math.sqrt(dx * dx + dy * dy);
  l.resize(len, 0);
  var angle = Math.atan2(dy, dx) * 180 / Math.PI;
  l.rotation = -angle;
  l.strokes = solid(hex);
  l.strokeWeight = weight || 1;
  return l;
}

// ---------- THEME ----------

var C = {
  bg: "#1A1614", card: "#242120", border: "#2E2A28",
  cream: "#F5F1E8", sage: "#8B9A8E", muted: "#999999",
  dim: "#666666", white: "#FFFFFF", danger: "#EF4444",
  safe: "#2ED573", caution: "#FBBF24", alert: "#FF6B35",
  info: "#3B82F6",
};

// ============================================================
// SHIELD LOGO PLACEHOLDER
// ============================================================
function shieldPlaceholder(size) {
  var wrap = fr({ name: "Shield Logo", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: size, h: size });
  wrap.fills = solid(C.sage, 0.15);
  wrap.cornerRadius = size * 0.2;
  var inner = rect(size * 0.5, size * 0.55, C.sage, size * 0.1, 0.6);
  inner.name = "Shield";
  wrap.appendChild(inner);
  return wrap;
}

// ============================================================
// NAV BAR
// ============================================================
function buildNavBar() {
  var nav = fr({
    name: "Nav Bar", dir: "HORIZONTAL", mainAlign: "SPACE_BETWEEN", crossAlign: "CENTER",
    px: 32, w: 1440, h: 64, bg: C.bg, stroke: C.border, strokeW: 1,
  });

  // Left: logo
  var left = fr({ name: "Logo", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER", gap: 10 });
  var shield = shieldPlaceholder(28);
  left.appendChild(shield);
  var logoText = txt("PANGUARD-AI", { weight: "Semi Bold", size: 16, lh: 1.2, color: C.cream });
  left.appendChild(logoText);
  nav.appendChild(left);

  // Right: nav items + avatar
  var right = fr({ name: "Nav Items", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 32 });

  var items = [
    { label: "Dashboard", active: true },
    { label: "Endpoints", active: false },
    { label: "Threats", active: false },
    { label: "Reports", active: false },
  ];
  for (var i = 0; i < items.length; i++) {
    var t = txt(items[i].label, {
      weight: items[i].active ? "Medium" : "Regular",
      size: 16, lh: 1.6,
      color: items[i].active ? C.cream : C.muted,
    });
    right.appendChild(t);
  }

  var avatar = circle(32, C.sage, 0.3);
  avatar.name = "Avatar";
  right.appendChild(avatar);
  nav.appendChild(right);

  return nav;
}

// ============================================================
// STATUS HERO CARD
// ============================================================
function buildStatusHero(w) {
  var card = fr({
    name: "Status Hero", dir: "VERTICAL", mainAlign: "CENTER", crossAlign: "CENTER",
    p: 32, gap: 16, w: w, h: 260, bg: C.card, radius: 12, stroke: C.border, strokeW: 1,
  });

  var shield = shieldPlaceholder(80);
  card.appendChild(shield);

  // Status row
  var statusRow = fr({ name: "Status", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", gap: 10 });
  var dot = circle(8, C.safe);
  dot.name = "Status Dot";
  statusRow.appendChild(dot);
  var statusText = txt("All Systems Normal", { weight: "Semi Bold", size: 36, lh: 1.2, ls: -0.01, color: C.cream });
  statusRow.appendChild(statusText);
  card.appendChild(statusRow);

  var lastScan = txt("Last scan: 2 minutes ago", { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: C.muted });
  card.appendChild(lastScan);

  return card;
}

// ============================================================
// KPI CARD
// ============================================================
function buildKpiCard(w, iconLabel, value, label, trendText, trendColor) {
  var card = fr({
    name: "KPI: " + label, dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    p: 24, gap: 12, w: w, h: 160, bg: C.card, radius: 12, stroke: C.border, strokeW: 1,
  });

  // Icon
  var iconWrap = fr({ name: "Icon", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", w: 32, h: 32 });
  iconWrap.fills = solid(C.sage, 0.15);
  iconWrap.cornerRadius = 8;
  var iconT = txt(iconLabel, { weight: "Semi Bold", size: 14, lh: 1, color: C.sage });
  iconWrap.appendChild(iconT);
  card.appendChild(iconWrap);

  // Value row
  var valueRow = fr({ name: "Value", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "MAX", gap: 12 });
  var numText = txt(value, { weight: "Bold", size: 48, lh: 1.15, ls: -0.02, color: C.cream });
  valueRow.appendChild(numText);
  if (trendText) {
    var trend = txt(trendText, { weight: "Medium", size: 14, lh: 1.5, color: trendColor });
    valueRow.appendChild(trend);
  }
  card.appendChild(valueRow);

  // Label
  var labelText = txt(label, { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: C.muted });
  card.appendChild(labelText);

  return card;
}

// ============================================================
// THREAT TIMELINE CARD (with chart)
// ============================================================
function buildThreatTimeline(w, h) {
  var card = fr({
    name: "Threat Timeline", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    p: 24, gap: 16, w: w, h: h, bg: C.card, radius: 12, stroke: C.border, strokeW: 1, clip: true,
  });

  // Header
  var header = fr({ name: "Header", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN", gap: 4 });
  var title = txt("Threat Timeline", { weight: "Semi Bold", size: 24, lh: 1.3, color: C.cream });
  header.appendChild(title);
  var subtitle = txt("Threat Activity - Last 7 Days", { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: C.muted });
  header.appendChild(subtitle);
  card.appendChild(header);

  // Chart area
  var chartW = w - 48;
  var chartH = h - 120;
  var chartArea = fr({ name: "Chart", dir: "VERTICAL", mainAlign: "MAX", crossAlign: "MIN", w: chartW, h: chartH, clip: true });
  chartArea.fills = [];

  // Y-axis labels
  var yLabels = ["120", "80", "40", "0"];
  for (var yi = 0; yi < yLabels.length; yi++) {
    var yT = txt(yLabels[yi], { weight: "Regular", size: 11, lh: 1.4, color: C.dim });
    yT.x = 0;
    yT.y = yi * (chartH / 4) + 4;
    chartArea.appendChild(yT);

    // Grid line
    var gridLine = figma.createRectangle();
    gridLine.resize(chartW - 40, 1);
    gridLine.fills = solid(C.border);
    gridLine.x = 40;
    gridLine.y = yi * (chartH / 4) + 10;
    gridLine.name = "Grid";
    chartArea.appendChild(gridLine);
  }

  // Area chart - simulated with filled polygon using rectangles
  // Data points (normalized 0-1): Mon=0.3, Tue=0.5, Wed=0.8, Thu=0.6, Fri=0.45, Sat=0.35, Sun=0.25
  var dataPoints = [0.3, 0.5, 0.8, 0.6, 0.45, 0.35, 0.25];
  var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var graphLeft = 50;
  var graphW = chartW - 60;
  var graphH = chartH - 30;
  var graphBottom = chartH - 20;

  // Area fill - vertical bars approximation
  for (var di = 0; di < dataPoints.length; di++) {
    var barX = graphLeft + (di / (dataPoints.length - 1)) * graphW;
    var barH = dataPoints[di] * graphH;
    var bar = figma.createRectangle();
    bar.resize(graphW / 7, barH);
    bar.fills = solid(C.sage, 0.1);
    bar.x = barX - graphW / 14;
    bar.y = graphBottom - barH;
    bar.name = "Area";
    chartArea.appendChild(bar);
  }

  // Line dots + connecting segments
  for (var di2 = 0; di2 < dataPoints.length; di2++) {
    var dotX = graphLeft + (di2 / (dataPoints.length - 1)) * graphW;
    var dotY = graphBottom - dataPoints[di2] * graphH;

    // Dot
    var dot = circle(6, C.sage);
    dot.x = dotX - 3;
    dot.y = dotY - 3;
    dot.name = "Point";
    chartArea.appendChild(dot);

    // Line segment to next point
    if (di2 < dataPoints.length - 1) {
      var nextX = graphLeft + ((di2 + 1) / (dataPoints.length - 1)) * graphW;
      var nextY = graphBottom - dataPoints[di2 + 1] * graphH;

      var seg = figma.createLine();
      var sdx = nextX - dotX;
      var sdy = nextY - dotY;
      var slen = Math.sqrt(sdx * sdx + sdy * sdy);
      seg.resize(slen, 0);
      seg.rotation = -Math.atan2(sdy, sdx) * 180 / Math.PI;
      seg.x = dotX;
      seg.y = dotY;
      seg.strokes = solid(C.sage);
      seg.strokeWeight = 2;
      seg.name = "Line";
      chartArea.appendChild(seg);
    }

    // X label
    var dayLabel = txt(days[di2], { weight: "Regular", size: 11, lh: 1.4, color: C.dim });
    dayLabel.x = dotX - 10;
    dayLabel.y = graphBottom + 4;
    chartArea.appendChild(dayLabel);
  }

  card.appendChild(chartArea);
  return card;
}

// ============================================================
// RECENT SECURITY EVENTS CARD
// ============================================================
function buildEventsCard(w, h) {
  var card = fr({
    name: "Recent Security Events", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    p: 24, gap: 16, w: w, h: h, bg: C.card, radius: 12, stroke: C.border, strokeW: 1,
  });

  var title = txt("Recent Security Events", { weight: "Semi Bold", size: 24, lh: 1.3, color: C.cream });
  card.appendChild(title);

  var events = [
    { status: "Safe", color: C.safe, text: "Port scan detected and blocked", time: "2m" },
    { status: "Caution", color: C.caution, text: "Unusual login attempt", time: "15m" },
    { status: "Safe", color: C.safe, text: "Malware signature updated", time: "1h" },
    { status: "Critical", color: C.danger, text: "Brute force attack blocked", time: "2h" },
  ];

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];

    var row = fr({
      name: "Event " + (i + 1), dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "CENTER",
      gap: 12, py: 12, w: w - 48, h: 48,
    });
    row.fills = [];
    row.primaryAxisSizingMode = "FIXED";

    // Bottom divider except last
    if (i < events.length - 1) {
      var divLine = figma.createRectangle();
      divLine.resize(w - 48, 1);
      divLine.fills = solid(C.border);
      divLine.x = 0;
      divLine.y = 47;
      divLine.name = "Divider";
      row.appendChild(divLine);
    }

    // Status badge
    var badge = fr({
      name: "Badge", dir: "HORIZONTAL", mainAlign: "CENTER", crossAlign: "CENTER", px: 12, py: 4,
    });
    badge.fills = solid(ev.color, 0.1);
    badge.cornerRadius = 9999;
    badge.strokes = solid(ev.color, 0.2);
    badge.strokeWeight = 1;
    var badgeText = txt(ev.status, { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: ev.color });
    badge.appendChild(badgeText);
    row.appendChild(badge);

    // Event text
    var evText = txt(ev.text, { weight: "Regular", size: 14, lh: 1.5, color: C.cream });
    evText.layoutGrow = 1;
    row.appendChild(evText);

    // Time
    var timeText = txt(ev.time, { weight: "Medium", size: 12, lh: 1.4, ls: 0.02, color: C.muted });
    row.appendChild(timeText);

    card.appendChild(row);
  }

  return card;
}

// ============================================================
// NETWORK MAP CARD
// ============================================================
function buildNetworkMap(w, h) {
  var card = fr({
    name: "Network Map", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    p: 24, gap: 16, w: w, h: h, bg: C.card, radius: 12, stroke: C.border, strokeW: 1, clip: true,
  });

  var title = txt("Network Map", { weight: "Semi Bold", size: 24, lh: 1.3, color: C.cream });
  card.appendChild(title);

  // Map area
  var mapW = w - 48;
  var mapH = h - 80;
  var mapArea = fr({ name: "Map", w: mapW, h: mapH, clip: true });
  mapArea.fills = [];

  // Network nodes
  var nodes = [
    { x: mapW * 0.5, y: mapH * 0.4, size: 24, color: C.sage, opacity: 1 },    // Center/server
    { x: mapW * 0.2, y: mapH * 0.2, size: 14, color: C.sage, opacity: 0.7 },
    { x: mapW * 0.8, y: mapH * 0.25, size: 14, color: C.sage, opacity: 0.7 },
    { x: mapW * 0.15, y: mapH * 0.65, size: 12, color: C.dim, opacity: 0.8 },
    { x: mapW * 0.75, y: mapH * 0.7, size: 12, color: C.dim, opacity: 0.8 },
    { x: mapW * 0.35, y: mapH * 0.8, size: 10, color: C.sage, opacity: 0.5 },
    { x: mapW * 0.65, y: mapH * 0.15, size: 10, color: C.dim, opacity: 0.6 },
    { x: mapW * 0.4, y: mapH * 0.3, size: 10, color: C.sage, opacity: 0.5 },
    { x: mapW * 0.6, y: mapH * 0.55, size: 10, color: C.dim, opacity: 0.6 },
  ];

  // Connection lines (from center to others)
  var centerNode = nodes[0];
  for (var li = 1; li < nodes.length; li++) {
    var n = nodes[li];
    var connLine = figma.createLine();
    var cdx = n.x - centerNode.x;
    var cdy = n.y - centerNode.y;
    var clen = Math.sqrt(cdx * cdx + cdy * cdy);
    connLine.resize(clen, 0);
    connLine.rotation = -Math.atan2(cdy, cdx) * 180 / Math.PI;
    connLine.x = centerNode.x;
    connLine.y = centerNode.y;
    connLine.strokes = solid(C.border);
    connLine.strokeWeight = 1;
    connLine.name = "Connection";
    mapArea.appendChild(connLine);
  }

  // Some peer connections
  var peerLinks = [[1, 7], [2, 6], [3, 5], [4, 8], [7, 8]];
  for (var pi = 0; pi < peerLinks.length; pi++) {
    var a = nodes[peerLinks[pi][0]];
    var b = nodes[peerLinks[pi][1]];
    var pdx = b.x - a.x;
    var pdy = b.y - a.y;
    var plen = Math.sqrt(pdx * pdx + pdy * pdy);
    var pLine = figma.createLine();
    pLine.resize(plen, 0);
    pLine.rotation = -Math.atan2(pdy, pdx) * 180 / Math.PI;
    pLine.x = a.x;
    pLine.y = a.y;
    pLine.strokes = solid(C.border, 0.5);
    pLine.strokeWeight = 1;
    pLine.name = "Peer Link";
    mapArea.appendChild(pLine);
  }

  // Draw nodes on top
  for (var ni = 0; ni < nodes.length; ni++) {
    var nd = nodes[ni];
    var nodeCircle = circle(nd.size, nd.color, nd.opacity);
    nodeCircle.x = nd.x - nd.size / 2;
    nodeCircle.y = nd.y - nd.size / 2;
    nodeCircle.name = "Node " + ni;
    mapArea.appendChild(nodeCircle);
  }

  card.appendChild(mapArea);
  return card;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  await loadFonts();

  // Page setup
  var page = figma.root.children.find(function (p) { return p.name === "Dashboard"; });
  if (!page) {
    page = figma.createPage();
    page.name = "Dashboard";
  }
  figma.currentPage = page;
  page.children.forEach(function (c) { return c.remove(); });

  // Main frame 1440x900
  var main = fr({
    name: "Dashboard - 1440x900", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    w: 1440, h: 900, bg: C.bg, clip: true,
  });
  page.appendChild(main);

  // ---- NAV BAR ----
  var nav = buildNavBar();
  main.appendChild(nav);

  // ---- BODY ----
  var body = fr({
    name: "Body", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "MIN",
    gap: 24, p: 24, w: 1440, h: 836,
  });
  body.fills = [];
  main.appendChild(body);

  // ---- LEFT COLUMN ----
  var leftW = 400;
  var leftCol = fr({
    name: "Left Column", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    gap: 16, w: leftW, h: 788,
  });
  leftCol.fills = [];

  var statusHero = buildStatusHero(leftW);
  leftCol.appendChild(statusHero);

  var kpi1 = buildKpiCard(leftW, "S", "2,847", "Attacks Blocked", "+12% \u2191", C.safe);
  leftCol.appendChild(kpi1);

  var kpi2 = buildKpiCard(leftW, "N", "24", "Endpoints Protected", "All Active", C.safe);
  leftCol.appendChild(kpi2);

  var kpi3 = buildKpiCard(leftW, "C", "99.9%", "Uptime", "30 days", C.muted);
  leftCol.appendChild(kpi3);

  body.appendChild(leftCol);

  // ---- RIGHT COLUMN ----
  var rightW = 1440 - 48 - leftW - 24;  // page padding + gap
  var rightCol = fr({
    name: "Right Column", dir: "VERTICAL", mainAlign: "MIN", crossAlign: "MIN",
    gap: 16, w: rightW, h: 788,
  });
  rightCol.fills = [];

  // Threat Timeline
  var timelineH = 340;
  var timeline = buildThreatTimeline(rightW, timelineH);
  rightCol.appendChild(timeline);

  // Bottom row
  var bottomH = 788 - timelineH - 16;
  var bottomRow = fr({
    name: "Bottom Row", dir: "HORIZONTAL", mainAlign: "MIN", crossAlign: "MIN",
    gap: 16, w: rightW, h: bottomH,
  });
  bottomRow.fills = [];

  var eventsW = Math.floor(rightW * 0.6 - 8);
  var mapW = rightW - eventsW - 16;

  var eventsCard = buildEventsCard(eventsW, bottomH);
  bottomRow.appendChild(eventsCard);

  var networkMap = buildNetworkMap(mapW, bottomH);
  bottomRow.appendChild(networkMap);

  rightCol.appendChild(bottomRow);
  body.appendChild(rightCol);

  figma.viewport.scrollAndZoomIntoView([main]);
  figma.closePlugin("Dashboard page created: 1440x900, nav + 4 left cards + 3 right cards.");
}

main();
