import './style.css';
import { parseNames } from './names';
import { randomFloat, randomInt } from './random';
import { chime, tick, unlockAudio } from './sound';
import { MAX_JITTER, easeOutQuart, targetRotation, wedgeAt } from './spin';
import {
  beginSpin,
  dismissResult,
  finishSpin,
  initialState,
  loadState,
  saveState,
  startSession,
  type State,
} from './state';
import { Wheel } from './wheel';

const MIN_NAMES = 2;
const SOUND_KEY = 'wheel-of-names:sound';

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in index.html`);
  return node as T;
}

const ui = {
  setup: el<HTMLElement>('setup'),
  namesInput: el<HTMLTextAreaElement>('names-input'),
  nameCount: el<HTMLElement>('name-count'),
  startBtn: el<HTMLButtonElement>('start-btn'),

  play: el<HTMLElement>('play'),
  canvas: el<HTMLCanvasElement>('wheel'),
  spinBtn: el<HTMLButtonElement>('spin-btn'),
  remaining: el<HTMLElement>('remaining'),
  drawnList: el<HTMLOListElement>('drawn-list'),
  drawnEmpty: el<HTMLElement>('drawn-empty'),
  soundBtn: el<HTMLButtonElement>('sound-btn'),
  endBtn: el<HTMLButtonElement>('end-btn'),

  done: el<HTMLElement>('done'),
  doneTitle: el<HTMLElement>('done-title'),
  finalList: el<HTMLOListElement>('final-list'),
  againBtn: el<HTMLButtonElement>('again-btn'),
  editBtn: el<HTMLButtonElement>('edit-btn'),

  result: el<HTMLDialogElement>('result'),
  resultName: el<HTMLElement>('result-name'),
  resultNote: el<HTMLElement>('result-note'),
  resultOk: el<HTMLButtonElement>('result-ok'),
};

const wheel = new Wheel(ui.canvas);
let state: State = loadState(sessionStorage);
let soundOn = readSoundSetting();

function readSoundSetting(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

function commit(next: State): void {
  const previousPhase = state.phase;
  state = next;
  saveState(state, sessionStorage);
  render(previousPhase);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function fillList(list: HTMLOListElement, names: string[]): void {
  list.replaceChildren(
    ...names.map((name) => {
      const item = document.createElement('li');
      item.textContent = name;
      return item;
    }),
  );
}

// ---------- Rendering ----------

function render(previousPhase: State['phase'] | null = null): void {
  const { phase } = state;
  const playing = phase === 'idle' || phase === 'spinning' || phase === 'result';

  ui.setup.hidden = phase !== 'setup';
  ui.play.hidden = !playing;
  ui.done.hidden = phase !== 'done';

  if (phase === 'setup') renderSetup();
  if (playing) renderPlay();
  if (phase === 'done') renderDone();

  if (phase === 'result') openResult();
  else if (ui.result.open) ui.result.close();

  // Move focus somewhere sensible when the screen changes.
  if (previousPhase !== null && previousPhase !== phase) {
    if (phase === 'setup') ui.namesInput.focus();
    else if (phase === 'idle' && previousPhase !== 'result') ui.spinBtn.focus();
    else if (phase === 'done') ui.againBtn.focus();
  }
}

function renderSetup(): void {
  if (ui.namesInput.value !== state.draft) ui.namesInput.value = state.draft;
  updateNameCount();
}

function updateNameCount(): void {
  const count = parseNames(ui.namesInput.value).length;
  ui.startBtn.disabled = count < MIN_NAMES;
  ui.nameCount.textContent =
    count === 0
      ? `Add at least ${MIN_NAMES} names.`
      : count < MIN_NAMES
        ? `${plural(count, 'name')}. Add at least ${MIN_NAMES}.`
        : plural(count, 'name');
}

function renderPlay(): void {
  const { entries, drawn, winner, phase } = state;
  const highlight = phase === 'result' && winner ? entries.findIndex((e) => e.id === winner.id) : -1;
  wheel.set(
    entries.map((e) => e.name),
    state.rotation,
    highlight >= 0 ? highlight : null,
  );

  const total = entries.length + drawn.length;
  ui.remaining.textContent = `${entries.length} of ${plural(total, 'name')} left on the wheel`;
  fillList(
    ui.drawnList,
    drawn.map((e) => e.name),
  );
  ui.drawnEmpty.hidden = drawn.length > 0;
  if (drawn.length > 0) ui.drawnList.lastElementChild?.scrollIntoView({ block: 'nearest' });

  const canSpin = phase === 'idle';
  ui.spinBtn.setAttribute('aria-disabled', String(!canSpin));
  ui.spinBtn.textContent = phase === 'spinning' ? '…' : 'SPIN';
  ui.spinBtn.setAttribute('aria-label', phase === 'spinning' ? 'Spinning' : 'Spin the wheel');
  renderSoundButton();
}

function renderSoundButton(): void {
  ui.soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
  ui.soundBtn.setAttribute('aria-pressed', String(soundOn));
}

function renderDone(): void {
  ui.doneTitle.textContent = `All ${plural(state.drawn.length, 'name')} drawn`;
  fillList(
    ui.finalList,
    state.drawn.map((e) => e.name),
  );
}

function openResult(): void {
  const { winner } = state;
  if (!winner) return;
  const left = state.entries.length - 1;
  ui.resultName.textContent = winner.name;
  ui.resultNote.textContent =
    left === 0 ? 'That was the last name.' : `${plural(left, 'name')} left after this one.`;
  ui.resultOk.textContent = left === 0 ? 'See the full order' : 'Next';
  if (!ui.result.open) ui.result.showModal();
}

// ---------- Spinning ----------

function spin(): void {
  if (state.phase !== 'idle' || state.entries.length === 0) return;
  if (soundOn) unlockAudio();

  const count = state.entries.length;
  const index = randomInt(count);
  const jitter = (randomFloat() * 2 - 1) * MAX_JITTER;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const turns = reduceMotion ? 1 : 5 + randomInt(4);
  const duration = reduceMotion ? 1200 : 5000 + randomInt(1500);

  const from = state.rotation;
  const to = targetRotation(from, index, count, turns, jitter);
  commit(beginSpin(state, index, to));

  let lastWedge = wedgeAt(from, count);
  const startedAt = performance.now();

  const frame = (now: number) => {
    // The session may have been ended mid-spin.
    if (state.phase !== 'spinning') return;
    const t = Math.min(1, (now - startedAt) / duration);
    const rotation = from + (to - from) * easeOutQuart(t);
    wheel.setRotation(rotation);

    const current = wedgeAt(rotation, count);
    if (current !== lastWedge) {
      lastWedge = current;
      if (soundOn) tick();
    }

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      if (soundOn) chime();
      commit(finishSpin(state));
    }
  };
  requestAnimationFrame(frame);
}

// ---------- Events ----------

ui.namesInput.addEventListener('input', () => {
  state = { ...state, draft: ui.namesInput.value };
  saveState(state, sessionStorage);
  updateNameCount();
});

function start(): void {
  const names = parseNames(ui.namesInput.value);
  if (names.length < MIN_NAMES) return;
  commit(startSession(names, ui.namesInput.value));
}

ui.startBtn.addEventListener('click', start);
ui.namesInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    start();
  }
});

ui.spinBtn.addEventListener('click', spin);

ui.soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  try {
    localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
  } catch {
    // Not saved; it still applies for this visit.
  }
  renderSoundButton();
});

ui.endBtn.addEventListener('click', () => {
  if (state.drawn.length > 0 && !window.confirm('End this session? The draw so far will be cleared.')) return;
  commit(initialState(state.original.join('\n')));
});

ui.againBtn.addEventListener('click', () => commit(startSession(state.original)));
ui.editBtn.addEventListener('click', () => commit(initialState(state.original.join('\n'))));

// The dialog closes from the button, Escape or a click on the backdrop; all of them
// take the drawn name off the wheel.
ui.resultOk.addEventListener('click', () => ui.result.close());
ui.result.addEventListener('click', (event) => {
  if (event.target === ui.result) ui.result.close();
});
ui.result.addEventListener('close', () => {
  if (state.phase === 'result') commit(dismissResult(state));
});

render();
