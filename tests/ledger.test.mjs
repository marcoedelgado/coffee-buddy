import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyState, parseState, addPerson, removePerson, recordRound, undoLastRound,
  summarise, sortPeople, relativeDay,
} from '../assets/ledger.js';

const at = s => new Date(s);
const withAlex = () => addPerson(emptyState(), 'Alex', { id: 'a', now: at('2026-10-01T09:00:00') });

test('adding a person trims and collapses whitespace', () => {
  const s = addPerson(emptyState(), '  Sam   Lee ', { id: 's' });
  assert.equal(s.people[0].name, 'Sam Lee');
  assert.deepEqual(s.people[0].rounds, []);
});

test('blank names and case-insensitive duplicates are rejected', () => {
  assert.throws(() => addPerson(emptyState(), '   '), /name/);
  assert.throws(() => addPerson(withAlex(), 'alex'), /^Error: Alex is already/);
});

test('a new person has no turn yet', () => {
  const sum = summarise(withAlex().people[0]);
  assert.deepEqual(sum, { lastPayer: null, lastAt: null, nextPayer: null, mine: 0, theirs: 0 });
});

test('whoever paid last, the other one pays next', () => {
  let s = recordRound(withAlex(), 'a', 'me', at('2026-10-02T10:00:00'));
  assert.equal(summarise(s.people[0]).nextPayer, 'them');
  s = recordRound(s, 'a', 'them', at('2026-10-03T10:00:00'));
  const sum = summarise(s.people[0]);
  assert.equal(sum.nextPayer, 'me');
  assert.equal(sum.lastPayer, 'them');
  assert.equal(sum.mine, 1);
  assert.equal(sum.theirs, 1);
});

test('recording does not mutate the previous state', () => {
  const before = withAlex();
  recordRound(before, 'a', 'me');
  assert.equal(before.people[0].rounds.length, 0);
});

test('an unknown payer is rejected', () => {
  assert.throws(() => recordRound(withAlex(), 'a', 'bob'), /payer/);
});

test('undo removes only the latest round, and is a no-op when empty', () => {
  let s = recordRound(withAlex(), 'a', 'me', at('2026-10-02T10:00:00'));
  s = recordRound(s, 'a', 'them', at('2026-10-03T10:00:00'));
  s = undoLastRound(s, 'a');
  assert.equal(summarise(s.people[0]).lastPayer, 'me');
  s = undoLastRound(undoLastRound(s, 'a'), 'a');
  assert.equal(s.people[0].rounds.length, 0);
});

test('removing a person leaves the others alone', () => {
  const s = addPerson(withAlex(), 'Bea', { id: 'b' });
  assert.deepEqual(removePerson(s, 'a').people.map(p => p.id), ['b']);
});

test('people sort by most recent coffee, then newest added', () => {
  let s = withAlex();
  s = addPerson(s, 'Bea', { id: 'b', now: at('2026-10-02T09:00:00') });
  s = addPerson(s, 'Cal', { id: 'c', now: at('2026-10-03T09:00:00') });
  s = recordRound(s, 'a', 'me', at('2026-10-04T09:00:00'));
  s = recordRound(s, 'b', 'me', at('2026-10-05T09:00:00'));
  assert.deepEqual(sortPeople(s.people).map(p => p.name), ['Bea', 'Alex', 'Cal']);
});

test('parseState survives junk and drops malformed entries', () => {
  assert.deepEqual(parseState('not json'), emptyState());
  assert.deepEqual(parseState(null), emptyState());
  assert.deepEqual(parseState('{"people": 3}'), emptyState());
  const s = parseState(JSON.stringify({
    people: [
      { id: 'a', name: 'Alex', added: '2026-10-01T00:00:00.000Z',
        rounds: [{ payer: 'me', at: '2026-10-02T00:00:00.000Z' }, { payer: 'nobody', at: 'x' }, null] },
      { id: 'b', name: '   ' },
      { name: 'No id' },
    ],
  }));
  assert.equal(s.people.length, 1);
  assert.deepEqual(s.people[0].rounds, [{ payer: 'me', at: '2026-10-02T00:00:00.000Z' }]);
});

test('parseState round-trips a real state', () => {
  const s = recordRound(withAlex(), 'a', 'them', at('2026-10-02T10:00:00'));
  assert.deepEqual(parseState(JSON.stringify(s)), s);
});

test('relativeDay counts calendar days, not 24h blocks', () => {
  const now = at('2026-10-08T08:00:00');
  assert.equal(relativeDay('2026-10-08T07:00:00', now), 'today');
  assert.equal(relativeDay(at('2026-10-07T23:30:00').toISOString(), now), 'yesterday');
  assert.equal(relativeDay(at('2026-10-05T12:00:00').toISOString(), now), '3 days ago');
  assert.match(relativeDay(at('2026-09-20T12:00:00').toISOString(), now), /^20 Sept?$/); // ICU builds differ
  assert.equal(relativeDay(at('2025-12-24T12:00:00').toISOString(), now), '24 Dec 2025');
});
