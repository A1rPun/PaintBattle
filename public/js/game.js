import { Timer } from './timer.js';
import { Pickup } from './pickup.js';

const DEFAULT_GAME_TIME = 90 * 1000;
const PICKUP_INTERVAL = 25 * 1000;
const COUNTDOWN = 3;

// Runs one round on the host screen. Paint accumulates on `paintCanvas`;
// rollers, pickups and text are redrawn on `propCanvas` every step.
// Calls onPhase('countdown' | 'playing'), onEvent({ type, ... }) and onEnd(result).
export function startGame({
  paintCanvas,
  propCanvas,
  bounds,
  players,
  images,
  gameTime = DEFAULT_GAME_TIME,
  onPhase = () => {},
  onEvent = () => {},
  onEnd = () => {},
}) {
  const ctx = paintCanvas.getContext('2d', { willReadFrequently: true });
  const propCtx = propCanvas.getContext('2d');
  const timer = new Timer();
  let pickups = [];
  let paused = false;
  let ended = false;
  let secondsLeft = Math.round(gameTime / 1000);

  paintCanvas.width = propCanvas.width = bounds.right;
  paintCanvas.height = propCanvas.height = bounds.bottom;
  countdown();

  return {
    togglePause() {
      if (ended) return paused;
      paused = !paused;
      if (paused) {
        timer.stop();
        drawBanner('Paused');
      } else {
        timer.start();
      }
      return paused;
    },
    stop() {
      ended = true;
      timer.stop();
    },
  };

  function countdown() {
    let time = COUNTDOWN;
    onPhase('countdown');
    const tick = () => {
      propCtx.clearRect(0, 0, bounds.right, bounds.bottom);
      drawPlayers();
      drawBanner(time--, 210);
    };
    tick();
    const interval = timer.setInterval(() => {
      if (time) return tick();
      timer.clearTimeout(interval);
      startPlaying();
    }, 1000);
  }

  function startPlaying() {
    onPhase('playing');
    timer.setInterval(update);
    timer.setTimeout(endGame, gameTime);
    timer.setInterval(() => secondsLeft--, 1000);
    timer.setInterval(() => pickups.push(new Pickup(bounds)), PICKUP_INTERVAL);
  }

  function endGame() {
    ended = true;
    timer.stop();
    const result = getGameResult();
    propCtx.clearRect(0, 0, bounds.right, bounds.bottom);
    const margin = 96;
    propCtx.drawImage(
      images.scroll,
      margin,
      margin,
      bounds.right - margin * 2,
      bounds.bottom - margin * 2
    );

    const rows = [...result.players, { name: 'Total', percent: result.total }];
    const spacing = Math.min(48, 280 / rows.length);
    propCtx.font = `${Math.round(spacing * 0.66)}px Verdana`;
    const theX = bounds.right / 2 - 180;
    rows.forEach((x, i) => {
      const theY = i * spacing + 200;
      propCtx.fillStyle = x.color || '#000';
      propCtx.fillText(`${x.name}:`, theX, theY);
      propCtx.fillText(`${x.percent}% ${x.winner ? '🏆' : ''}`, theX + 250, theY);
    });
    onEnd(result);
  }

  function drawBanner(text, size = 120) {
    propCtx.save();
    propCtx.font = `bold ${size}px Verdana`;
    propCtx.textAlign = 'center';
    propCtx.textBaseline = 'middle';
    propCtx.lineWidth = 3;
    propCtx.fillStyle = 'lightblue';
    propCtx.strokeStyle = 'blue';
    propCtx.fillText(text, bounds.right / 2, bounds.bottom / 2);
    propCtx.strokeText(text, bounds.right / 2, bounds.bottom / 2);
    propCtx.restore();
  }

  function drawClock() {
    propCtx.save();
    propCtx.font = 'bold 28px Verdana';
    propCtx.textAlign = 'center';
    propCtx.lineWidth = 4;
    propCtx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    propCtx.fillStyle = secondsLeft <= 10 ? '#ff5050' : '#fff';
    propCtx.strokeText(secondsLeft, bounds.right / 2, 36);
    propCtx.fillText(secondsLeft, bounds.right / 2, 36);
    propCtx.restore();
  }

  function updatePlayers() {
    for (const player of players) {
      player.move(timer);
      player.restrict(bounds);

      if (player.canCollide) {
        player.canCollide = false;
        const { collision } = player.checkCircleCollision(players);
        player.canCollide = true;

        if (collision.length) {
          collision.forEach(x => x.jump(timer));
          player.jump(timer);
          onEvent({ type: 'bump', players: [player, ...collision] });
        }
      }
    }
  }

  function drawPlayers() {
    for (const player of players) {
      const solved = player.resolve(player.radius);
      const x = player.position.x | 0;
      const y = player.position.y | 0;
      const r = player.radius;

      propCtx.drawImage(images.shadow, x - r, y - r, r * 2, r * 2);
      propCtx.drawImage(
        player.drawing ? images.brush : images.clean,
        x - r,
        y - r - player.imgOffset,
        r * 2,
        r * 2
      );
      if (player.stunned) {
        propCtx.drawImage(images.plaster, x - r / 2, y - r, r, r);
      }

      // heading direction line
      propCtx.beginPath();
      propCtx.moveTo(x, y);
      propCtx.lineTo(solved.x, solved.y);
      propCtx.stroke();

      // name tag, so everyone can find themselves on the shared screen
      propCtx.save();
      propCtx.font = 'bold 13px Verdana';
      propCtx.textAlign = 'center';
      propCtx.lineWidth = 3;
      propCtx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      propCtx.fillStyle = player.color;
      propCtx.strokeText(player.name, x, y - r - player.imgOffset - 4);
      propCtx.fillText(player.name, x, y - r - player.imgOffset - 4);
      propCtx.restore();

      if (!player.canDraw()) continue;
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  function updatePickups() {
    pickups = pickups.filter(pickup => {
      const collisions = pickup.checkCircleCollision(players);
      if (!collisions.collision.length) return true;

      onEvent({
        type: 'pickup',
        kind: pickup.kind,
        player: collisions.collision[0],
        others: collisions.other,
      });
      pickup.get(collisions, timer, ctx, bounds);
      return false;
    });
  }

  function drawPickups() {
    for (const pickup of pickups) {
      const { x, y } = pickup.position;
      const r = pickup.radius;
      propCtx.drawImage(images.pickup, x - r, y - r, r * 2, r * 2);
    }
  }

  function update() {
    propCtx.clearRect(0, 0, bounds.right, bounds.bottom);
    updatePlayers();
    drawPlayers();
    updatePickups();
    drawPickups();
    drawClock();
  }

  function hexToRgb(hex) {
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  }

  // Count painted pixels per player by matching each pixel to the closest
  // player colour (anti-aliased edges blend colours a bit).
  function getGameResult() {
    const data = ctx.getImageData(0, 0, bounds.right, bounds.bottom).data;
    const playerColors = players.map(p => hexToRgb(p.color));
    const counts = new Array(players.length).fill(0);
    const closestCache = new Map();
    const amountOfPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) continue; // unpainted
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = (r << 16) | (g << 8) | b;
      let closest = closestCache.get(key);
      if (closest === undefined) {
        let best = Infinity;
        playerColors.forEach(([pr, pg, pb], index) => {
          const diff = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
          if (diff < best) {
            best = diff;
            closest = index;
          }
        });
        closestCache.set(key, closest);
      }
      counts[closest]++;
    }

    const result = players.map((player, i) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      percent: Math.round((counts[i] * 100) / amountOfPixels),
    }));
    const sorted = result.map(x => x.percent).sort((a, b) => b - a);
    result.forEach(x => {
      x.rank = sorted.indexOf(x.percent) + 1;
      x.winner = x.rank === 1;
    });
    return { players: result, total: result.reduce((acc, x) => acc + x.percent, 0) };
  }
}
