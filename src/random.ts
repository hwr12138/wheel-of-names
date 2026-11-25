const UINT32_RANGE = 2 ** 32;

function randomUint32(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/**
 * A uniformly random integer in [0, maxExclusive).
 *
 * Uses rejection sampling so no index is slightly more likely than another,
 * which a plain `% maxExclusive` would cause.
 */
export function randomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new RangeError(`randomInt needs a positive integer, got ${maxExclusive}`);
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  let value: number;
  do {
    value = randomUint32();
  } while (value >= limit);
  return value % maxExclusive;
}

/** A random number in [0, 1). */
export function randomFloat(): number {
  return randomUint32() / UINT32_RANGE;
}
