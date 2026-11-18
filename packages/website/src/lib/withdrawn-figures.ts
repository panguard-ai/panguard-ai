import { STATS } from './stats';

/**
 * Figures ATR has since withdrawn or narrowed. Published writing keeps its
 * original text; anything that quotes one of these carries a dated correction
 * (blog posts on their page, blog excerpts in public/llms-full.txt).
 */
export interface Correction {
  readonly id: 'benchmarks' | 'wild-scan';
  readonly pattern: RegExp;
  readonly en: string;
  readonly zh: string;
}

export const CORRECTION_DATE = '2026-10-16';

const WS = STATS.wildScan;
const SCANNED = WS.skillsScanned.toLocaleString('en-US');
const FLAGGED = WS.flagged.toLocaleString('en-US');
const SUBSET = WS.fourRegistrySubset.toLocaleString('en-US');

export const CORRECTIONS: readonly Correction[] = [
  {
    id: 'benchmarks',
    pattern:
      /65,000|65K benign|0\.24%|0\.48% FP|0\.2% (?:FP|false|誤報)|0\.20% FP|97% precision|97\.1%|97\.2%/,
    en: 'Some benchmark figures in this post have since been withdrawn or superseded. The lane-based false-positive rates on a "65,000-sample benign gate" (about 0.24% enforce, about 9% hunt) were withdrawn on 2026-09-19: the sample count was mislabelled, the benign corpus contained real jailbreak samples until 2026-08-04, and the hunt figure cannot be reproduced. The SKILL.md precision and false-positive figures quoted here are no longer cited: they were measured in-sample, on the benign set the rules are tuned against. Recall figures are hunt-lane, and the garak figures are partly closed-book.',
    zh: '本文的部分 benchmark 數字已撤回或被取代。以「65,000 筆 benign gate」為名的分 lane 誤報率（enforce 約 0.24%、hunt 約 9%）已於 2026-09-19 撤回：樣本數標示錯誤、benign 語料在 2026-08-04 前混有真實越獄樣本，而 hunt 數字無法重現。文中的 SKILL.md precision 與誤報率已不再對外引用：它們是樣本內數字，量測用的 benign 集合就是規則調校用的那一組。recall 都是 hunt lane 數字，garak 數字部分是 closed-book。',
  },
  {
    id: 'wild-scan',
    pattern: /96[,_]?096|96[Kk]\b|\b751\b|\b552\b|\b703\b|1,302|confirmed[ -]malic|確認惡意/,
    en: `The wild-scan figures in this post are corrected. The scan record supports two numbers: ${SCANNED} skills and MCP servers scanned and ${FLAGGED} flagged, by scan engine ${WS.engineVersion} (${WS.engineRules} ATR rules) on ${WS.scannedOn}. ${SUBSET} is the four SKILL.md registries without the MCP server crawl, and 1,302 is the flag total of a separate 2026-04-14 report that does not reconcile with this record. Every confirmed-malicious count is withdrawn: 751 is a filtered flag count for one registry (OpenClaw), 703 adds up three publishers' listings, and 552 is two accounts' flagged files, marked malicious by account rather than file by file. The record keeps paths and rule ids, not file contents, so the scan cannot be re-run.`,
    zh: `本文的野外掃描數字已更正。掃描紀錄只支撐兩個數：${WS.scannedOn} 以掃描引擎 ${WS.engineVersion}（${WS.engineRules} 條 ATR 規則）掃描 ${SCANNED} 個 skill 與 MCP server、標記 ${FLAGGED} 個。${SUBSET} 是不含 MCP server 爬取資料的四個 SKILL.md registry；1,302 是另一份 2026-04-14 報告的標記總數，與這份紀錄對不上。所有「確認惡意」數字一律撤回：751 是單一 registry（OpenClaw）篩選後的標記數，703 是三個發布帳號的上架數加總，552 是兩個帳號被標記的檔案，以帳號整批認定，並非逐一檢查。紀錄只保留路徑與規則 ID，沒有檔案內容，因此無法重跑。`,
  },
];

/** The corrections that apply to any of `texts`, in CORRECTIONS order. */
export function correctionsFor(texts: readonly string[]): Correction[] {
  return CORRECTIONS.filter((correction) => texts.some((text) => correction.pattern.test(text)));
}
