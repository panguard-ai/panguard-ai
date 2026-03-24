/**
 * Markdown processing utilities for scan-core.
 *
 * Pure string operations, no I/O.
 */

/**
 * Strip markdown code blocks, inline code, blockquotes, HTML tags, and link URLs.
 * Used for two-pass ATR scanning: raw content catches hidden attacks,
 * stripped content catches attacks in prose.
 */
export function stripMarkdownNoise(raw: string): string {
  let cleaned = raw;
  // Remove fenced code blocks (```...```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
  // Remove indented code blocks (4 spaces or 1 tab)
  cleaned = cleaned.replace(/^(?: {4}|\t).+$/gm, ' ');
  // Remove inline code (`...`)
  cleaned = cleaned.replace(/`[^`]+`/g, ' ');
  // Remove blockquotes
  cleaned = cleaned.replace(/^>\s?.+$/gm, ' ');
  // Remove markdown link URLs (keep link text)
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  return cleaned;
}

/** Extract content from fenced code blocks */
export function extractCodeBlocks(content: string): string {
  const blocks: string[] = [];
  const re = /```[\s\S]*?```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    blocks.push(match[0]);
  }
  return blocks.join('\n');
}

/** Remove fenced code blocks from content */
export function stripCodeBlocks(content: string): string {
  return content.replace(/```[\s\S]*?```/g, ' ');
}

/**
 * Strip negation/exclusion sections from content.
 * Removes "When NOT to use", "Do NOT", "Never" sections that describe
 * what the skill does NOT do — preventing false positives when these
 * sections mention dangerous keywords for contrast.
 */
export function stripNegationSections(content: string): string {
  // Remove lines/paragraphs that are clearly negation context
  let cleaned = content;
  // Remove bullet points starting with negation
  cleaned = cleaned.replace(/^[\s-]*(?:❌|✗|✘)\s+.*$/gm, ' ');
  // Remove "When NOT to use" / "Do NOT use" section headers + following bullets
  cleaned = cleaned.replace(
    /^#{1,4}\s+(?:when\s+)?(?:not?\s+(?:to\s+)?use|don[''\u2019]?t\s+use|never\s+use).*$(?:\n(?:[-*]\s+.*|[ \t]+.*|\s*)$)*/gim,
    ' '
  );
  return cleaned;
}

/**
 * Prepare content for security checks by separating prose from code blocks
 * and removing negation sections. All check modules should use this
 * instead of running patterns against raw content.
 */
export function prepareContent(raw: string): {
  /** Prose only: code blocks and negation sections removed */
  prose: string;
  /** Content inside code blocks only */
  codeBlocks: string;
  /** Raw content unchanged */
  raw: string;
} {
  const codeBlocks = extractCodeBlocks(raw);
  const prose = stripNegationSections(stripCodeBlocks(raw));
  return { prose, codeBlocks, raw };
}
