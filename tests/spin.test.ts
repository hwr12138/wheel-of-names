import { describe, expect, it } from 'vitest';
import { MAX_JITTER, POINTER_ANGLE, TAU, easeOutQuart, mod, targetRotation, wedgeAt } from '../src/spin';

describe('wedgeAt', () => {
  it('puts wedge 0 under the pointer when its middle is at the top', () => {
    const count = 4;
    const rotation = POINTER_ANGLE - 0.5 * (TAU / count);
    expect(wedgeAt(rotation, count)).toBe(0);
  });

  it('moves to the previous wedge as the wheel turns clockwise', () => {
    const count = 6;
    const wedge = TAU / count;
    const start = POINTER_ANGLE - 2.5 * wedge; // wedge 2 under the pointer
    expect(wedgeAt(start, count)).toBe(2);
    expect(wedgeAt(start + wedge, count)).toBe(1);
    expect(wedgeAt(start + 2 * wedge, count)).toBe(0);
    expect(wedgeAt(start + 3 * wedge, count)).toBe(5);
  });

  it('always returns a valid index, including for huge and negative rotations', () => {
    for (const rotation of [-1e6, -TAU, -0.0001, 0, 1e-12, TAU, 123456.789]) {
      for (const count of [1, 2, 3, 7, 50]) {
        const index = wedgeAt(rotation, count);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(count);
      }
    }
  });
});

describe('targetRotation', () => {
  it('lands the chosen wedge under the pointer for any wheel size and start angle', () => {
    const jitters = [-MAX_JITTER, -0.2, 0, 0.2, MAX_JITTER];
    const starts = [0, 0.3, -2.7, 17.5, 1000.123];
    for (let count = 1; count <= 60; count++) {
      for (let index = 0; index < count; index++) {
        for (const jitter of jitters) {
          for (const current of starts) {
            const target = targetRotation(current, index, count, 5, jitter);
            expect(wedgeAt(target, count)).toBe(index);
          }
        }
      }
    }
  });

  it('spins clockwise between `turns` and `turns + 1` full turns', () => {
    for (let trial = 0; trial < 2000; trial++) {
      const count = 1 + Math.floor(Math.random() * 100);
      const index = Math.floor(Math.random() * count);
      const current = (Math.random() - 0.5) * 100;
      const turns = 1 + Math.floor(Math.random() * 8);
      const jitter = (Math.random() * 2 - 1) * MAX_JITTER;
      const travel = targetRotation(current, index, count, turns, jitter) - current;
      expect(travel).toBeGreaterThanOrEqual(turns * TAU);
      expect(travel).toBeLessThanOrEqual((turns + 1) * TAU + 1e-9);
    }
  });

  it('stops inside the wedge, away from its edges', () => {
    const count = 8;
    const wedge = TAU / count;
    for (const jitter of [-MAX_JITTER, 0, MAX_JITTER]) {
      const target = targetRotation(0, 3, count, 5, jitter);
      // Position of the pointer within the wheel, measured from wedge 0's start.
      const offset = mod(POINTER_ANGLE - target, TAU) / wedge - 3;
      expect(offset).toBeGreaterThanOrEqual(0.5 - MAX_JITTER - 1e-9);
      expect(offset).toBeLessThanOrEqual(0.5 + MAX_JITTER + 1e-9);
    }
  });
});

describe('easeOutQuart', () => {
  it('starts at 0, ends at 1 and only ever moves forward', () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
    let previous = 0;
    for (let t = 0.01; t <= 1; t += 0.01) {
      const value = easeOutQuart(t);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});
