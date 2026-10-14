// The big screen: shows the lobby, runs the game and talks to the phones.
import { Player } from './player.js';
import { startGame } from './game.js';
import { connect } from './net.js';

const BOUNDS = { top: 0, right: 800, bottom: 600, left: 0 };
const COLORS = ['#FF5EAA', '#299EFE', '#FDBC56', '#67DB66', '#A66BFF', '#FF6B3D', '#3FD6D0', '#F2F25A'];
const MAX_PLAYERS = COLORS.length;
// e.g. /host?seconds=20 for short test rounds
const GAME_TIME = (Number(new URLSearchParams(location.search).get('seconds')) || 90) * 1000;

const $ = id => document.getElementById(id);

// Everyone in the room, across rounds: id -> { id, name, color, isBot, connected }
const roster = new Map();
let phase = 'lobby'; // lobby | countdown | playing | results
let room = null; // { code, token, joinBase }
let vipId = null; // the phone that may start the game
let game = null;
let round = null; // id -> Player, for the round being played
let results = null; // id -> { percent, rank, winner }
let botCount = 0;

const images = await loadImages({
  bg: 'img/canvas.png',
  brush: 'img/brush.png',
  clean: 'img/clean.png',
  pickup: 'img/present.png',
  plaster: 'img/plaster.png',
  scroll: 'img/scroll.png',
  shadow: 'img/shadow.png',
});
drawBackground();

const net = connect({
  onOpen() {
    net.send(room ? { t: 'host', code: room.code, token: room.token } : { t: 'host' });
  },
  onMessage: handleMessage,
  onStatus(status) {
    $('offline').hidden = status === 'online';
  },
});

/* ---------- Network ---------- */

function handleMessage(msg) {
  switch (msg.t) {
    case 'room':
      return onRoom(msg);
    case 'join':
      return addHuman(msg.id, msg.name);
    case 'rejoin':
      return setConnected(msg.id, true);
    case 'left':
      return setConnected(msg.id, false);
    case 'gone':
      return removePlayer(msg.id);
    case 'input': {
      const player = round?.get(msg.from);
      if (player) player.dir = Math.sign(Number(msg.dir) || 0);
      return;
    }
    case 'start':
      if (msg.from === vipId) startRound();
      return;
  }
}

