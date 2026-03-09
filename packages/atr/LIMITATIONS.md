# ATR Limitations

ATR v0.1 uses pattern-based detection (regex). This document describes what it can and cannot detect. It is intended for security researchers, adopters, and anyone evaluating ATR for production use.

## What ATR Detects Well

ATR v0.1 contains 32 rules across 9 categories. Within the scope of regex-based pattern matching, it provides strong coverage for the following:

### Prompt Injection (Known Patterns)
ATR-2026-001 implements 15 detection layers covering instruction override verbs, persona switching, role redefinition, compliance demands, fake system delimiters, temporal behavioral overrides, and restriction removal via hypotheticals. These patterns are anchored with word boundaries, flexible whitespace, and synonym coverage derived from published attack taxonomies.

### Credential Exposure in Model Output
ATR-2026-021 detects 15+ credential formats in agent output: OpenAI keys (`sk-`), AWS Access Keys (`AKIA`), Google API keys (`AIza`), Stripe keys, JWT tokens, PEM/OpenSSH private keys, GitHub PATs (`ghp_`), Slack tokens (`xox[bpors]`), Bearer tokens, database connection strings (MongoDB, PostgreSQL, MySQL, Redis, AMQP), `.env` variable patterns, and generic secret assignment patterns.

### MCP Tool Poisoning
ATR-2026-010 through 013 detect shell command injection, exploit payloads, and malicious content in MCP server responses and tool parameters.

### SSRF via Tool Calls
ATR-2026-013 implements 15 detection layers covering AWS/GCP/Azure/DigitalOcean/Oracle metadata endpoints, localhost and loopback variants (decimal, hex `0x7f000001`, octal `0177.0.0.1`, short form `127.1`), private RFC1918 ranges, IPv6 loopback and mapped addresses (`::ffff:127.0.0.1`), exotic URI schemes (`gopher`, `file`, `dict`, `tftp`, `ldap`), DNS rebinding services (`nip.io`, `xip.io`, `sslip.io`), redirect-based SSRF, internal hostnames (`.internal`, `.consul`, `.svc.cluster.local`), and URL shortener indirection.

### CVE-Mapped Payloads
13 CVEs are mapped across 16 rules with reproducible test cases, including CVE-2025-53773 (Copilot RCE), CVE-2025-32711 (EchoLeak), CVE-2025-68143/68144/68145 (MCP server exploits), and CVE-2026-0628 (privilege escalation via agent tools).

### Unicode and Encoding Evasion
ATR-2026-001 detects zero-width character insertion (U+200B, U+200C, U+200D, U+FEFF, U+2060), Cyrillic/Greek homoglyph substitution in injection keywords, base64-encoded injection payloads (both instruction-to-decode patterns and known base64 fragments of keywords like "ignore", "disregard", "override"), hex/URL-encoded injection keywords, and markdown formatting abuse to hide payloads.

### Behavioral Threshold Detection
The engine supports numeric comparison operators (`gt`, `lt`, `gte`, `lte`, `eq`), `call_frequency`, `pattern_frequency`, `event_count`, and `deviation_from_baseline` for detecting runaway loops, resource exhaustion, and anomalous tool usage rates.

## What ATR Cannot Detect (v0.1)

### Paraphrase Attacks

ATR detects "ignore previous instructions" but does not detect "please set aside the guidance you were given earlier." Any regex-based rule can be bypassed by semantically equivalent rephrasing that avoids the specific verbs, nouns, and syntactic structures in the pattern. ATR-2026-001 covers ~16 override verbs and ~15 target nouns, but natural language has effectively unlimited paraphrasing capacity. An attacker who reads the published rules can craft injection text that conveys the same intent without matching any detection layer.

### Multilingual Attacks

All ATR patterns are English-only. Prompt injection payloads written in Chinese, German, Arabic, Korean, Japanese, Russian, or any other language bypass all rules completely. A simple translation of "ignore all previous instructions" into any non-English language evades detection. The homoglyph detection in ATR-2026-001 Layer 12 covers Cyrillic/Greek character substitution within English words, but does not address injection text written entirely in other languages.

### Protocol-Level Attacks

ATR inspects message content (the `content` field of events), not protocol structure. Attacks that operate at the MCP transport layer -- message replay, schema manipulation, capability negotiation exploitation, message ordering attacks, or transport-level man-in-the-middle -- are invisible to ATR. ATR sees what was said, not how or when it was delivered.

### Multi-Hop Indirect Injection

ATR evaluates each event independently. An attack that spans multiple tool calls or conversation turns -- where no single message contains a detectable pattern, but the sequence constitutes an attack -- is not correlated. ATR-2026-005 (multi-turn injection) detects linguistic markers of multi-turn attacks within individual messages (e.g., "as we agreed earlier", "you already said yes"), but cannot track actual conversation state across turns. The `sequence` operator checks pattern co-occurrence within a single event, not strict cross-event ordering.

