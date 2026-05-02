/**
 * ATR-2026-NNNNN allocator.
 *
 * Constraints:
 *   1. Output must match ATR validateRule() regex /^ATR-\d{4}-\d{5}$/, so the
 *      numeric portion is fixed at 5 digits (max 100,000 distinct ids per year).
 *   2. ATR public uses [00001, 00314] today, expected to grow within [00001, 09999].
 *      Migrator namespace = [10000, 99999] = 90,000 slots. Visually distinguishable
 *      and gives ~5x headroom over any realistic single-customer batch.
 *   3. Deterministic: same sourceId → same id given the same prior-allocation set.
 *      For collision-free determinism within a batch, pass a shared `used` set.
 *
 * Birthday collision probability (without retry): 50 rules in 90K slots ~= 1.4%
 * (down from 11.5% at the original 10K). With the retry mechanism below, the
 * effective collision rate per insert drops to ~0%.
 *
 * Retry strategy: if a hash collision lands on an id already in `used`, re-hash
 * with `${sourceId}:${attempt}` until a free slot is found. Bounded at 100 attempts
 * (would only be reached if ~99% of namespace is occupied — at which point we
 * have bigger problems).
 */

import { createHash } from 'node:crypto';

const MIGRATOR_NAMESPACE_START = 10000;
const MIGRATOR_NAMESPACE_END = 99999; // 90,000 slots
const YEAR = 2026;
const MAX_COLLISION_RETRIES = 100;

/**
 * Allocate an ATR id for a source rule.
 *
 * @param sourceId - Stable identifier from the source format (e.g. Sigma rule id)
 * @param used - Optional set of already-allocated ids in this batch. If supplied,
 *   the allocator avoids collisions by retrying with attempt-suffixed hashes,
 *   and adds the chosen id to the set on return. Without it, the allocator is
 *   purely deterministic on `sourceId` alone (collisions possible, caller's risk).
 */
export function allocateId(sourceId: string, used?: Set<string>): string {
  const span = MIGRATOR_NAMESPACE_END - MIGRATOR_NAMESPACE_START + 1;

  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const seed = attempt === 0 ? sourceId : `${sourceId}:${attempt}`;
    const hash = createHash('sha256').update(seed).digest();
    const value = hash.readUInt32BE(0) % span;
    const n = MIGRATOR_NAMESPACE_START + value;
    const id = `ATR-${YEAR}-${String(n).padStart(5, '0')}`;

    if (used === undefined || !used.has(id)) {
      used?.add(id);
      return id;
    }
  }

  throw new Error(
    `ID allocation collision storm for "${sourceId}" — namespace may be exhausted ` +
      `(>${MAX_COLLISION_RETRIES} retries). Used set size: ${used?.size ?? 0}.`
  );
}
