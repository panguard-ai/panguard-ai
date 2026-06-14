# PanGuard Community — UX 重新設計(從第一性原理 + 心理學)

2026-06-13。目標:把免費社群版的「實際用起來」設計到 GA 等級。基於現有 `DESIGN.md`(視覺語言:沉穩權威、sage green、mission-control,不變),重新思考**體驗與情境**。實跑 `pga up` 後發現的病灶已記在下方,逐情境重設計。

---

## 第一部分:開發者資安工具的 UX 心理學(設計憲法)

工具的對象是**忙、懷疑、怕被打擾的開發者**。違反這幾條,工具被刪:

1. **Calm > Alarm(沉穩勝過警報)** — alarm fatigue 是資安工具頭號死因。**95% 的時間顯示「你是安全的」(綠),只有真威脅才升級**。滿屏紅 = 被當狼來了 = 關掉。DESIGN.md 已對(「calm authority」),要貫徹到每個情境。
2. **Trust through transparency(透明建立信任)** — 開發者不信黑箱。每個動作講「我做了什麼、為什麼、證據(rule ID + 信心)」。尤其遙測:**先講「什麼都不會離開你的機器,除非你同意」**,再問。
3. **Competence in the first 60 seconds(60 秒證明能力)** — 裝完立刻有可見價值(偵測到平台、掃出結果、給出「你被保護了」)。慢或卡 = 不專業 = 不信任。
4. **Ambient, not interrupting(環境感,不打擾)** — 平時近乎隱形(一行安靜狀態),只在「真的抓到」才現身。尊重開發者的注意力流。
5. **Agency stays with the user(主導權在用戶)** — 預設只告警不阻擋;要阻擋(可能擋到正常流量)必須用戶明確開。工具不擅自接管。
6. **Earn the right to block(用學習換取阻擋權)** — 先在「學習模式」證明不誤報,才建議升級到阻擋。降低「它會不會擋到我」的恐懼。
7. **The catch is the conversion(抓到的那刻就是忠誠轉化點)** — 第一次抓到真攻擊 = 「它真的有用」的情緒高點。這一刻的呈現要乾淨、有說服力、可行動。

語言原則:不用「Injecting / 注入」(侵入感)→ 用「Watching / 守護」。不用 jargon symbol(`[#]`)→ 用清楚的 `✓ ⚠ →`。一律 builder voice、短句、不嚇人。

---

## 第二部分:現況病灶(實跑 `pga up` 發現)

| 病灶 | 心理學問題 | 修法方向 |
|---|---|---|
| `[~]` `[#]` `[!]` 符號 | 要解碼,增加認知負擔 | 換 `✓ ⚠ →` + 一行人話 |
| 「Injecting runtime protection」 | 「注入」=侵入感、恐懼 | 「Watching your agents / 守護你的 agent」 |
| 「No new servers to proxy」 | 非結果,讀起來像沒事發生 | 「9 tools already protected ✓」正向陳述 |
| 17 skill 逐一 audit 卡住 | 第一次就等,違反 60 秒見效 | 背景非同步 audit,先給「你被保護了」 |
| 沒有「✓ 你被保護了」收尾 | 缺 payoff,不知道好了沒 | 明確 hero 狀態收尾 |
| 沒問遙測同意 | 預設開=信任風險 | opt-in [y/N] 預設 No + 講清楚傳什麼 |
| 沒講保護是什麼/規則數 | 不懂價值 | 「642 rules watching」surfacing 價值 |

---

## 第三部分:六情境逐一重新設計(實際長怎樣)

### 情境 1 — 第一次安裝(`pga up`)：60 秒從懷疑到安心
心理弧線:懷疑 → 好奇(它懂我的環境)→ 信任(透明)→ 安心(明確被保護)。

```
  PanGuard            AI agent security · 642 rules · MIT · open source

  Looking at your setup…
    ✓ 9 AI tools found   Claude Code · Cursor · Codex · Gemini CLI · +5
    ✓ 142 skills installed

  Checking skills against 642 threat rules…
    ✓ 125 clean
    ⚠ 17 unchecked       checking in background — you don't have to wait

  ───────────────────────────────────────────────
   ✓  You're protected
      PanGuard is watching 9 tools for prompt injection, tool abuse,
      data exfiltration, and malicious skills — using 642 open rules.
      Detection only. Nothing is blocked unless you turn it on.
      Nothing leaves your machine unless you allow it.

   Dashboard → http://localhost:7777      Status → pga status
  ───────────────────────────────────────────────

   Help the commons? Share anonymized threat signatures so new attacks
   become rules for everyone. Hashes only — never your prompts or data.
   Enable anonymous sharing? [y/N]    (change anytime: pga config telemetry)
```
重點:平台自偵(懂我)→ 規則數=價值 → 「detection only, nothing blocked」=降低恐懼 → 「nothing leaves your machine」=隱私先講 → 明確 ✓ 收尾 → 遙測 opt-in 預設 No + 講清楚。audit 17 個改背景,不卡 payoff。

