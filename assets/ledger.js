// Pure coffee-ledger logic. No DOM, no storage — everything here is tested in
// tests/ledger.test.mjs. Every function returns a new state; nothing mutates.
//
// State shape:
//   { version: 1, people: [{ id, name, added, rounds: [{ payer: 'me'|'them', at }] }] }
// `at` / `added` are ISO timestamps. `rounds` is oldest-first.

export const VERSION = 1;

export function emptyState() {
  return { version: VERSION, people: [] };
}

// Turn whatever came out of storage into a valid state. Never throws: bad or
// missing data gives an empty ledger, and malformed entries are dropped.
export function parseState(raw) {
  let data;
  try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return emptyState(); }
  if (!data || !Array.isArray(data.people)) return emptyState();
  const people = data.people
    .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim())
    .map(p => ({
      id: p.id,
      name: p.name.trim(),
      added: typeof p.added === 'string' ? p.added : new Date(0).toISOString(),
      rounds: Array.isArray(p.rounds)
        ? p.rounds.filter(r => r && (r.payer === 'me' || r.payer === 'them') && typeof r.at === 'string')
                  .map(r => ({ payer: r.payer, at: r.at }))
        : [],
    }));
  return { version: VERSION, people };
}

export function addPerson(state, name, { id, now = new Date() } = {}) {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Give them a name first.');
  const existing = state.people.find(p => p.name.toLowerCase() === clean.toLowerCase());
  if (existing) throw new Error(`${existing.name} is already on the list.`);
  const person = { id: id ?? newId(), name: clean, added: now.toISOString(), rounds: [] };
  return { ...state, people: [...state.people, person] };
}

export function removePerson(state, id) {
  return { ...state, people: state.people.filter(p => p.id !== id) };
}

export function recordRound(state, id, payer, now = new Date()) {
  if (payer !== 'me' && payer !== 'them') throw new Error(`Unknown payer: ${payer}`);
  return updatePerson(state, id, p => ({ ...p, rounds: [...p.rounds, { payer, at: now.toISOString() }] }));
}

export function undoLastRound(state, id) {
  return updatePerson(state, id, p => ({ ...p, rounds: p.rounds.slice(0, -1) }));
}

// Everything the UI needs to draw one person's card.
export function summarise(person) {
  const last = person.rounds.at(-1) ?? null;
  const mine = person.rounds.filter(r => r.payer === 'me').length;
  return {
    lastPayer: last?.payer ?? null,
    lastAt: last?.at ?? null,
    // Strict alternation: whoever didn't pay last time pays next.
    nextPayer: last ? (last.payer === 'me' ? 'them' : 'me') : null,
    mine,
    theirs: person.rounds.length - mine,
  };
}

// Most recent coffee first; people with no coffees yet go last, newest-added first.
export function sortPeople(people) {
  const key = p => p.rounds.at(-1)?.at ?? '';
  return [...people].sort((a, b) =>
    key(b).localeCompare(key(a)) || b.added.localeCompare(a.added));
}

// "today", "yesterday", "3 days ago", then a plain date. Calendar days, local time.
export function relativeDay(iso, now = new Date()) {
  const then = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function updatePerson(state, id, fn) {
  return { ...state, people: state.people.map(p => (p.id === id ? fn(p) : p)) };
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
