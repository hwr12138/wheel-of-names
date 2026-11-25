import { describe, expect, it } from 'vitest';
import { parseNames } from '../src/names';
import {
  beginSpin,
  dismissResult,
  finishSpin,
  initialState,
  loadState,
  saveState,
  startSession,
  type State,
} from '../src/state';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('parseNames', () => {
  it('takes one name per line, trimming spaces and dropping blank lines', () => {
    expect(parseNames('  Alice \n\nBob\r\n   \n Mary   Jane ')).toEqual(['Alice', 'Bob', 'Mary Jane']);
  });

  it('keeps duplicates', () => {
    expect(parseNames('Sam\nSam')).toEqual(['Sam', 'Sam']);
  });
});

describe('a full session', () => {
  it('draws every name exactly once, removing each after its result is closed', () => {
    let state = startSession(['Ann', 'Ben', 'Cat']);
    expect(state.phase).toBe('idle');

    const order: string[] = [];
    while (state.phase !== 'done') {
      state = beginSpin(state, 0, 10);
      expect(state.phase).toBe('spinning');
      state = finishSpin(state);
      expect(state.phase).toBe('result');
      expect(state.rotation).toBe(10);
      // The name stays on the wheel while its result is showing.
      expect(state.entries.some((e) => e.id === state.winner?.id)).toBe(true);
      order.push(state.winner!.name);
      state = dismissResult(state);
    }

    expect(order).toEqual(['Ann', 'Ben', 'Cat']);
    expect(state.entries).toEqual([]);
    expect(state.drawn.map((e) => e.name)).toEqual(order);
  });

  it('removes only the drawn entry when names are duplicated', () => {
    let state = startSession(['Sam', 'Sam', 'Jo']);
    state = dismissResult(finishSpin(beginSpin(state, 1, 0)));
    expect(state.entries).toEqual([
      { id: 0, name: 'Sam' },
      { id: 2, name: 'Jo' },
    ]);
  });

  it('ignores a spin request while already spinning', () => {
    const spinning = beginSpin(startSession(['A', 'B']), 0, 5);
    expect(beginSpin(spinning, 1, 99)).toBe(spinning);
  });
});

describe('saving and loading', () => {
  it('round-trips a session', () => {
    const storage = memoryStorage();
    const state = dismissResult(finishSpin(beginSpin(startSession(['A', 'B', 'C']), 2, 4)));
    saveState(state, storage);
    expect(loadState(storage)).toEqual(state);
  });

  it('resumes a session saved mid-spin at that spin’s result', () => {
    const storage = memoryStorage();
    saveState(beginSpin(startSession(['A', 'B', 'C']), 1, 42), storage);
    const loaded = loadState(storage);
    expect(loaded.phase).toBe('result');
    expect(loaded.winner?.name).toBe('B');
    expect(loaded.rotation).toBe(42);
  });

  it('starts fresh when nothing is saved or the saved data is broken', () => {
    expect(loadState(memoryStorage())).toEqual(initialState());

    const storage = memoryStorage();
    storage.setItem('wheel-of-names:session:v1', '{not json');
    expect(loadState(storage)).toEqual(initialState());

    storage.setItem('wheel-of-names:session:v1', JSON.stringify({ phase: 'idle' }));
    expect(loadState(storage)).toEqual(initialState());
  });

  it('never leaves a saved session stuck', () => {
    const storage = memoryStorage();
    const stuck: State = { ...startSession(['A', 'B']), phase: 'result', winner: null };
    saveState(stuck, storage);
    expect(loadState(storage).phase).toBe('idle');
  });
});
