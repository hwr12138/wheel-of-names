export const TAU = Math.PI * 2;

/**
 * Canvas angle of the pointer: straight up. Canvas angles start at 3 o'clock
 * and grow clockwise, because the y axis points down.
 */
export const POINTER_ANGLE = -Math.PI / 2;

/**
 * How far from a wedge's centre the wheel may stop, as a fraction of the
 * wedge's width. Kept below 0.5 so the pointer never lands on a dividing line.
 */
export const MAX_JITTER = 0.35;

/** Remainder that is always in [0, n), unlike `%` for negative numbers. */
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/**
 * Index of the wedge under the pointer when the wheel is turned by `rotation`
 * radians. Wedge i spans [rotation + i·w, rotation + (i+1)·w] with w = 2π/count.
 */
export function wedgeAt(rotation: number, count: number): number {
  const wedge = TAU / count;
  return Math.floor(mod(POINTER_ANGLE - rotation, TAU) / wedge) % count;
}

/**
 * The rotation to stop at so that wedge `index` sits under the pointer.
 *
 * The result is between `turns` and `turns + 1` full clockwise turns past
 * `current`. `jitter` (−MAX_JITTER to MAX_JITTER) moves the stopping point
 * away from the wedge's centre so every spin doesn't end dead centre.
 */
export function targetRotation(
  current: number,
  index: number,
  count: number,
  turns: number,
  jitter: number,
): number {
  const wedge = TAU / count;
  const stop = POINTER_ANGLE - (index + 0.5 + jitter) * wedge;
  const earliest = current + turns * TAU;
  return earliest + mod(stop - earliest, TAU);
}

/** Starts fast and slows to a stop, like a wheel losing momentum. */
export function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}