### Timing and Side-Channel Attacks

ATR performs no timing analysis. Response latency modulation (encoding data in response time), slow-and-low data extraction (exfiltrating one character per turn), token probability probing, and other side-channel techniques are entirely outside scope. ATR operates on content, not on metadata like timing, token probabilities, or response sizes.

### Token Smuggling

ATR operates on text strings, not on token sequences. Attacks that exploit tokenizer boundary behavior -- where a string that appears benign at the text level is tokenized in a way that produces harmful semantics -- are not detectable. The gap between text-level and token-level representation is fundamental to regex-based detection.

### Semantic RAG Poisoning

ATR-2026-070 detects explicit injection tags and known injection patterns embedded in RAG-retrieved content. It does not detect subtle semantic bias shifting: documents that are factually structured but designed to gradually steer model behavior in a particular direction. Detecting this requires understanding semantic intent, not pattern matching.

### Cascading Failure Propagation

ATR-2026-052 detects textual descriptions of cascading failure patterns (e.g., "auto-approve all", "skip human review") in agent pipeline configurations and messages. It does not detect actual failure propagation -- where a corrupted output from stage N becomes trusted input at stage N+1. Real cascade detection requires behavioral monitoring of pipeline state across stages, not content inspection.

### Multi-Modal Attacks

ATR rules operate on text content only. Prompt injection embedded in images (OCR-based injection via screenshots), audio transcription manipulation, steganographic payloads in images sent to vision models, and video-based attacks are entirely out of scope.

### Adversarial Suffix Attacks (GCG-Style)

GCG-style adversarial suffixes produce random-looking token sequences that cause model misbehavior. These strings are statistically indistinguishable from random noise at the text level and cannot be reliably matched by regex without extreme false positive rates.

### Misinformation and Hallucination

No rules target factually incorrect or fabricated agent outputs. Detecting hallucinations requires ground-truth comparison or semantic analysis, which is outside the scope of pattern-based detection.

## Planned Solutions

| Gap | Planned Solution | Target Version |
|-----|-----------------|----------------|
| Paraphrase attacks | Embedding similarity operator (cosine distance from known attack embeddings) | v0.2 |
| Multilingual injection | Multilingual pattern expansion + cross-lingual embedding detection | v0.2 |
| Multi-hop attacks | Temporal sequence operator with session-aware cross-event correlation | v0.2 |
| Protocol-level attacks | Protocol module system (MCP transport inspection, schema validation) | v0.2 |
| Behavioral anomalies | Session module with statistical baseline and drift detection | v0.2 |
| Subtle manipulation | LLM-as-judge integration (model evaluates suspicious content) | v0.3 |
| Token smuggling | Tokenizer-aware preprocessing layer | v0.3 |
| Multi-modal attacks | Vision/audio preprocessing pipeline | v0.3+ |
| Adversarial suffixes | Perplexity-based anomaly detection | v0.3+ |

## The Three-Tier Detection Model

ATR's long-term architecture is a three-tier detection pipeline. Each tier adds capability that the previous tier cannot provide.

### Tier 1: Pattern (v0.1 -- current)

Regex and threshold-based detection. Fast (sub-millisecond per event), deterministic, zero external dependencies. Catches known attack signatures and structural anomalies. Limited to attacks that can be expressed as text patterns. This is the current release.

### Tier 2: Embedding (v0.2 -- planned)

Embedding similarity detection using vector distance from known attack embeddings. Catches paraphrase attacks, multilingual injection, and semantically similar variants of known patterns that evade regex. Requires an embedding model (adds latency and a dependency). The `embedding_similarity` operator will compare input embeddings against a curated set of attack embeddings and trigger when cosine similarity exceeds a threshold.

### Tier 3: LLM-as-Judge (v0.3 -- planned)

An LLM evaluates suspicious content flagged by Tier 1 or Tier 2. Catches subtle manipulation, context-dependent attacks, and novel attack categories that neither patterns nor embeddings can identify. Highest latency, highest cost, but highest detection capability. Intended for high-stakes decisions where false negatives are unacceptable.

The tiers are additive, not replacements. A production deployment would run all three tiers, with Tier 1 handling the fast path (block obvious attacks immediately) and Tier 3 handling the slow path (evaluate ambiguous cases with higher confidence).

## How to Report Detection Gaps

If you discover an attack that bypasses ATR rules, report it via the process described in [SECURITY.md](./SECURITY.md). False negatives against known attack patterns are treated as security-relevant issues. We will acknowledge within 48 hours and provide a status update within 7 business days.
