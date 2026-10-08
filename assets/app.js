// DOM + storage glue. All the rules live in ledger.js.
import {
  parseState, addPerson, removePerson, recordRound, undoLastRound,
  summarise, sortPeople, relativeDay,
} from './ledger.js';

const STORAGE_KEY = 'coffee-buddy:v1';
const TINTS = ['#F6C99A', '#B9E08A', '#FFE08A', '#F7B6B0', '#BFE3F2'];

const $ = id => document.getElementById(id);
const list = $('list');
const tpl = $('card-tpl');
const addForm = $('add-form');
const addName = $('add-name');
const addError = $('add-error');
const toast = $('toast');

let state = load();
let openId = null;      // the expanded card, if any
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
  $('empty').hidden = people.length > 0;
  $('hint').hidden = people.length === 0;
  list.replaceChildren(...people.map(card));
}

function card(person) {
  const li = tpl.content.firstElementChild.cloneNode(true);
  const sum = summarise(person);
  const open = person.id === openId;
  li.dataset.id = person.id;

  const head = li.querySelector('.cb-card-head');
  const panel = li.querySelector('.cb-panel');
  panel.id = `panel-${person.id}`;
  head.setAttribute('aria-controls', panel.id);
  head.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;

  const avatar = li.querySelector('.cb-avatar');
  avatar.textContent = person.name.charAt(0).toUpperCase();
  avatar.style.background = tintFor(person.id);

  li.querySelector('.cb-name').textContent = person.name;
  li.querySelector('.cb-last').textContent = sum.lastAt
    ? `Last: ${sum.lastPayer === 'me' ? 'you' : person.name} · ${relativeDay(sum.lastAt)}`
    : 'No coffees yet';

  const pill = li.querySelector('.cb-pill');
  if (sum.nextPayer === 'me') { pill.textContent = 'Your round'; pill.classList.add('is-me'); }
  else if (sum.nextPayer === 'them') { pill.textContent = `${person.name}’s round`; pill.classList.add('is-them'); }
  else { pill.textContent = 'Anyone’s'; }

  const [mine, theirs] = li.querySelectorAll('[data-payer]');
  mine.querySelector('.cb-pay-count').textContent = `bought ${sum.mine}`;
  theirs.querySelector('.cb-pay-who').textContent = person.name;
  theirs.querySelector('.cb-pay-count').textContent = `bought ${sum.theirs}`;
  mine.classList.toggle('is-due', sum.nextPayer === 'me');
  theirs.classList.toggle('is-due', sum.nextPayer === 'them');

  li.querySelector('[data-action="undo"]').disabled = person.rounds.length === 0;
  li.querySelector('[data-action="remove"]').textContent = `Remove ${person.name}`;
  return li;
}

// Same person, same colour — even when the list re-sorts.
function tintFor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
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

  if (btn.classList.contains('cb-card-head')) {
    openId = openId === id ? null : id;
    render();
  } else if (btn.dataset.payer) {
    undoState = state;
    openId = null;
    commit(recordRound(state, id, btn.dataset.payer));
    showToast(btn.dataset.payer === 'me' ? `You bought ${person.name} a coffee ☕` : `${person.name} bought you a coffee ☕`);
    navigator.vibrate?.(15);
  } else if (btn.dataset.action === 'undo') {
    commit(undoLastRound(state, id));
  } else if (btn.dataset.action === 'remove') {
    if (confirm(`Remove ${person.name} and their coffee history?`)) {
      openId = null;
      commit(removePerson(state, id));
    }
  }
});

addForm.addEventListener('submit', e => {
  e.preventDefault();
  try {
    const next = addPerson(state, addName.value);
    openId = next.people.at(-1).id;   // open the new buddy, ready for the first round
    commit(next);
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
