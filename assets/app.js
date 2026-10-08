// DOM + storage glue. All the rules live in ledger.js.
import {
  parseState, addPerson, removePerson, recordRound, undoLastRound,
  summarise, sortPeople, relativeDay,
} from './ledger.js';

const STORAGE_KEY = 'coffee-buddy:v1';

const $ = id => document.getElementById(id);
const list = $('list');
const tpl = $('card-tpl');
const editToggle = $('edit-toggle');
const addForm = $('add-form');
const addName = $('add-name');
const addError = $('add-error');
const toast = $('toast');

let state = load();
let editing = false;
let undoState = null;   // the state before the last tap, for the toast's Undo
let toastTimer = 0;

// ---------- storage ----------

function load() {
  try { return parseState(localStorage.getItem(STORAGE_KEY)); } catch { return parseState(null); }
}

function commit(next) {
  state = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private mode etc. — still works for this session */ }
  render();
}

// Ask the browser not to evict our data under storage pressure. Best effort.
navigator.storage?.persist?.().catch(() => {});

// ---------- rendering ----------

function render() {
  const people = sortPeople(state.people);
  if (!people.length) editing = false;

  $('empty').hidden = people.length > 0;
  editToggle.hidden = people.length === 0;
  editToggle.textContent = editing ? 'Done' : 'Edit';
  editToggle.setAttribute('aria-pressed', String(editing));
  document.body.classList.toggle('is-editing', editing);

  list.replaceChildren(...people.map(card));
}

function card(person) {
  const li = tpl.content.firstElementChild.cloneNode(true);
  const sum = summarise(person);
  li.dataset.id = person.id;

  li.querySelector('.cb-name').textContent = person.name;

  const turn = li.querySelector('.cb-turn');
  if (sum.nextPayer === 'me') { turn.textContent = 'Your turn'; turn.classList.add('is-me'); }
  else if (sum.nextPayer === 'them') { turn.textContent = `${person.name}'s turn`; turn.classList.add('is-them'); }
  else { turn.textContent = 'No coffees yet'; }

  li.querySelector('.cb-meta').textContent = sum.lastAt
    ? `${sum.lastPayer === 'me' ? 'You' : person.name} paid ${relativeDay(sum.lastAt)} · You ${sum.mine} – ${sum.theirs} ${person.name}`
    : 'Tap who pays for the first round.';

  const [mine, theirs] = li.querySelectorAll('[data-payer]');
  theirs.textContent = `${person.name} paid`;
  mine.classList.toggle('is-due', sum.nextPayer === 'me');
  theirs.classList.toggle('is-due', sum.nextPayer === 'them');

  li.querySelector('[data-action="undo"]').disabled = person.rounds.length === 0;
  return li;
}

// ---------- toast ----------

function showToast(text) {
  $('toast-text').textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
  toast.hidden = true;
  undoState = null;
}

$('toast-undo').addEventListener('click', () => {
  if (undoState) commit(undoState);
  hideToast();
});

// ---------- events ----------

list.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.closest('.cb-card').dataset.id;
  const person = state.people.find(p => p.id === id);
  if (!person) return;

  if (btn.dataset.payer) {
    undoState = state;
    commit(recordRound(state, id, btn.dataset.payer));
    showToast(btn.dataset.payer === 'me' ? `You paid for ${person.name} ☕` : `${person.name} paid for you ☕`);
    navigator.vibrate?.(15);
  } else if (btn.dataset.action === 'undo') {
    commit(undoLastRound(state, id));
  } else if (btn.dataset.action === 'remove') {
    if (confirm(`Remove ${person.name} and their coffee history?`)) commit(removePerson(state, id));
  }
});

editToggle.addEventListener('click', () => {
  editing = !editing;
  hideToast();
  render();
});

addForm.addEventListener('submit', e => {
  e.preventDefault();
  try {
    commit(addPerson(state, addName.value));
    addName.value = '';
    addError.textContent = '';
    addName.blur();
  } catch (err) {
    addError.textContent = err.message;
  }
});

addName.addEventListener('input', () => { addError.textContent = ''; });

// Another tab changed the data — pick it up.
window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) { state = load(); render(); } });

render();

// Offline support: cache the app shell so it opens with no signal.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
