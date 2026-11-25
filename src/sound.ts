// Small sounds made with the Web Audio API, so there are no audio files to load.

let context: AudioContext | null = null;
let lastTickAt = 0;

function audio(): AudioContext | null {
  if (!context) {
    if (typeof AudioContext === 'undefined') return null;
    context = new AudioContext();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Browsers only allow sound after a user gesture, so call this from the click that starts a spin. */
export function unlockAudio(): void {
  audio();
}

function blip(ac: AudioContext, at: number, frequency: number, length: number, volume: number, type: OscillatorType) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

/** A click each time a wedge passes the pointer. Rapid ticks are thinned out so a fast spin isn't a buzz. */
export function tick(): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  if (now - lastTickAt < 0.04) return;
  lastTickAt = now;
  blip(ac, now, 1500, 0.035, 0.18, 'triangle');
}

/** A short rising chime when the wheel stops. */
export function chime(): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  [660, 880, 1320].forEach((frequency, i) => blip(ac, now + i * 0.09, frequency, 0.45, 0.16, 'sine'));
}
