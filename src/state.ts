import { TAU, mod } from './spin';

export type Entry = { id: number; name: string };

export type Phase = 'setup' | 'idle' | 'spinning' | 'result' | 'done';

export interface State {
  phase: Phase;
  /** What is typed in the setup textarea. */
  draft: string;
  /** The names as entered at the start, for "Spin again with the same names". */
  original: string[];
  /** Names still on the wheel, in wheel order. */
  entries: Entry[];
  /** Names drawn so far, in the order they were drawn. */
  drawn: Entry[];
  /** Current wheel rotation in radians. */
  rotation: number;
  /** The name being drawn, from the start of a spin until its result is closed. */
  winner: Entry | null;
  /** Where the current spin will stop. Saved so a refresh mid-spin can't re-roll it. */
  spinTarget: number | null;
}

const STORAGE_KEY = 'wheel-of-names:session:v1';

export function initialState(draft = ''): State {
  return {
    phase: 'setup',
    draft,
    original: [],
    entries: [],
    drawn: [],
    rotation: 0,
    winner: null,
    spinTarget: null,
  };
}

export function startSession(names: string[], draft = names.join('\n')): State {
  return {
    ...initialState(draft),
    phase: names.length > 0 ? 'idle' : 'setup',
    original: [...names],
    entries: names.map((name, id) => ({ id, name })),
  };
}

export function beginSpin(state: State, index: number, target: number): State {
  const winner = state.entries[index];
  if (state.phase !== 'idle' || !winner) return state;
  return { ...state, phase: 'spinning', winner, spinTarget: target };
}

export function finishSpin(state: State): State {
  if (state.phase !== 'spinning' || state.spinTarget === null) return state;
  return { ...state, phase: 'result', rotation: state.spinTarget, spinTarget: null };
}

/** Takes the drawn name off the wheel once its result has been seen. */
export function dismissResult(state: State): State {
  const { winner } = state;
  if (state.phase !== 'result' || !winner) return state;
  const entries = state.entries.filter((entry) => entry.id !== winner.id);
  return {
    ...state,
    phase: entries.length > 0 ? 'idle' : 'done',
    entries,
    drawn: [...state.drawn, winner],
    // Keep the number small; the wheel looks the same.
    rotation: mod(state.rotation, TAU),
    winner: null,
  };
}

/**
 * A session saved mid-spin resumes at the spin's result, so refreshing the
 * page can't be used to throw away a draw that was heading somewhere unwanted.
 */
export function restore(state: State): State {
  if (state.phase === 'spinning' && state.spinTarget !== null) return finishSpin(state);
  // Shouldn't happen, but never leave a saved session stuck with no way forward.
  if ((state.phase === 'spinning' || state.phase === 'result') && !state.winner) {
    return { ...state, phase: state.entries.length > 0 ? 'idle' : 'done', spinTarget: null };
  }
  if (state.phase === 'spinning') return { ...state, phase: 'idle', winner: null, spinTarget: null };
  return state;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadState(storage: StorageLike): State {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed: unknown = JSON.parse(raw);
    return isState(parsed) ? restore(parsed) : initialState();
  } catch {
    return initialState();
  }
}

export function saveState(state: State, storage: StorageLike): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be full or blocked (e.g. some private modes). The app still
    // works; it just won't survive a refresh.
  }
}

const PHASES: readonly Phase[] = ['setup', 'idle', 'spinning', 'result', 'done'];

function isEntry(value: unknown): value is Entry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.name === 'string';
}

function isState(value: unknown): value is State {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    PHASES.includes(v.phase as Phase) &&
    typeof v.draft === 'string' &&
    Array.isArray(v.original) &&
    v.original.every((name) => typeof name === 'string') &&
    Array.isArray(v.entries) &&
    v.entries.every(isEntry) &&
    Array.isArray(v.drawn) &&
    v.drawn.every(isEntry) &&
    typeof v.rotation === 'number' &&
    Number.isFinite(v.rotation) &&
    (v.winner === null || isEntry(v.winner)) &&
    (v.spinTarget === null || (typeof v.spinTarget === 'number' && Number.isFinite(v.spinTarget)))
  );
}
