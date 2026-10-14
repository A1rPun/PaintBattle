// The phone: join a room, then steer with the left/right half of the screen.
import { connect } from './net.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

let session = readSession(); // { code, name, token? } while (trying to be) in a game
let state = null; // latest 'state' from the big screen
let hostAway = false;
let dir = 0;

const roomParam = params.get('room')?.toUpperCase();
if (roomParam && session?.code !== roomParam) session = null;
$('codeInput').value = roomParam || session?.code || '';
$('nameInput').value = storage(localStorage, 'pb-name') || '';

const net = connect({
  onOpen() {
    if (session) net.send({ t: 'join', ...session });
    sendDir(true);
  },
  onMessage: handleMessage,
  onStatus(status) {
    $('offline').hidden = status === 'online' || !session;
  },
});

function handleMessage(msg) {
  switch (msg.t) {
    case 'joined':
      session = { code: msg.code, name: msg.name, token: msg.token };
      saveSession();
      showPad();
      return;
    case 'error':
    case 'kicked':
      return showJoin(msg.reason);
    case 'closed':
      return showJoin('The big screen closed the game');
    case 'host-away':
      hostAway = true;
      return render();
    case 'host-back':
      hostAway = false;
      return render();
    case 'state':
      state = msg;
      return render();
    case 'fx':
      return showFx(msg.text, msg.buzz);
  }
}

/* ---------- Join ---------- */

$('join').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('codeInput').value.trim().toUpperCase();
  const name = $('nameInput').value.trim();
  if (!code || !name) return;
  storage(localStorage, 'pb-name', name);
  session = { code, name };
  $('error').textContent = '';
  $('join').querySelector('button').disabled = true;
  net.send({ t: 'join', ...session });
});

$('codeInput').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
});

$('leave').addEventListener('click', () => {
  net.send({ t: 'leave' });
  showJoin('');
});

function showJoin(error) {
  session = null;
  state = null;
  saveSession();
  releaseAll();
  $('pad').hidden = true;
  $('join').hidden = false;
  $('offline').hidden = true;
  $('join').querySelector('button').disabled = false;
  if (error !== undefined) $('error').textContent = error;
}

function showPad() {
  $('join').hidden = true;
  $('pad').hidden = false;
  history.replaceState(null, '', `?room=${session.code}`);
  keepAwake();
  render();
}

/* ---------- Pad ---------- */

function render() {
  if (!session) return;
  const color = state?.color || '#888';
  document.documentElement.style.setProperty('--color', color);
  document.querySelector('meta[name=theme-color]').content = color;
  $('who').textContent = `${session.name}${state?.vip ? ' ⭐' : ''}`;

  const status = $('status');
  let action = '';
  status.replaceChildren();

  if (hostAway) {
    status.textContent = 'Big screen disconnected, hang on…';
  } else if (!state) {
    status.textContent = 'Connecting to the big screen…';
  } else if (state.phase === 'lobby') {
    status.textContent = state.vip
      ? 'You’re the VIP! Start when everyone is in.'
      : `Waiting for ${state.vipName || 'the VIP'} to start…`;
    if (state.vip) action = 'Start!';
  } else if (!state.inRound) {
    status.textContent = state.phase === 'results' ? 'Round over!' : 'You’re in next round!';
  } else if (state.phase === 'countdown') {
    status.textContent = 'Get ready!';
  } else if (state.phase === 'results' && state.result) {
    const big = document.createElement('span');
    big.className = 'big';
    big.textContent = `${state.result.percent}%`;
    status.append(big, `${ordinal(state.result.rank)} place${state.result.winner ? ' 🏆' : ''}`);
  }
  if (state?.phase === 'results' && state.vip && !hostAway) action = 'Play again';

  $('action').hidden = !action;
  $('action').textContent = action;
}

$('action').addEventListener('click', () => {
  net.send({ t: 'start' });
  navigator.vibrate?.(20);
});

function showFx(text, buzz) {
  const toast = $('toast');
  toast.textContent = text;
  toast.classList.remove('show');
  void toast.offsetWidth; // restart the animation
  toast.classList.add('show');
  if (buzz) navigator.vibrate?.(buzz);
}

function ordinal(n) {
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th';
  return `${n}${suffix}`;
}

/* ---------- Steering ---------- */

// pointerId -> side (-1 left, 1 right). The most recently pressed side wins,
// so you can hold one thumb down and tap the other to switch.
const pointers = new Map();
const keys = new Map();
const pad = $('pad');

const sideOf = e => (e.clientX < innerWidth / 2 ? -1 : 1);

function press(map, id, side) {
  if (map.get(id) === side) return;
  map.delete(id);
  map.set(id, side);
  updateDir();
}

function release(map, id) {
  if (map.delete(id)) updateDir();
}

function releaseAll() {
  pointers.clear();
  keys.clear();
  updateDir();
}

function updateDir() {
  const last = [...pointers.values(), ...keys.values()].pop() || 0;
  const held = new Set([...pointers.values(), ...keys.values()]);
  $('left').classList.toggle('down', held.has(-1));
  $('right').classList.toggle('down', held.has(1));
  if (last !== dir) {
    dir = last;
    sendDir();
    if (dir) navigator.vibrate?.(8);
  }
}

function sendDir(force) {
  if (session || force) net.send({ t: 'input', dir });
}

pad.addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;
  e.preventDefault();
  press(pointers, e.pointerId, sideOf(e));
});
pad.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) press(pointers, e.pointerId, sideOf(e));
});
['pointerup', 'pointercancel'].forEach(type =>
  pad.addEventListener(type, e => release(pointers, e.pointerId))
);
pad.addEventListener('contextmenu', e => e.preventDefault());

// Arrow keys / A-D, handy when testing with a desktop browser as "phone".
const KEY_SIDES = { ArrowLeft: -1, ArrowRight: 1, a: -1, d: 1 };
document.addEventListener('keydown', e => {
  if (!$('pad').hidden && KEY_SIDES[e.key]) press(keys, e.key, KEY_SIDES[e.key]);
});
document.addEventListener('keyup', e => release(keys, e.key));
window.addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') releaseAll();
  else keepAwake();
});

/* ---------- Helpers ---------- */

let wakeLock = null;
async function keepAwake() {
  if (!session || wakeLock || !navigator.wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => (wakeLock = null));
  } catch {}
}

// sessionStorage is per tab, so two tabs can be two players while testing.
function readSession() {
  try {
    return JSON.parse(storage(sessionStorage, 'pb-session'));
  } catch {
    return null;
  }
}

function saveSession() {
  storage(sessionStorage, 'pb-session', session ? JSON.stringify(session) : '');
}

function storage(store, key, value) {
  try {
    if (value === undefined) return store.getItem(key);
    store.setItem(key, value);
  } catch {}
}
