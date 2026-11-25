import { describe, expect, it } from 'vitest';
import { PALETTE, colorIndex } from '../src/wheel';

describe('colorIndex', () => {
  it('never gives two neighbouring wedges the same colour', () => {
    for (let count = 2; count <= 200; count++) {
      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count;
        expect(colorIndex(i, count), `count ${count}, wedges ${i} and ${next}`).not.toBe(colorIndex(next, count));
      }
    }
  });

  it('only uses palette colours', () => {
    for (let count = 1; count <= 50; count++) {
      for (let i = 0; i < count; i++) {
        expect(PALETTE[colorIndex(i, count)]).toBeDefined();
      }
    }
  });
});
