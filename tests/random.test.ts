import { describe, expect, it } from 'vitest';
import { randomFloat, randomInt } from '../src/random';

describe('randomInt', () => {
  it('stays in range', () => {
    for (const max of [1, 2, 3, 10, 97]) {
      for (let i = 0; i < 1000; i++) {
        const value = randomInt(max);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(max);
      }
    }
  });

  it('picks every index about equally often', () => {
    const max = 7;
    const draws = 70_000;
    const counts = new Array<number>(max).fill(0);
    for (let i = 0; i < draws; i++) counts[randomInt(max)]++;
    const expected = draws / max;
    for (const count of counts) {
      // About 7 standard deviations, so this practically never fails by chance.
      expect(Math.abs(count - expected)).toBeLessThan(expected * 0.07);
    }
  });

  it('rejects invalid ranges', () => {
    expect(() => randomInt(0)).toThrow(RangeError);
    expect(() => randomInt(-3)).toThrow(RangeError);
    expect(() => randomInt(2.5)).toThrow(RangeError);
  });
});

describe('randomFloat', () => {
  it('stays in [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const value = randomFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
