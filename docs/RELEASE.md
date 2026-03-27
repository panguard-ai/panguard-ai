# Release Workflow

PanGuard 橫跨兩個 repo、五個發布管道。這份文件是唯一的發布流程標準。

## Architecture

```
agent-threat-rules (ATR)          panguard-ai (PanGuard)
  rules/*.yaml                      packages/atr/rules/  (copy)
  npm: agent-threat-rules            npm: @panguard-ai/panguard
                                     brew: panguard-ai/tap/panguard
                                     curl: get.panguard.ai
                                     website: panguard.ai (Vercel)
```

## Release Types

| Type              | What               | Command                                                           |
| ----------------- | ------------------ | ----------------------------------------------------------------- |
| **ATR only**      | 規則更新、引擎改動 | `cd ~/Downloads/agent-threat-rules && ./scripts/release.sh patch` |
| **PanGuard only** | CLI/Guard/Website  | `cd ~/Downloads/panguard-ai && ./scripts/release.sh patch`        |
| **Full release**  | ATR + PanGuard     | ATR first, then sync to PanGuard, then PanGuard release           |

---

## 1. ATR Release

```bash
cd ~/Downloads/agent-threat-rules

# Preflight
npm test && npm run eval
git status  # must be clean

# Release
./scripts/release.sh [patch|minor|major]

# Verify
npm info agent-threat-rules version        # should match new version
npm install -g agent-threat-rules && atr --version
```

### ATR release.sh does:

1. Bump version in package.json
2. Build
3. Commit + tag + push
4. `npm publish`
5. Print verification commands

---

## 2. Sync ATR to PanGuard

After ATR release, if rules changed:

```bash
cd ~/Downloads/panguard-ai

# Sync rules
rsync -av --delete \
  ~/Downloads/agent-threat-rules/rules/ \
  packages/atr/rules/

# Sync version
ATR_VERSION=$(node -e "console.log(require('../agent-threat-rules/package.json').version)")
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('packages/atr/package.json', 'utf8'));
  p.version = '$ATR_VERSION';
  fs.writeFileSync('packages/atr/package.json', JSON.stringify(p, null, 2) + '\n');
"

# Test
pnpm build && pnpm test

# Commit
git add packages/atr/
git commit -m "chore: sync ATR rules v$ATR_VERSION"
```

---

## 3. PanGuard Release

```bash
cd ~/Downloads/panguard-ai

# Preflight
pnpm build && pnpm test
git status  # must be clean

# Release
./scripts/release.sh [patch|minor|major]
```

### release.sh does:

1. Bump version in 4 packages + stats.ts
2. Update lockfile + build
3. Commit + tag + push
4. CI auto-builds 4 platform binaries + GitHub Release
5. CI auto-publishes to npm

---

## 4. Post-Release Verification (MANDATORY)

Every release must pass ALL checks before declaring success.

```bash
# --- npm ---
npm info @panguard-ai/panguard version
npm install -g @panguard-ai/panguard && pga --version

# --- curl ---
curl -fsSL https://get.panguard.ai | bash
panguard --version

# --- brew ---
brew update && brew upgrade panguard
panguard --version

# --- website ---
curl -s https://panguard.ai | head -1  # should return HTML

# --- CI ---
gh run list --limit 3  # all should be success

# --- GitHub Release ---
gh release view  # should show latest version with 4 binaries
```

---

## 5. Full Release Checklist

For a coordinated release (ATR + PanGuard):

### Phase 1: ATR

- [ ] All tests pass (`npm test && npm run eval`)
- [ ] CHANGELOG.md updated
- [ ] `./scripts/release.sh [patch|minor|major]`
- [ ] Verify: `npm info agent-threat-rules version`
- [ ] Verify: `npm install -g agent-threat-rules && atr --version`

### Phase 2: Sync

- [ ] rsync rules to panguard-ai/packages/atr/
- [ ] Update ATR version in packages/atr/package.json
- [ ] `pnpm build && pnpm test`
- [ ] Commit sync

### Phase 3: PanGuard

- [ ] All tests pass (`pnpm build && pnpm test`)
- [ ] CHANGELOG.md updated
- [ ] `./scripts/release.sh [patch|minor|major]`
- [ ] Wait for CI to complete

### Phase 4: Verify (ALL must pass)

- [ ] `npm install -g @panguard-ai/panguard` works
- [ ] `curl -fsSL https://get.panguard.ai | bash` works
- [ ] `brew upgrade panguard` works
- [ ] panguard.ai loads correctly
- [ ] GitHub Release has 4 platform binaries
- [ ] CI all green

### Phase 5: Announce

- [ ] Social media post (if significant)
- [ ] Update CLAUDE.md version references if needed

---

## Emergency Hotfix

If a release breaks something:

```bash
# Fix the issue
git commit -m "fix: [describe fix]"

# Re-release as patch
./scripts/release.sh patch

# Re-verify everything
```

---

## Version Policy

- **ATR**: semver, independent of PanGuard
- **PanGuard packages**: all share same version (bumped together by release.sh)
- **Website**: auto-deploys on every push to main, no version number
- **ATR copy in PanGuard**: matches ATR version, NOT PanGuard version