function onRoom(msg) {
  if (room && room.code !== msg.code) {
    // Our old room expired while we were away; the phones in it are gone.
    for (const p of [...roster.values()]) if (!p.isBot) removePlayer(p.id);
  }
  room = { code: msg.code, token: msg.token, joinBase: msg.joinBase };

  const known = new Set(msg.players.map(p => p.id));
  for (const p of [...roster.values()]) if (!p.isBot && !known.has(p.id)) removePlayer(p.id);
  for (const p of msg.players) {
    if (!roster.has(p.id)) addHuman(p.id, p.name);
    setConnected(p.id, p.connected);
  }

  const joinUrl = `${room.joinBase}/?room=${room.code}`;
  $('qr').src = `/qr.svg?text=${encodeURIComponent(joinUrl)}`;
  $('joinHost').textContent = room.joinBase.replace(/^https?:\/\//, '');
  $('code').textContent = room.code;
  $('roomChip').textContent = `Join: ${$('joinHost').textContent} · ${room.code}`;
  render();
}

// What each phone should show. Sent whenever something changes; cheap with ≤8 phones.
function syncPhones() {
  for (const p of roster.values()) {
    if (p.isBot || !p.connected) continue;
    net.send({
      to: p.id,
      t: 'state',
      phase,
      name: p.name,
      color: p.color,
      vip: p.id === vipId,
      vipName: roster.get(vipId)?.name ?? null,
      inRound: !!round?.has(p.id),
      result: (phase === 'results' && results?.get(p.id)) || null,
    });
  }
}

function fx(id, text, buzz) {
  const p = roster.get(id);
  if (p && !p.isBot) net.send({ to: id, t: 'fx', text, buzz });
}

/* ---------- Roster ---------- */

function freeColor() {
  const used = new Set([...roster.values()].map(p => p.color));
  return COLORS.find(c => !used.has(c));
}

function addHuman(id, name) {
  if (roster.size >= MAX_PLAYERS) {
    // humans beat bots
    const bot = [...roster.values()].reverse().find(p => p.isBot);
    if (bot) roster.delete(bot.id);
  }
  if (roster.size >= MAX_PLAYERS) {
    net.send({ t: 'kick', id, reason: 'This game is full' });
    return;
  }
  roster.set(id, { id, name, color: freeColor(), isBot: false, connected: true });
  render();
}

function addBot() {
  if (roster.size >= MAX_PLAYERS || phase !== 'lobby') return;
  const id = `bot${++botCount}`;
  roster.set(id, { id, name: `Bot ${botCount}`, color: freeColor(), isBot: true, connected: true });
  render();
}

function removePlayer(id) {
  roster.delete(id);
  // Someone leaving mid-round keeps rolling around as a bot until the round ends.
  const player = round?.get(id);
  if (player) player.isComputer = true;
  render();
}

function setConnected(id, connected) {
  const p = roster.get(id);
  if (!p) return;
  p.connected = connected;
  const player = round?.get(id);
  if (player) {
    player.isComputer = !connected;
    player.dir = 0;
  }
  render();
}

function chooseVip() {
  const humans = [...roster.values()].filter(p => !p.isBot);
  if (humans.some(p => p.id === vipId && p.connected)) return;
  vipId = (humans.find(p => p.connected) || humans[0])?.id ?? null;
}

/* ---------- Rounds ---------- */

function startRound() {
  if (!roster.size || phase === 'countdown' || phase === 'playing') return;
  game?.stop();
  results = null;

  const midX = BOUNDS.right / 2;
  const midY = BOUNDS.bottom / 2;
  const entries = [...roster.values()];
  const spread = 40 + entries.length * 6;
  round = new Map(
    entries.map((p, i) => {
      const degree = (225 + (i * 360) / entries.length) % 360;
      const radian = (degree * Math.PI) / 180;
      const player = new Player({
        id: p.id,
        name: p.name,
        color: p.color,
        degree,
        x: midX + Math.cos(radian) * spread,
        y: midY + Math.sin(radian) * spread,
        isComputer: p.isBot || !p.connected,
      });
      return [p.id, player];
    })
  );

  game = startGame({
    paintCanvas: $('PB'),
    propCanvas: $('Prop'),
    bounds: BOUNDS,
    players: [...round.values()],
    images,
    gameTime: GAME_TIME,
    onPhase(newPhase) {
      phase = newPhase;
      render();
    },
    onEvent,
    onEnd(result) {
      results = new Map(result.players.map(r => [r.id, r]));
      phase = 'results';
      render();
    },
  });
  playMusic('game');
}

function onEvent(event) {
  if (event.type === 'bump') {
    event.players.forEach(p => fx(p.id, 'Bonk!', [150]));
  } else if (event.type === 'pickup') {
    fx(event.player.id, `${event.kind.label}!`, [30, 40, 30]);
    if (event.kind.hits) event.others.forEach(p => fx(p.id, event.kind.hits, [250]));
  }
}

function toLobby() {
  if (phase !== 'results') return;
  game?.stop();
  game = null;
  round = null;
  results = null;
  phase = 'lobby';
  const ctx = $('Prop').getContext('2d');
  ctx.clearRect(0, 0, BOUNDS.right, BOUNDS.bottom);
  playMusic('menu');
  render();
}

/* ---------- Screen ---------- */

function render() {
  chooseVip();
  $('lobby').hidden = phase !== 'lobby';
  $('resultsBar').hidden = phase !== 'results';
  $('roomChip').hidden = phase === 'lobby' || !room;

  const list = $('players');
  list.replaceChildren(
    ...[...roster.values()].map(p => {
      const li = document.createElement('li');
      li.style.setProperty('--color', p.color);
      li.textContent = p.name;
      li.classList.toggle('away', !p.connected);
      li.classList.toggle('bot', p.isBot);
      const tag = p.isBot ? 'bot · click to remove' : !p.connected ? 'reconnecting…' : p.id === vipId ? 'VIP' : '';
      if (tag) {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        li.append(span);
      }
      if (p.isBot) li.onclick = () => removePlayer(p.id);
      return li;
    })
  );
  $('count').textContent = `${roster.size}/${MAX_PLAYERS}`;
  $('start').disabled = !roster.size;
  $('addBot').disabled = roster.size >= MAX_PLAYERS;
  syncPhones();
}

$('start').onclick = startRound;
$('again').onclick = startRound;
$('addBot').onclick = addBot;
$('toLobby').onclick = toLobby;

document.addEventListener('keydown', e => {
  if (e.target.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return;
  if (e.key === 'Enter') startRound();
  else if (e.key === 'Escape') toLobby();
  else if (e.key === ' ' && game && phase !== 'results') game.togglePause();
  else if (e.key.toLowerCase() === 'b') addBot();
  else if (e.key.toLowerCase() === 'm') toggleMute();
});

function drawBackground() {
  const canvas = $('BG');
  canvas.width = BOUNDS.right;
  canvas.height = BOUNDS.bottom;
  canvas.getContext('2d').drawImage(images.bg, 0, 0, BOUNDS.right, BOUNDS.bottom);
}

function loadImages(sources) {
  return Promise.all(
    Object.entries(sources).map(
      ([key, src]) =>
        new Promise(resolve => {
          const img = new Image();
          img.onload = img.onerror = () => resolve([key, img]);
          img.src = src;
        })
    )
  ).then(Object.fromEntries);
}

/* ---------- Music ---------- */

const music = { menu: new Audio('snd/mainmenu.mp3'), game: new Audio('snd/game.mp3') };
Object.values(music).forEach(a => (a.loop = true));
let currentMusic = null;
let muted = false;
try {
  muted = localStorage.getItem('pb-muted') === '1';
} catch {}

function playMusic(name) {
  currentMusic?.pause();
  currentMusic = music[name];
  currentMusic.currentTime = 0;
  if (!muted) currentMusic.play().catch(() => {});
}

function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('pb-muted', muted ? '1' : '0');
  } catch {}
  if (muted) currentMusic?.pause();
  else currentMusic?.play().catch(() => {});
}

// Browsers block autoplay until the page has been interacted with.
['pointerdown', 'keydown'].forEach(type =>
  document.addEventListener(type, () => {
    if (!muted && currentMusic?.paused) currentMusic.play().catch(() => {});
  })
);

playMusic('menu');
render();
