// Paint Battle server: serves the static files in public/ and relays messages
// between one "host" screen (which runs the game) and the phones in its room.
// The server holds no game state; it only knows rooms and who is connected.
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import qrcode from 'qrcode-generator';

const PORT = Number(process.env.PORT) || 3000;
// Set when deployed behind a domain, e.g. PUBLIC_URL=https://paint.example.com
const PUBLIC_URL = process.env.PUBLIC_URL?.replace(/\/$/, '');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const MAX_PLAYERS = 8;
const HOST_GRACE_MS = 60 * 1000; // keep a room alive this long while its screen reconnects
const PLAYER_GRACE_MS = 2 * 60 * 1000; // keep a phone's slot this long while it reconnects
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O
const PLAYER_MESSAGES = new Set(['input', 'start']); // what phones may send to the host

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};

/* ---------- HTTP ---------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/qr.svg') {
    const text = (url.searchParams.get('text') || '').slice(0, 256);
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    res.writeHead(200, { 'content-type': MIME['.svg'], 'cache-control': 'max-age=3600' });
    return res.end(qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }));
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return notFound(res);
  }
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/host') pathname = '/host.html';

  const file = path.join(ROOT, path.normalize(pathname));
  if (!file.startsWith(ROOT + path.sep)) return notFound(res);

  try {
    const data = await fs.readFile(file);
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(data);
  } catch {
    notFound(res);
  }
});

function notFound(res) {
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
}

function lanAddress() {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter(a => a && a.family === 'IPv4' && !a.internal)
    .map(a => a.address);
  return addresses.find(a => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(a)) || addresses[0];
}

// The URL phones should open. When the host screen itself uses "localhost",
// phones can't reach that, so swap in this machine's LAN address.
function joinBaseFor(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  const url = new URL(`${proto}://${host}`);
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    const ip = lanAddress();
    if (ip) url.hostname = ip;
  }
  return url.origin;
}

/* ---------- Rooms ---------- */

const rooms = new Map(); // code -> room

function createRoom(joinBase) {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_LETTERS[crypto.randomInt(CODE_LETTERS.length)]).join('');
  } while (rooms.has(code));

  const room = {
    code,
    token: crypto.randomUUID(),
    joinBase,
    host: null,
    hostTimer: null,
    players: new Map(), // id -> { id, name, token, ws, goneTimer }
    nextId: 1,
  };
  rooms.set(code, room);
  return room;
}

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function toHost(room, msg) {
  send(room.host, msg);
}

function toPlayers(room, msg) {
  for (const player of room.players.values()) send(player.ws, msg);
}

function closeRoom(room) {
  toPlayers(room, { t: 'closed' });
  for (const player of room.players.values()) {
    clearTimeout(player.goneTimer);
    if (player.ws) player.ws.room = null;
  }
  rooms.delete(room.code);
}

function removePlayer(room, player) {
  clearTimeout(player.goneTimer);
  room.players.delete(player.id);
  if (player.ws) player.ws.room = null;
}

function attachHost(ws, room) {
  if (room.host && room.host !== ws) {
    room.host.room = null;
    room.host.close();
  }
  clearTimeout(room.hostTimer);
  room.host = ws;
  ws.room = room;
  ws.role = 'host';
  send(ws, {
    t: 'room',
    code: room.code,
    token: room.token,
    joinBase: room.joinBase,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, connected: !!p.ws })),
  });
  toPlayers(room, { t: 'host-back' });
}

function onHost(ws, req, msg) {
  const existing = rooms.get(msg.code);
  if (existing && existing.token === msg.token) return attachHost(ws, existing);
  attachHost(ws, createRoom(joinBaseFor(req)));
}

function onJoin(ws, msg) {
  const code = String(msg.code || '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return send(ws, { t: 'error', reason: `No game found with code ${code || '…'}` });

  let player = msg.token && [...room.players.values()].find(p => p.token === msg.token);
  if (player) {
    // Same phone coming back (reload, lock screen, network switch).
    clearTimeout(player.goneTimer);
    if (player.ws && player.ws !== ws) {
      player.ws.room = null;
      player.ws.close();
    }
    toHost(room, { t: 'rejoin', id: player.id });
  } else {
    if (room.players.size >= MAX_PLAYERS) return send(ws, { t: 'error', reason: 'This game is full' });
    const name = String(msg.name || '').trim().slice(0, 12) || `Player ${room.nextId}`;
    player = { id: `p${room.nextId++}`, name, token: crypto.randomUUID(), ws: null, goneTimer: null };
    room.players.set(player.id, player);
    toHost(room, { t: 'join', id: player.id, name: player.name });
  }

  player.ws = ws;
  ws.room = room;
  ws.role = 'player';
  ws.playerId = player.id;
  send(ws, { t: 'joined', id: player.id, name: player.name, token: player.token, code: room.code });
  if (!room.host) send(ws, { t: 'host-away' });
}

function onHostMessage(room, msg) {
  if (msg.t === 'kick') {
    const player = room.players.get(msg.id);
    if (!player) return;
    send(player.ws, { t: 'kicked', reason: msg.reason || 'Removed from the game' });
    removePlayer(room, player);
    return;
  }
  const { to, ...rest } = msg;
  if (to === '*') toPlayers(room, rest);
  else send(room.players.get(to)?.ws, rest);
}

function onPlayerMessage(ws, room, msg) {
  const player = room.players.get(ws.playerId);
  if (!player || player.ws !== ws) return;

  if (msg.t === 'leave') {
    removePlayer(room, player);
    toHost(room, { t: 'gone', id: player.id });
    return;
  }
  if (PLAYER_MESSAGES.has(msg.t)) toHost(room, { ...msg, from: player.id });
}

function onClose(ws) {
  const room = ws.room;
  if (!room) return;

  if (ws.role === 'host' && room.host === ws) {
    room.host = null;
    toPlayers(room, { t: 'host-away' });
    room.hostTimer = setTimeout(() => closeRoom(room), HOST_GRACE_MS);
  } else if (ws.role === 'player') {
    const player = room.players.get(ws.playerId);
    if (!player || player.ws !== ws) return;
    player.ws = null;
    toHost(room, { t: 'left', id: player.id });
    player.goneTimer = setTimeout(() => {
      removePlayer(room, player);
      toHost(room, { t: 'gone', id: player.id });
    }, PLAYER_GRACE_MS);
  }
}

/* ---------- WebSocket ---------- */

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4 * 1024 });

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  ws.on('close', () => onClose(ws));
  ws.on('message', data => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== 'string') return;

    if (msg.t === 'host') return onHost(ws, req, msg);
    if (msg.t === 'join') return onJoin(ws, msg);
    if (!ws.room) return;
    if (ws.role === 'host') onHostMessage(ws.room, msg);
    else onPlayerMessage(ws, ws.room, msg);
  });
});

// Phones that lock their screen often vanish without a close frame.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 10 * 1000);
wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => {
  const ip = lanAddress();
  console.log(`Paint Battle running`);
  console.log(`  Big screen: http://localhost:${PORT}/host`);
  if (ip) console.log(`  Phones:     http://${ip}:${PORT}`);
});
