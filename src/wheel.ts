import { TAU } from './spin';

export const PALETTE = [
  { fill: '#e8504f', text: '#ffffff' },
  { fill: '#f4a03a', text: '#2b1d0e' },
  { fill: '#f7d548', text: '#2b2410' },
  { fill: '#5cc27a', text: '#0f2a18' },
  { fill: '#38b2ac', text: '#0b2726' },
  { fill: '#4a7fe0', text: '#ffffff' },
  { fill: '#8a63d2', text: '#ffffff' },
  { fill: '#e0609e', text: '#ffffff' },
] as const;

/** Radius of the centre SPIN button as a fraction of the wheel radius (matches the CSS). */
const HUB_RATIO = 0.2;
const RIM_WIDTH = 4;
const MIN_FONT_PX = 7;
const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Colour for wedge i. Colours repeat around the wheel, so when (count − 1) is
 * a multiple of the palette size the last wedge would match wedge 0 next to
 * it; that wedge gets the second colour instead.
 */
export function colorIndex(i: number, count: number, paletteSize: number = PALETTE.length): number {
  if (count > 1 && i === count - 1 && i % paletteSize === 0) return 1 % paletteSize;
  return i % paletteSize;
}

type Label = { text: string; font: string; padding: number } | null;

export class Wheel {
  private readonly ctx: CanvasRenderingContext2D;
  private size = 0;
  private names: string[] = [];
  private labels: Label[] = [];
  private rotation = 0;
  private highlight: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser does not support canvas drawing.');
    this.ctx = ctx;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  /** Shows these names; `highlight` dims every wedge except that one. */
  set(names: string[], rotation: number, highlight: number | null = null): void {
    const changed = names.length !== this.names.length || names.some((n, i) => n !== this.names[i]);
    this.names = [...names];
    this.rotation = rotation;
    this.highlight = highlight;
    if (changed) this.layoutLabels();
    this.draw();
  }

  setRotation(rotation: number): void {
    this.rotation = rotation;
    this.draw();
  }

  private get radius(): number {
    return this.size / 2 - RIM_WIDTH;
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0) return; // hidden
    const dpr = window.devicePixelRatio || 1;
    this.size = rect.width;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layoutLabels();
    this.draw();
  }

  /** Picks one font size for all labels and shortens names that don't fit. Runs only when names or size change. */
  private layoutLabels(): void {
    const count = this.names.length;
    const r = this.radius;
    if (count === 0 || r <= 0) {
      this.labels = [];
      return;
    }
    // The space across a wedge, measured partway out where the labels sit.
    const halfAngle = Math.min(Math.PI / count, Math.PI / 2);
    const across = 2 * (r * 0.62) * Math.sin(halfAngle);
    const fontSize = Math.min(r * 0.09, 26, across * 0.62);
    if (fontSize < MIN_FONT_PX) {
      this.labels = this.names.map(() => null);
      return;
    }
    const font = `600 ${fontSize.toFixed(1)}px ${FONT_FAMILY}`;
    const maxWidth = r * (1 - HUB_RATIO) - fontSize * 1.4;
    this.ctx.font = font;
    const padding = fontSize * 0.7;
    this.labels = this.names.map((name) => ({ text: this.fit(name, maxWidth), font, padding }));
  }

  private fit(text: string, maxWidth: number): string {
    const { ctx } = this;
    if (ctx.measureText(text).width <= maxWidth) return text;
    const chars = Array.from(text); // don't split emoji or accented letters
    let lo = 0;
    let hi = chars.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const candidate = chars.slice(0, mid).join('').trimEnd() + '…';
      if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return lo === 0 ? '…' : chars.slice(0, lo).join('').trimEnd() + '…';
  }

  private draw(): void {
    const { ctx, size, names, labels } = this;
    ctx.clearRect(0, 0, size, size);
    const count = names.length;
    const r = this.radius;
    if (count === 0 || r <= 0) return;

    const c = size / 2;
    const wedge = TAU / count;

    for (let i = 0; i < count; i++) {
      const start = this.rotation + i * wedge;
      const color = PALETTE[colorIndex(i, count)];
      ctx.globalAlpha = this.highlight === null || this.highlight === i ? 1 : 0.28;

      ctx.beginPath();
      if (count === 1) {
        ctx.arc(c, c, r, 0, TAU);
      } else {
        ctx.moveTo(c, c);
        ctx.arc(c, c, r, start, start + wedge);
        ctx.closePath();
      }
      ctx.fillStyle = color.fill;
      ctx.fill();
      if (count > 1 && count <= 120) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = count > 40 ? 1 : 2;
        ctx.stroke();
      }

      const label = labels[i];
      if (label) {
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(start + wedge / 2);
        ctx.font = label.font;
        ctx.fillStyle = color.text;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(label.text, r - label.padding, 0);
        ctx.restore();
      }
    }

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(c, c, r + RIM_WIDTH / 2, 0, TAU);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = RIM_WIDTH;
    ctx.stroke();
  }
}
