/**
 * Threat Cloud Admin Dashboard
 * 威脅雲管理後台 - 需要 Admin API Key 認證
 *
 * Single-page admin UI served at /admin
 * All data fetched client-side via existing API endpoints.
 *
 * @module @panguard-ai/threat-cloud/admin-dashboard
 */

export function getAdminHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>Threat Cloud Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0e14;--surface:#111820;--surface2:#1a2230;--border:#243040;--text:#e0e6ed;--dim:#6b7d8f;--accent:#4fd1c5;--accent2:#38b2ac;--red:#f56565;--orange:#ed8936;--yellow:#ecc94b;--green:#48bb78;--blue:#4299e1}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5}
a{color:var(--accent);text-decoration:none}
/* Login */
#login{display:flex;align-items:center;justify-content:center;height:100vh}
#login form{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:40px;width:380px;text-align:center}
#login h1{font-size:20px;margin-bottom:8px}
#login p{color:var(--dim);font-size:13px;margin-bottom:24px}
#login input{width:100%;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;margin-bottom:16px}
#login input:focus{outline:none;border-color:var(--accent)}
#login button{width:100%;padding:10px;background:var(--accent);color:var(--bg);border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
#login button:hover{background:var(--accent2)}
#login .error{color:var(--red);font-size:13px;margin-top:8px;display:none}
/* Layout */
#app{display:none}
header{background:var(--surface);border-bottom:1px solid var(--border);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
header h1{font-size:16px;font-weight:600}
header h1 span{color:var(--accent)}
header .meta{display:flex;align-items:center;gap:16px;font-size:13px;color:var(--dim)}
header .logout{color:var(--red);cursor:pointer;font-size:12px}
nav{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;display:flex;gap:0;overflow-x:auto}
nav button{background:none;border:none;border-bottom:2px solid transparent;color:var(--dim);padding:10px 16px;font-size:13px;cursor:pointer;white-space:nowrap}
nav button:hover{color:var(--text)}
nav button.active{color:var(--accent);border-bottom-color:var(--accent)}
main{padding:24px;max-width:1400px;margin:0 auto}
/* Cards */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px}
.card .label{font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
.card .value{font-size:28px;font-weight:700}
.card .value.green{color:var(--green)}
.card .value.blue{color:var(--blue)}
.card .value.orange{color:var(--orange)}
.card .value.red{color:var(--red)}
/* Table */
.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:24px}
.table-header{padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.table-header h2{font-size:15px;font-weight:600}
.table-header .controls{display:flex;gap:8px;flex-wrap:wrap}
.table-header input,.table-header select{padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px}
.table-header input:focus,.table-header select:focus{outline:none;border-color:var(--accent)}
table{width:100%;border-collapse:collapse}
th{background:var(--surface2);text-align:left;padding:10px 14px;font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
td{padding:10px 14px;border-top:1px solid var(--border);font-size:13px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:hover td{background:var(--surface2)}
/* Badges */
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase}
.badge.critical{background:rgba(245,101,101,.15);color:var(--red)}
.badge.high{background:rgba(237,137,54,.15);color:var(--orange)}
.badge.medium{background:rgba(236,201,75,.15);color:var(--yellow)}
.badge.low{background:rgba(72,187,120,.15);color:var(--green)}
.badge.informational{background:rgba(66,153,225,.15);color:var(--blue)}
.badge.atr{background:rgba(79,209,197,.15);color:var(--accent)}
/* Charts */
.chart-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.chart-box{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px}
.chart-box h3{font-size:14px;margin-bottom:12px}
.bar-chart .bar-item{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.bar-chart .bar-label{width:140px;font-size:12px;color:var(--dim);text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-chart .bar-track{flex:1;height:20px;background:var(--bg);border-radius:4px;overflow:hidden}
.bar-chart .bar-fill{height:100%;border-radius:4px;min-width:2px;display:flex;align-items:center;padding-left:6px;font-size:11px;font-weight:600;color:var(--bg)}
.bar-chart .bar-count{width:50px;font-size:12px;color:var(--dim);text-align:right}
/* Pagination */
.pagination{display:flex;justify-content:center;gap:8px;padding:16px}
.pagination button{padding:6px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;cursor:pointer}
.pagination button:hover{border-color:var(--accent)}
.pagination button:disabled{opacity:.4;cursor:default}
.pagination span{padding:6px 8px;font-size:13px;color:var(--dim)}
/* Loading */
.loading{text-align:center;padding:40px;color:var(--dim)}
/* Empty */
.empty{text-align:center;padding:40px;color:var(--dim);font-size:13px}
/* Responsive */
@media(max-width:768px){.chart-row{grid-template-columns:1fr}.cards{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>

<div id="login">
<form onsubmit="return doLogin(event)">
  <h1>Threat Cloud <span>Admin</span></h1>
  <p>Enter your admin API key to continue.</p>
  <input type="password" id="keyInput" placeholder="TC_ADMIN_API_KEY" autofocus/>
  <button type="submit">Login</button>
  <div class="error" id="loginError">Invalid API key</div>
</form>
</div>

<div id="app">
<header>
  <h1>Threat Cloud <span>Admin</span></h1>
  <div class="meta">
    <span id="uptimeText"></span>
    <span class="logout" onclick="doLogout()">Logout</span>
  </div>
</header>
<nav id="tabs">
  <button class="active" data-tab="overview">Overview</button>
  <button data-tab="usage">Usage</button>
  <button data-tab="rules">Rules</button>
  <button data-tab="threats">Threats</button>
  <button data-tab="proposals">ATR Proposals</button>
  <button data-tab="skills">Skill Threats</button>
  <button data-tab="blacklist">Blacklist</button>
  <button data-tab="feeds">Feeds</button>
  <button data-tab="audit">Audit Log</button>
</nav>
<main id="content">
  <div class="loading">Loading...</div>
</main>
</div>

<script>
let API_KEY='';
let stats=null;
let currentTab='overview';

// Auth
function doLogin(e){
  e.preventDefault();
  const key=document.getElementById('keyInput').value.trim();
  if(!key)return false;
  API_KEY=key;
  fetch('/api/stats',{headers:{Authorization:'Bearer '+key}})
    .then(r=>{if(!r.ok)throw new Error();return r.json()})
    .then(d=>{
      if(!d.ok)throw new Error();
      stats=d.data;
      sessionStorage.setItem('tc_key',key);
      document.getElementById('login').style.display='none';
      document.getElementById('app').style.display='block';
      renderOverview();
      fetchUptime();
    })
    .catch(()=>{
      document.getElementById('loginError').style.display='block';
    });
  return false;
}
function doLogout(){
  sessionStorage.removeItem('tc_key');
  API_KEY='';
  document.getElementById('app').style.display='none';
  document.getElementById('login').style.display='flex';
  document.getElementById('keyInput').value='';
  document.getElementById('loginError').style.display='none';
}
// Auto-login from session
(function(){
  const k=sessionStorage.getItem('tc_key');
  if(k){document.getElementById('keyInput').value=k;doLogin(new Event('submit'));}
})();

// Tabs
document.getElementById('tabs').addEventListener('click',e=>{
  if(e.target.tagName!=='BUTTON')return;
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.remove('active'));
  e.target.classList.add('active');
  currentTab=e.target.dataset.tab;
  renderTab(currentTab);
});

function renderTab(tab){
  switch(tab){
    case 'overview':renderOverview();break;
    case 'usage':renderUsage();break;
    case 'rules':renderRules();break;
    case 'threats':renderThreats();break;
    case 'proposals':renderProposals();break;
    case 'skills':renderSkills();break;
    case 'blacklist':renderBlacklist();break;
    case 'feeds':renderFeeds();break;
    case 'audit':renderAuditLog();break;
  }
}

function api(path){
  return fetch(path,{headers:{Authorization:'Bearer '+API_KEY}}).then(r=>r.json());
}
function apiText(path){
  return fetch(path,{headers:{Authorization:'Bearer '+API_KEY}}).then(r=>r.text());
}
function apiPost(path,body){
  return fetch(path,{method:'POST',headers:{Authorization:'Bearer '+API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
}
function apiPatch(path,body){
  return fetch(path,{method:'PATCH',headers:{Authorization:'Bearer '+API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
}
function apiDelete(path,body){
  return fetch(path,{method:'DELETE',headers:{Authorization:'Bearer '+API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
}
function $(s){return document.getElementById(s)||document.querySelector(s)}
function h(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function num(n){return Number(n).toLocaleString()}
function badge(text,cls){return '<span class="badge '+cls+'">'+h(text)+'</span>'}
function severityBadge(s){return badge(s,(s||'').toLowerCase())}
function sourceBadge(s){return badge(s,(s||'').toLowerCase())}
function timeAgo(iso){
  if(!iso)return'-';
  const d=new Date(iso),now=Date.now(),diff=now-d.getTime();
  if(diff<60000)return 'just now';
  if(diff<3600000)return Math.floor(diff/60000)+'m ago';
  if(diff<86400000)return Math.floor(diff/3600000)+'h ago';
  return Math.floor(diff/86400000)+'d ago';
}

function fetchUptime(){
  api('/health').then(d=>{
    if(d.ok){
      const s=Math.round(d.data.uptime);
      const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
      $('uptimeText').textContent='Uptime: '+h+'h '+m+'m';
    }
  });
}

// Overview
function renderOverview(){
  if(!stats){api('/api/stats').then(d=>{stats=d.data;renderOverview();});return;}
  const s=stats;
  const maxCat=Math.max(...s.rulesByCategory.map(c=>c.count));
  const maxSev=Math.max(...s.rulesBySeverity.map(c=>c.count));
  const catColors=['var(--accent)','var(--blue)','var(--orange)','var(--yellow)','var(--green)','var(--red)'];

  let html='<div class="cards">';
  html+='<div class="card"><div class="label">Total Rules</div><div class="value green">'+num(s.totalRules)+'</div></div>';
  html+='<div class="card"><div class="label">Total Threats</div><div class="value blue">'+num(s.totalThreats)+'</div></div>';
  html+='<div class="card"><div class="label">Last 24h Threats</div><div class="value orange">'+num(s.last24hThreats)+'</div></div>';
  html+='<div class="card"><div class="label">ATR Proposals</div><div class="value">'+num(s.proposalStats.total)+'</div></div>';
  html+='<div class="card"><div class="label">Skill Threats</div><div class="value">'+num(s.skillThreatsTotal)+'</div></div>';
  html+='<div class="card"><div class="label">Blacklisted Skills</div><div class="value red">'+num(s.skillBlacklistTotal)+'</div></div>';
  html+='</div>';

  // Source breakdown
  html+='<div class="cards" style="margin-bottom:24px">';
  (s.rulesBySource||[]).forEach(r=>{
    html+='<div class="card"><div class="label">'+h(r.source).toUpperCase()+' Rules</div><div class="value">'+num(r.count)+'</div></div>';
  });
  html+='</div>';

  // Charts
  html+='<div class="chart-row">';
  // Category chart
  html+='<div class="chart-box"><h3>Rules by Category</h3><div class="bar-chart">';
  (s.rulesByCategory||[]).slice(0,12).forEach((c,i)=>{
    const pct=Math.round(c.count/maxCat*100);
    const color=catColors[i%catColors.length];
    html+='<div class="bar-item"><span class="bar-label">'+h(c.category)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+color+'">'+num(c.count)+'</div></div></div>';
  });
  html+='</div></div>';

  // Severity chart
  html+='<div class="chart-box"><h3>Rules by Severity</h3><div class="bar-chart">';
  const sevColors={'critical':'var(--red)','high':'var(--orange)','medium':'var(--yellow)','low':'var(--green)','informational':'var(--blue)'};
  (s.rulesBySeverity||[]).forEach(c=>{
    const pct=Math.round(c.count/maxSev*100);
    const color=sevColors[c.severity]||'var(--dim)';
    html+='<div class="bar-item"><span class="bar-label">'+h(c.severity)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+color+'">'+num(c.count)+'</div></div></div>';
  });
  html+='</div></div>';
  html+='</div>';

  // Ecosystem metrics
  api('/api/metrics').then(function(md){
    if(!md||!md.data)return;
    var m=md.data;
    var eco='<div class="cards" style="margin-bottom:24px">';
    eco+='<div class="card"><div class="label">Total Skills Scanned</div><div class="value blue">'+num(m.totalSkillsScanned||0)+'</div></div>';
    eco+='<div class="card"><div class="label">Agents Protected</div><div class="value green">'+num(m.agentsProtected||0)+'</div></div>';
    eco+='<div class="card"><div class="label">Total Threats Detected</div><div class="value red">'+num(m.totalThreatsDetected||0)+'</div></div>';
    eco+='<div class="card"><div class="label">ATR Rules Active</div><div class="value">'+num(m.atrRulesActive||0)+'</div></div>';
    if(m.sourceBreakdown){
      eco+='<div class="card"><div class="label">Bulk Scans</div><div class="value">'+num(m.sourceBreakdown.bulk||0)+'</div></div>';
      eco+='<div class="card"><div class="label">CLI Scans</div><div class="value">'+num(m.sourceBreakdown.cli||0)+'</div></div>';
      eco+='<div class="card"><div class="label">Web Scans</div><div class="value">'+num(m.sourceBreakdown.web||0)+'</div></div>';
    }
    eco+='</div>';
    var ecoTarget=document.getElementById('ecosystemInsert');
    if(ecoTarget)ecoTarget.innerHTML=eco;
  }).catch(function(){});

  html+='<div id="ecosystemInsert"></div>';

  // MITRE + Attack Types
  html+='<div class="chart-row">';
  html+='<div class="chart-box"><h3>Top Attack Types</h3>';
  if(s.topAttackTypes.length===0)html+='<div class="empty">No threat data yet</div>';
  else{html+='<table><tr><th>Type</th><th>Count</th></tr>';s.topAttackTypes.forEach(t=>{html+='<tr><td>'+h(t.type)+'</td><td>'+num(t.count)+'</td></tr>';});html+='</table>';}
  html+='</div>';
  html+='<div class="chart-box"><h3>Top MITRE Techniques</h3>';
  if(s.topMitreTechniques.length===0)html+='<div class="empty">No threat data yet</div>';
  else{html+='<table><tr><th>Technique</th><th>Count</th></tr>';s.topMitreTechniques.forEach(t=>{html+='<tr><td>'+h(t.technique)+'</td><td>'+num(t.count)+'</td></tr>';});html+='</table>';}
  html+='</div>';
  html+='</div>';

  $('content').innerHTML=html;
}

// Usage
function renderUsage(){
  $('content').innerHTML='<div class="loading">Loading usage data...</div>';
  api('/api/usage').then(function(d){
    var u=d.data||d;
    var html='<div class="cards">';
    html+='<div class="card"><div class="label">Total Scans</div><div class="value blue">'+num(u.totalScans||0)+'</div></div>';
    html+='<div class="card"><div class="label">Scans Today</div><div class="value green">'+num(u.scansToday||0)+'</div></div>';
    html+='<div class="card"><div class="label">Scans This Week</div><div class="value orange">'+num(u.scansThisWeek||0)+'</div></div>';
    html+='<div class="card"><div class="label">CLI Installs</div><div class="value">'+num(u.cliInstalls||0)+'</div></div>';
    html+='</div>';

    // Source breakdown bar chart
    var sources=u.scansBySource||{};
    var srcKeys=Object.keys(sources);
    var maxSrc=Math.max.apply(null,srcKeys.map(function(k){return sources[k]||0}).concat([1]));
    var srcColors={'website':'var(--blue)','cli-user':'var(--green)','bulk-pipeline':'var(--orange)'};
    html+='<div class="chart-row">';
    html+='<div class="chart-box"><h3>Scans by Source</h3><div class="bar-chart">';
    srcKeys.forEach(function(k){
      var pct=Math.round((sources[k]||0)/maxSrc*100);
      var color=srcColors[k]||'var(--accent)';
      html+='<div class="bar-item"><span class="bar-label">'+h(k)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+color+'">'+num(sources[k])+'</div></div></div>';
    });
    html+='</div></div>';

    // 30-day daily trend
    var trend=u.dailyTrend||[];
    var maxDay=Math.max.apply(null,trend.map(function(t){return t.count||0}).concat([1]));
    html+='<div class="chart-box"><h3>30-Day Daily Trend</h3><div class="bar-chart">';
    trend.forEach(function(t){
      var pct=Math.round((t.count||0)/maxDay*100);
      html+='<div class="bar-item"><span class="bar-label">'+h(t.date)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:var(--accent)">'+num(t.count)+'</div></div></div>';
    });
    html+='</div></div>';
    html+='</div>';

    $('content').innerHTML=html;
  }).catch(function(){
    $('content').innerHTML='<div class="empty">Usage endpoint not available. Upgrade server to enable.</div>';
  });
}

// Rules
let rulesPage=0;const RULES_PER_PAGE=50;let rulesFilter={search:'',source:'',category:'',severity:''};
function renderRules(){
  $('content').innerHTML='<div class="loading">Loading rules...</div>';
  let url='/api/rules?limit=5000';
  api(url).then(d=>{
    const allRules=d.data||[];
    const filtered=allRules.filter(r=>{
      if(rulesFilter.source&&r.source!==rulesFilter.source)return false;
      if(rulesFilter.category&&r.category!==rulesFilter.category)return false;
      if(rulesFilter.severity&&r.severity!==rulesFilter.severity)return false;
      if(rulesFilter.search){
        const q=rulesFilter.search.toLowerCase();
        return (r.ruleId||'').toLowerCase().includes(q)||(r.ruleContent||'').toLowerCase().includes(q);
      }
      return true;
    });
    const total=filtered.length;
    const pages=Math.ceil(total/RULES_PER_PAGE);
    if(rulesPage>=pages)rulesPage=Math.max(0,pages-1);
    const slice=filtered.slice(rulesPage*RULES_PER_PAGE,(rulesPage+1)*RULES_PER_PAGE);

    let html='<div class="table-wrap"><div class="table-header"><h2>Rules ('+num(total)+' of '+num(allRules.length)+')</h2>';
    html+='<div class="controls">';
    html+='<input type="text" placeholder="Search..." value="'+h(rulesFilter.search)+'" onchange="rulesFilter.search=this.value;rulesPage=0;renderRules()"/>';
    html+='<select onchange="rulesFilter.source=this.value;rulesPage=0;renderRules()"><option value="">All Sources</option><option value="atr"'+(rulesFilter.source==='atr'?' selected':'')+'>ATR</option></select>';
    html+='<select onchange="rulesFilter.severity=this.value;rulesPage=0;renderRules()"><option value="">All Severity</option><option value="critical"'+(rulesFilter.severity==='critical'?' selected':'')+'>Critical</option><option value="high"'+(rulesFilter.severity==='high'?' selected':'')+'>High</option><option value="medium"'+(rulesFilter.severity==='medium'?' selected':'')+'>Medium</option><option value="low"'+(rulesFilter.severity==='low'?' selected':'')+'>Low</option></select>';
    html+='</div></div>';
    html+='<table><tr><th>Rule ID</th><th>Source</th><th>Category</th><th>Severity</th><th>Published</th></tr>';
    slice.forEach(r=>{
      html+='<tr><td title="'+h(r.ruleId)+'">'+h((r.ruleId||'').slice(0,60))+'</td>';
      html+='<td>'+sourceBadge(r.source||'unknown')+'</td>';
      html+='<td>'+h(r.category||'unknown')+'</td>';
      html+='<td>'+severityBadge(r.severity||'unknown')+'</td>';
      html+='<td>'+timeAgo(r.publishedAt)+'</td></tr>';
    });
    html+='</table>';
    html+='<div class="pagination">';
    html+='<button onclick="rulesPage=0;renderRules()" '+(rulesPage===0?'disabled':'')+'>First</button>';
    html+='<button onclick="rulesPage--;renderRules()" '+(rulesPage===0?'disabled':'')+'>Prev</button>';
    html+='<span>Page '+(rulesPage+1)+' of '+Math.max(1,pages)+'</span>';
    html+='<button onclick="rulesPage++;renderRules()" '+(rulesPage>=pages-1?'disabled':'')+'>Next</button>';
    html+='<button onclick="rulesPage='+(pages-1)+';renderRules()" '+(rulesPage>=pages-1?'disabled':'')+'>Last</button>';
    html+='</div></div>';
    $('content').innerHTML=html;
  });
}

// Threats (paginated via GET /api/threats)
let threatsPage=1;
function renderThreats(){
  $('content').innerHTML='<div class="loading">Loading threats...</div>';
  Promise.all([api('/api/threats?page='+threatsPage+'&limit=50'),api('/api/stats')]).then(([td,sd])=>{
    const threats=td.data||[];
    const meta=td.meta||{total:0,page:1,pages:1};
    const s=sd.data;
    let html='<div class="cards">';
    html+='<div class="card"><div class="label">Total Threats</div><div class="value blue">'+num(s.totalThreats)+'</div></div>';
    html+='<div class="card"><div class="label">Last 24h</div><div class="value orange">'+num(s.last24hThreats)+'</div></div>';
    html+='</div>';
    html+='<div class="chart-row">';
    html+='<div class="chart-box"><h3>Attack Types</h3>';
    if(!s.topAttackTypes.length)html+='<div class="empty">No threat data yet.</div>';
    else{html+='<table><tr><th>Type</th><th>Count</th></tr>';s.topAttackTypes.forEach(t=>{html+='<tr><td>'+h(t.type)+'</td><td>'+num(t.count)+'</td></tr>';});html+='</table>';}
    html+='</div>';
    html+='<div class="chart-box"><h3>MITRE Techniques</h3>';
    if(!s.topMitreTechniques.length)html+='<div class="empty">No MITRE data yet.</div>';
    else{html+='<table><tr><th>Technique</th><th>Count</th></tr>';s.topMitreTechniques.forEach(t=>{html+='<tr><td><a href="https://attack.mitre.org/techniques/'+h(t.technique).replace('.','/')+'" target="_blank">'+h(t.technique)+'</a></td><td>'+num(t.count)+'</td></tr>';});html+='</table>';}
    html+='</div></div>';
    // Threat events table
    html+='<div class="table-wrap"><div class="table-header"><h2>Threat Events ('+num(meta.total)+')</h2></div>';
    if(!threats.length){html+='<div class="empty">No threat events collected yet. Threats are submitted by Guard instances.</div>';}
    else{
      html+='<table><tr><th>Source IP</th><th>Attack Type</th><th>MITRE</th><th>Rule Matched</th><th>Region</th><th>Time</th></tr>';
      threats.forEach(t=>{
        html+='<tr><td>'+h(t.attack_source_ip)+'</td>';
        html+='<td>'+h(t.attack_type)+'</td>';
        html+='<td>'+h(t.mitre_technique)+'</td>';
        html+='<td title="'+h(t.sigma_rule_matched)+'">'+h((t.sigma_rule_matched||'').slice(0,30))+'</td>';
        html+='<td>'+h(t.region||'-')+'</td>';
        html+='<td>'+timeAgo(t.timestamp)+'</td></tr>';
      });
      html+='</table>';
      html+='<div class="pagination">';
      html+='<button onclick="threatsPage=1;renderThreats()" '+(meta.page<=1?'disabled':'')+'>First</button>';
      html+='<button onclick="threatsPage--;renderThreats()" '+(meta.page<=1?'disabled':'')+'>Prev</button>';
      html+='<span>Page '+meta.page+' of '+meta.pages+'</span>';
      html+='<button onclick="threatsPage++;renderThreats()" '+(meta.page>=meta.pages?'disabled':'')+'>Next</button>';
      html+='<button onclick="threatsPage='+meta.pages+';renderThreats()" '+(meta.page>=meta.pages?'disabled':'')+'>Last</button>';
      html+='</div>';
    }
    html+='</div>';
    $('content').innerHTML=html;
  });
}

// ATR Proposals
function renderProposals(){
  $('content').innerHTML='<div class="loading">Loading proposals...</div>';
  api('/api/atr-proposals').then(d=>{
    const proposals=d.data||[];
    let html='<div class="table-wrap"><div class="table-header"><h2>ATR Proposals ('+proposals.length+')</h2></div>';
    if(!proposals.length){html+='<div class="empty">No ATR proposals submitted yet. Proposals are auto-generated when Guard detects new threat patterns.</div>';}
    else{
      html+='<table><tr><th>Pattern Hash</th><th>Status</th><th>Confirmations</th><th>LLM Verdict</th><th>Submitted</th><th>Actions</th></tr>';
      proposals.forEach(function(p,idx){
        const status=p.status||p.llm_verdict||'pending';
        const cls=status==='approved'?'low':status==='rejected'?'critical':'medium';
        html+='<tr style="cursor:pointer" onclick="var el=document.getElementById(\\'proposal-detail-'+idx+'\\');el.style.display=el.style.display===\\'none\\'?\\'table-row\\':\\'none\\'">';
        html+='<td title="'+h(p.pattern_hash)+'">'+h((p.pattern_hash||'').slice(0,16))+'...</td>';
        html+='<td>'+badge(status,cls)+'</td>';
        html+='<td>'+num(p.confirmation_count||0)+'</td>';
        html+='<td>'+(p.llm_verdict?badge(p.llm_verdict,p.llm_verdict==='approve'?'low':'critical'):'<span style="color:var(--dim)">pending</span>')+'</td>';
        html+='<td>'+timeAgo(p.created_at)+'</td>';
        html+='<td><button style="padding:4px 10px;background:var(--green);color:var(--bg);border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;margin-right:4px" onclick="event.stopPropagation();approveProposal(\\''+h(p.pattern_hash)+'\\')">Approve</button>';
        html+='<button style="padding:4px 10px;background:var(--red);color:var(--bg);border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600" onclick="event.stopPropagation();rejectProposal(\\''+h(p.pattern_hash)+'\\')">Reject</button></td>';
        html+='</tr>';
        html+='<tr id="proposal-detail-'+idx+'" style="display:none"><td colspan="6"><pre style="background:var(--bg);padding:12px;border-radius:6px;overflow-x:auto;font-size:12px;white-space:pre-wrap;max-height:300px;overflow-y:auto">'+h(p.rule_content||p.ruleContent||p.pattern||'No rule content available')+'</pre></td></tr>';
      });
      html+='</table>';
    }
    html+='</div>';
    $('content').innerHTML=html;
  }).catch(()=>{
    $('content').innerHTML='<div class="empty">Cannot load proposals. Admin auth may be required for this endpoint.</div>';
  });
}
function approveProposal(hash){
  apiPatch('/api/atr-proposals',{patternHash:hash,action:'approve'}).then(function(){renderProposals();}).catch(function(){alert('Failed to approve proposal');});
}
function rejectProposal(hash){
  apiPatch('/api/atr-proposals',{patternHash:hash,action:'reject'}).then(function(){renderProposals();}).catch(function(){alert('Failed to reject proposal');});
}

// Skill Threats
function renderSkills(){
  $('content').innerHTML='<div class="loading">Loading skill threats...</div>';
  api('/api/skill-threats?limit=200').then(d=>{
    const threats=d.data||[];
    let html='<div class="table-wrap"><div class="table-header"><h2>Skill Threats ('+threats.length+')</h2></div>';
    if(!threats.length){html+='<div class="empty">No skill threats reported yet. Skill threats are submitted when Guard audits a new MCP skill installation.</div>';}
    else{
      html+='<table><tr><th>Skill Name</th><th>Risk Score</th><th>Risk Level</th><th>Skill Hash</th><th>Reported</th></tr>';
      threats.forEach(t=>{
        const cls=(t.risk_level||'').toLowerCase();
        html+='<tr><td>'+h(t.skill_name)+'</td>';
        html+='<td>'+num(t.risk_score)+'</td>';
        html+='<td>'+severityBadge(t.risk_level)+'</td>';
        html+='<td title="'+h(t.skill_hash)+'">'+h((t.skill_hash||'').slice(0,12))+'...</td>';
        html+='<td>'+timeAgo(t.created_at)+'</td></tr>';
      });
      html+='</table>';
    }
    html+='</div>';
    $('content').innerHTML=html;
  }).catch(()=>{
    $('content').innerHTML='<div class="empty">Cannot load skill threats. Admin auth required.</div>';
  });
}

// Blacklist
function renderBlacklist(){
  $('content').innerHTML='<div class="loading">Loading blacklist...</div>';
  api('/api/skill-blacklist').then(d=>{
    const list=d.data||[];
    let html='<div class="table-wrap"><div class="table-header"><h2>Community Blacklist ('+list.length+')</h2></div>';
    html+='<div style="padding:16px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
    html+='<input type="text" id="blSkillName" placeholder="Skill name" style="padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;flex:1;min-width:160px"/>';
    html+='<input type="text" id="blReason" placeholder="Reason" style="padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;flex:1;min-width:160px"/>';
    html+='<button onclick="addToBlacklist()" style="padding:6px 14px;background:var(--red);color:var(--bg);border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">Block</button>';
    html+='</div>';
    if(!list.length){html+='<div class="empty">No blacklisted skills yet. Skills are blacklisted when 3+ distinct clients report avg risk >= 70.</div>';}
    else{
      html+='<table><tr><th>Skill Name</th><th>Avg Risk</th><th>Max Level</th><th>Reports</th><th>First Seen</th><th>Last Seen</th><th>Actions</th></tr>';
      list.forEach(s=>{
        html+='<tr><td>'+h(s.skillName)+'</td>';
        html+='<td>'+num(s.avgRiskScore)+'</td>';
        html+='<td>'+severityBadge(s.maxRiskLevel)+'</td>';
        html+='<td>'+num(s.reportCount)+'</td>';
        html+='<td>'+timeAgo(s.firstReported)+'</td>';
        html+='<td>'+timeAgo(s.lastReported)+'</td>';
        html+='<td><button style="padding:4px 10px;background:var(--red);color:var(--bg);border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600" onclick="removeFromBlacklist(\\''+h(s.skillHash||s.skill_hash||'')+'\\')">&times; Remove</button></td></tr>';
      });
      html+='</table>';
    }
    html+='</div>';
    $('content').innerHTML=html;
  });
}

function addToBlacklist(){
  var name=(document.getElementById('blSkillName')||{}).value||'';
  var reason=(document.getElementById('blReason')||{}).value||'';
  if(!name.trim()){alert('Skill name is required');return;}
  apiPost('/api/skill-blacklist',{skillName:name.trim(),reason:reason.trim()}).then(function(){renderBlacklist();}).catch(function(){alert('Failed to add to blacklist');});
}
function removeFromBlacklist(hash){
  if(!confirm('Remove this skill from the blacklist?'))return;
  apiDelete('/api/skill-blacklist',{skillHash:hash}).then(function(){renderBlacklist();}).catch(function(){alert('Failed to remove from blacklist');});
}

// Feeds
function renderFeeds(){
  Promise.all([
    apiText('/api/feeds/ip-blocklist'),
    apiText('/api/feeds/domain-blocklist'),
    api('/api/skill-whitelist/all')
  ]).then(([ips,domains,wl])=>{
    const ipList=(ips||'').trim().split('\\n').filter(Boolean);
    const domList=(domains||'').trim().split('\\n').filter(Boolean);
    const whiteList=(wl.data||[]);

    let html='<div class="cards">';
    html+='<div class="card"><div class="label">IP Blocklist</div><div class="value red">'+num(ipList.length)+'</div></div>';
    html+='<div class="card"><div class="label">Domain Blocklist</div><div class="value orange">'+num(domList.length)+'</div></div>';
    html+='<div class="card"><div class="label">Skill Whitelist</div><div class="value green">'+num(whiteList.length)+'</div></div>';
    html+='</div>';

    html+='<div class="chart-row">';
    // IP Blocklist
    html+='<div class="chart-box"><h3>IP Blocklist</h3>';
    if(!ipList.length)html+='<div class="empty">No blocked IPs yet.</div>';
    else{html+='<table><tr><th>IP Address</th></tr>';ipList.slice(0,50).forEach(ip=>{html+='<tr><td>'+h(ip)+'</td></tr>';});if(ipList.length>50)html+='<tr><td style="color:var(--dim)">...and '+(ipList.length-50)+' more</td></tr>';html+='</table>';}
    html+='</div>';
    // Domain Blocklist
    html+='<div class="chart-box"><h3>Domain Blocklist</h3>';
    if(!domList.length)html+='<div class="empty">No blocked domains yet.</div>';
    else{html+='<table><tr><th>Domain</th></tr>';domList.slice(0,50).forEach(d=>{html+='<tr><td>'+h(d)+'</td></tr>';});if(domList.length>50)html+='<tr><td style="color:var(--dim)">...and '+(domList.length-50)+' more</td></tr>';html+='</table>';}
    html+='</div></div>';

    // Skill Whitelist
    html+='<div class="table-wrap"><div class="table-header"><h2>Community Skill Whitelist ('+whiteList.length+')</h2></div>';
    html+='<div style="padding:16px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center">';
    html+='<input type="text" id="wlSkillName" placeholder="Skill name to whitelist" style="padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;flex:1;min-width:200px"/>';
    html+='<button onclick="addToWhitelist()" style="padding:6px 14px;background:var(--green);color:var(--bg);border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">Add</button>';
    html+='</div>';
    if(!whiteList.length){html+='<div class="empty">No whitelisted skills yet.</div>';}
    else{
      html+='<table><tr><th>Skill Name</th><th>Reports</th><th>Fingerprint</th><th>Actions</th></tr>';
      whiteList.forEach(s=>{
        var sName=s.skill_name||s.skillName||'';
        html+='<tr><td>'+h(sName)+'</td>';
        html+='<td>'+num(s.report_count||s.reportCount||0)+'</td>';
        html+='<td title="'+h(s.fingerprint_hash||'')+'">'+h((s.fingerprint_hash||'-').slice(0,16))+'</td>';
        html+='<td><button style="padding:4px 10px;background:var(--red);color:var(--bg);border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600" onclick="removeFromWhitelist(\\''+h(sName)+'\\')">&times; Remove</button></td></tr>';
      });
      html+='</table>';
    }
    html+='</div>';

    $('content').innerHTML=html;
  });
}

function addToWhitelist(){
  var name=(document.getElementById('wlSkillName')||{}).value||'';
  if(!name.trim()){alert('Skill name is required');return;}
  apiPost('/api/skill-whitelist',{skillName:name.trim()}).then(function(){renderFeeds();}).catch(function(){alert('Failed to add to whitelist');});
}
function removeFromWhitelist(name){
  if(!confirm('Remove "'+name+'" from the whitelist?'))return;
  apiDelete('/api/skill-whitelist',{skillName:name}).then(function(){renderFeeds();}).catch(function(){alert('Failed to remove from whitelist');});
}

// Audit Log
let auditPage=1;
function renderAuditLog(){
  $('content').innerHTML='<div class="loading">Loading audit log...</div>';
  api('/api/audit-log?page='+auditPage+'&limit=50').then(d=>{
    const entries=d.data||[];
    const meta=d.meta||{total:0,page:1,pages:1};
    let html='<div class="table-wrap"><div class="table-header"><h2>Audit Log ('+num(meta.total)+')</h2></div>';
    if(!entries.length){html+='<div class="empty">No audit entries yet. Actions are logged as they occur.</div>';}
    else{
      html+='<table><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Resource ID</th><th>IP</th></tr>';
      entries.forEach(e=>{
        const actionCls=e.action.includes('delete')||e.action.includes('reject')?'critical':e.action.includes('create')||e.action.includes('approve')?'low':'medium';
        html+='<tr><td>'+timeAgo(e.timestamp)+'</td>';
        html+='<td>'+h((e.actor||'').slice(0,12))+'</td>';
        html+='<td>'+badge(e.action,actionCls)+'</td>';
        html+='<td>'+h(e.resource_type||'-')+'</td>';
        html+='<td title="'+h(e.resource_id||'')+'">'+h((e.resource_id||'-').slice(0,20))+'</td>';
        html+='<td>'+h(e.ip_address||'-')+'</td></tr>';
      });
      html+='</table>';
      if(meta.pages>1){
        html+='<div class="pagination">';
        html+='<button onclick="auditPage=1;renderAuditLog()" '+(meta.page<=1?'disabled':'')+'>First</button>';
        html+='<button onclick="auditPage--;renderAuditLog()" '+(meta.page<=1?'disabled':'')+'>Prev</button>';
        html+='<span>Page '+meta.page+' of '+meta.pages+'</span>';
        html+='<button onclick="auditPage++;renderAuditLog()" '+(meta.page>=meta.pages?'disabled':'')+'>Next</button>';
        html+='<button onclick="auditPage='+meta.pages+';renderAuditLog()" '+(meta.page>=meta.pages?'disabled':'')+'>Last</button>';
        html+='</div>';
      }
    }
    html+='</div>';
    $('content').innerHTML=html;
  }).catch(()=>{
    $('content').innerHTML='<div class="empty">Audit log endpoint not available. Upgrade server to enable.</div>';
  });
}
</script>
</body>
</html>`;
}
