#!/usr/bin/env npx tsx
/**
 * Parallel ClawHub scan — 5 concurrent downloads, same scan logic.
 * ~4x faster than sequential.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const DOWNLOAD_API = 'https://wry-manatee-359.convex.site/api/v1/download';
const TC_ENDPOINT = 'https://tc.panguard.ai';
const OUTPUT_DIR = '/Users/user/Downloads/agent-threat-rules/data/clawhub-scan';
const CONCURRENCY = 5;

const args = process.argv.slice(2);
const startIdx = parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1] || '17000');
const batchSize = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '500');

interface Result {
  author: string; name: string; downloads: number;
  riskScore: number; riskLevel: string; findingCount: number;
  findings: Array<{id:string;severity:string;title:string;category:string}>;
  scannedAt: string; error?: string;
}

function mkR(a:string,n:string,d:number,s:number,l:string,e?:string): Result {
  return {author:a,name:n,downloads:d,riskScore:s,riskLevel:l,findingCount:0,findings:[],scannedAt:new Date().toISOString(),error:e};
}

async function scanOne(slug:string, author:string, downloads:number, scanFn:any, rules:any, workId:number): Promise<Result> {
  const wd = `/tmp/claw-work-${workId}`;
  if (existsSync(wd)) rmSync(wd, {recursive:true,force:true});
  mkdirSync(wd, {recursive:true});
  try {
    const res = await fetch(`${DOWNLOAD_API}?slug=${encodeURIComponent(slug)}`, {signal:AbortSignal.timeout(15000)});
    if (!res.ok) return mkR(author,slug,downloads,-1,'NO_CONTENT','Download failed');
    writeFileSync(join(wd,'s.zip'), Buffer.from(await res.arrayBuffer()));
    mkdirSync(join(wd,'ex'), {recursive:true});
    try { execSync(`unzip -q -o "${join(wd,'s.zip')}" -d "${join(wd,'ex')}" 2>/dev/null`, {timeout:5000}); } catch { return mkR(author,slug,downloads,-1,'NO_CONTENT','Unzip failed'); }
    const sm = join(wd,'ex','SKILL.md');
    if (!existsSync(sm)) return mkR(author,slug,downloads,-1,'NO_CONTENT','No SKILL.md');
    const content = readFileSync(sm,'utf-8');
    const r = scanFn(content, {sourceType:'skill', atrRules:rules, skillName:`${author}/${slug}`});
    return {
      author, name:slug, downloads, riskScore:r.riskScore, riskLevel:r.riskLevel,
      findingCount:r.findings.length,
      findings:r.findings.slice(0,8).map((f:any)=>({id:f.id,severity:f.severity,title:f.title,category:f.category||'atr'})),
      scannedAt:new Date().toISOString(),
    };
  } catch(err) { return mkR(author,slug,downloads,-1,'ERROR',String(err)); }
  finally { if (existsSync(wd)) rmSync(wd, {recursive:true,force:true}); }
}

async function pushTC(results: Result[]) {
  let t=0, w=0;
  const promises: Promise<void>[] = [];
  for (const r of results) {
    if (r.riskScore < 0) continue;
    const sn = `${r.author}/${r.name}`;
    if (r.riskLevel==='CRITICAL'||r.riskLevel==='HIGH') {
      promises.push(fetch(`${TC_ENDPOINT}/api/skill-threats`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({skillHash:createHash('sha256').update(sn).digest('hex').slice(0,16),skillName:sn,riskScore:r.riskScore,riskLevel:r.riskLevel,findingSummaries:r.findings.map(f=>f.id).join(','),clientId:'bulk-pipeline'}),signal:AbortSignal.timeout(5000)}).then(()=>{}).catch(()=>{}));
      t++;
    } else if (r.riskLevel==='LOW') {
      promises.push(fetch(`${TC_ENDPOINT}/api/skill-whitelist`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({skillName:sn}),signal:AbortSignal.timeout(3000)}).then(()=>{}).catch(()=>{}));
      w++;
    }
    promises.push(fetch(`${TC_ENDPOINT}/api/usage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_type:'scan',source:'bulk-pipeline',metadata:{skill:sn,risk:r.riskLevel}}),signal:AbortSignal.timeout(3000)}).then(()=>{}).catch(()=>{}));
  }
  await Promise.allSettled(promises);
  return {threats:t, whitelist:w};
}

async function main() {
  const registry = JSON.parse(readFileSync(join(OUTPUT_DIR,'clawhub-registry.json'),'utf-8'));
  const total = registry.length;

  // Load existing for dedup
  const allResults: Result[] = [];
  for (const f of ['scan-1000.json','scan-10000.json']) {
    const p = join(OUTPUT_DIR, f);
    if (existsSync(p)) { allResults.push(...(JSON.parse(readFileSync(p,'utf-8')).results||[])); }
  }
  // Also load checkpoints > 10000
  const {readdirSync} = await import('node:fs');
  for (const f of readdirSync(OUTPUT_DIR).filter(f=>f.startsWith('scan-checkpoint-')).sort()) {
    const idx = parseInt(f.replace('scan-checkpoint-','').replace('.json',''));
    if (idx >= 10000) {
      allResults.push(...(JSON.parse(readFileSync(join(OUTPUT_DIR,f),'utf-8')).results||[]));
    }
  }
  const scannedSlugs = new Set(allResults.map(r=>r.name));

  const {scanContent, compileRules} = await import('@panguard-ai/scan-core');
  const atrRules = compileRules(JSON.parse(readFileSync(join(process.cwd(),'packages/website/src/lib/atr-rules-compiled.json'),'utf-8')));

  const byLevel: Record<string,number> = {};
  for (const r of allResults) if (r.riskScore>=0) byLevel[r.riskLevel]=(byLevel[r.riskLevel]||0)+1;

  console.log(`\nParallel scan (${CONCURRENCY}x) from ${startIdx}, ${atrRules.length} rules`);
  console.log(`Already: ${scannedSlugs.size} | Registry: ${total}\n`);

  let totalT=0, totalW=0, batchNum=0;

  for (let i=startIdx; i<total; i+=batchSize) {
    batchNum++;
    const batch = registry.slice(i, i+batchSize).filter((s:any)=>!scannedSlugs.has(s.name));
    const batchResults: Result[] = [];

    // Process in chunks of CONCURRENCY
    for (let j=0; j<batch.length; j+=CONCURRENCY) {
      const chunk = batch.slice(j, j+CONCURRENCY);
      const pct = Math.round((i+j+chunk.length)/total*100);
      process.stdout.write(`\r  [${pct}%] ${i+j+chunk.length}/${total}`.padEnd(40));

      const results = await Promise.all(
        chunk.map((s:any, idx:number) => scanOne(s.name, s.author, s.downloads, scanContent, atrRules, idx))
      );
      for (const r of results) {
        batchResults.push(r);
        allResults.push(r);
        scannedSlugs.add(r.name);
        if (r.riskScore>=0) byLevel[r.riskLevel]=(byLevel[r.riskLevel]||0)+1;
      }
    }

    // Checkpoint
    writeFileSync(join(OUTPUT_DIR,`scan-checkpoint-${i}.json`), JSON.stringify({
      scanDate:new Date().toISOString(), batch:batchNum, startIdx:i,
      scannedSoFar:allResults.length, summary:byLevel, results:batchResults,
    },null,2));

    const tc = await pushTC(batchResults);
    totalT+=tc.threats; totalW+=tc.whitelist;

    const bs: Record<string,number> = {};
    for (const r of batchResults) if (r.riskScore>=0) bs[r.riskLevel]=(bs[r.riskLevel]||0)+1;
    process.stdout.write('\r'.padEnd(80)+'\r');
    console.log(`  Batch ${batchNum} (${i}): ${batchResults.length} new | ${JSON.stringify(bs)} | TC: ${tc.threats}T ${tc.whitelist}W`);
  }

  // Final
  const fp = join(OUTPUT_DIR,'scan-full.json');
  writeFileSync(fp, JSON.stringify({scanDate:new Date().toISOString(),engine:'ATR v1.4.0',atrRules:atrRules.length,total:allResults.length,summary:byLevel,tcPushed:{threats:totalT,whitelist:totalW},results:allResults},null,2));
  console.log(`\nDone. ${allResults.length} total. ${JSON.stringify(byLevel)}`);
  console.log(`TC: ${totalT}T ${totalW}W | File: ${fp}`);
}

main().catch(e=>{console.error('Fatal:',e);process.exit(1)});