### 情境 2 — 平時防護(agent 在跑、沒事)：peace of mind, ambient
**近乎隱形。** 不主動跳通知。開發者要看才看:
```
  $ pga status
   ✓ Protected · 642 rules · 9 tools · up 3d 4h
     Watched today: 1,204 events   Flagged: 0   Blocked: 0 (detection mode)
     Last sync: 2h ago             localhost:7777
```
一行綠狀態 = 安心。沒有威脅就**不該有任何紅字、不該跳任何東西**。

### 情境 3 — 抓到真威脅(aha moment)：乾淨、有說服力、可行動
心理:relief +「它真的有用」。**不滿屏紅**,一張卡講清楚:
```
  ⚠ PanGuard flagged an attack            14:23:07

     What:   Prompt injection + credential exfiltration
     Where:  skill "helper-bot" → SKILL.md
     Rule:   ATR-2026-00162 (CRITICAL, 93% confidence)
     Why:    Instruction-override followed by `curl … $(cat ~/.ssh/id_rsa)`

     Detection mode — not blocked. To block attacks like this:
       pga guard --enforce

     Details → localhost:7777/threats        Mute this rule → pga rules mute 00162
```
一個威脅一張卡。給 what/where/rule/why(透明)+ 下一步(行動)+ 可 mute(主導權)。多個威脅折疊成清單,不洗版。

### 情境 4 — 查看狀態(dashboard)：glanceable, 狀態優先
見第四部分視覺。原則:進來 3 秒內看到「✓ PROTECTED + 642 rules + 今日威脅數」,細節 on demand。

### 情境 5 — CI / PR 掃描:gatekeeping 無摩擦
```
  $ pga scan ./skills --ci
   ✓ 18 skills scanned · 642 rules · 0 threats
   PanGuard: clean. (exit 0)
```
有威脅時 exit 1 + 一行「3 threats in 2 skills — see above」。CI log 乾淨,擋得住但不囉嗦。

### 情境 6 — 升級到阻擋(earn the right to block)
心理:「它會不會擋到我正常的流量?」→ 先用學習模式消除恐懼:
```
  $ pga guard --enforce
   You've run 3 days in detection mode: 0 false positives on 4,210 events.
   Enabling blocking. Attacks matching CRITICAL/HIGH rules will be stopped.
   Fail-open: if PanGuard ever errors, your agent keeps running.
   Confirm? [y/N]
```
用「0 誤報實績」說服 + 「fail-open 保證不弄掛你」消除最後恐懼。

---

## 第四部分:Dashboard 重新設計(沿用 DESIGN.md 視覺語言)

維持 DESIGN.md 的 sage-green mission-control 美學,但**資訊層級依心理學重排**:
1. **Hero 狀態列(最上)**:大字 `✓ PROTECTED` badge + 「642 rules · 9 tools · detection mode」+ uptime。3 秒安心。
2. **4 KPI 卡**:Rules Active(642)· Threats Today · Tools Watched · Last Sync。數字大(28px)、label 小(11px muted)。
3. **Threat Timeline**:有威脅才有內容;沒威脅顯示「All clear — 0 threats today」綠空狀態(不是空白焦慮)。
4. **Recent Events log**:monospace、severity 左邊色條、最近 20 筆。
5. **Flywheel 狀態**:threats in → rules out,讓用戶看到「我也在貢獻 commons」(歸屬感)。

關鍵 UX 修正(對照現況):規則數即時顯示 **642**(非寫死 172)· 沒威脅時是「All clear」綠空狀態非空白 · 強制模式關時明確標「Detection mode — nothing blocked」降低恐懼。

---

## 第五部分:GA 的 UX 檢查表

- [ ] 第一次執行 60 秒內出現「✓ You're protected」
- [ ] 遙測 opt-in(預設 No)+ 講清楚傳雜湊
- [ ] 平時零打擾(沒威脅不跳通知)
- [ ] 威脅卡:what/where/rule/why/下一步,不洗版
- [ ] 阻擋前先用學習模式實績說服 + fail-open 保證
- [ ] 所有規則數動態顯示現況(642)
- [ ] 符號改 `✓ ⚠ →`,語言去「注入」改「守護」
- [ ] dashboard 沒威脅=「All clear」綠空狀態

關聯:[[STRATEGY-community-GA-readiness-2026-06-13]] · 視覺基準:DESIGN.md
