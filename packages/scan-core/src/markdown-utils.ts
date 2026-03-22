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
  cleaned = cleaned.replace(/^(?:    |\t).+$/gm, ' ');
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
