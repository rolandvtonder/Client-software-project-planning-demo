/**
 * Demo data store. The live system keeps this in Supabase; for the demo it all
 * lives in the browser (localStorage) so the demo can be hosted for free and
 * reset with one button. Every write goes through `update`, which also stamps
 * the job's history, the way the live system's audit log will.
 */

import {useRef, useSyncExternalStore} from 'react';
import {daysBetween, today} from '../domain/dates';
import type {BranchId, Client, HistoryEntry, Item, Job, Settings} from '../domain/types';
import {DEMO_USERS, seed, type SeedState} from './seed';

export type Role = 'owner' | 'office' | 'driver';

export type State = SeedState & {
  seededOn: string;
  branch: BranchId | 'all';
  role: Role;
};

const KEY = 'eastco-hire-demo-v1';

function fresh(): State {
  return {...seed(), seededOn: today(), branch: 'pta', role: 'owner'};
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      // Seeded dates are relative to "today"; after a few days the demo would
      // look stale, so start again.
      if (daysBetween(s.seededOn, today()) <= 2) return s;
    }
  } catch {
    /* private window or blocked storage: run from memory */
  }
  return fresh();
}

let state: State = load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function set(next: State) {
  state = next;
  save();
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/**
 * Select from the store. The result is cached per state (and per `deps`, for
 * selectors that use props), so selectors may safely derive new arrays.
 */
export function useStore<T>(select: (s: State) => T, deps: unknown[] = []): T {
  const cache = useRef<{s?: State; deps?: unknown[]; v?: T}>({});
  return useSyncExternalStore(subscribe, () => {
    const c = cache.current;
    const same = c.s === state && c.deps?.length === deps.length && deps.every((d, i) => Object.is(d, c.deps![i]));
    if (!same) cache.current = {s: state, deps, v: select(state)};
    return cache.current.v as T;
  });
}

export const getState = () => state;

export const currentUser = (s: State = state) => DEMO_USERS[s.role];

// ---------------------------------------------------------------- actions

export const actions = {
  reset() {
    const {branch, role} = state;
    set({...fresh(), branch, role});
  },
  setBranch(branch: State['branch']) {
    set({...state, branch});
  },
  setRole(role: Role) {
    set({...state, role});
  },
  nextNumber(series: keyof State['counters']): string {
    const n = state.counters[series] + 1;
    state = {...state, counters: {...state.counters, [series]: n}};
    return `${series}-${today().slice(0, 4)}-${String(n).padStart(4, '0')}`;
  },
  saveJob(job: Job, note?: string) {
    const entry: HistoryEntry[] = note ? [{at: new Date().toISOString(), by: currentUser(), text: note}] : [];
    const withHistory = {...job, history: [...job.history, ...entry]};
    const exists = state.jobs.some((j) => j.id === job.id);
    set({
      ...state,
      jobs: exists ? state.jobs.map((j) => (j.id === job.id ? withHistory : j)) : [...state.jobs, withHistory],
    });
  },
  updateJob(id: string, patch: Partial<Job> | ((j: Job) => Partial<Job>), note?: string) {
    const job = state.jobs.find((j) => j.id === id);
    if (!job) return;
    const p = typeof patch === 'function' ? patch(job) : patch;
    actions.saveJob({...job, ...p}, note);
  },
  saveClient(client: Client) {
    const exists = state.clients.some((c) => c.id === client.id);
    set({...state, clients: exists ? state.clients.map((c) => (c.id === client.id ? client : c)) : [...state.clients, client]});
  },
  saveItem(item: Item) {
    set({...state, items: state.items.map((i) => (i.id === item.id ? item : i))});
  },
  saveSettings(settings: Settings) {
    set({...state, settings});
  },
};

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
