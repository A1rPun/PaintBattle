import { Entity } from './entity.js';

const PICKUP_DURATION = 15 * 1000;
const PAINT_RAIN_DROPS = 50;
const PAINT_RAIN_INTERVAL = 50;

const rand = num => Math.floor(Math.random() * num);

function paintCircle(ctx, color, x, y, radius) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

// Each kind gets ({ collision, other }, timer, ctx, bounds); collision[0] picked it up.
export const KINDS = [
  {
    key: 'brush',
    label: 'Magic Brush',
    get({ collision: [p] }, timer) {
      p.radius += 5;
      p.speed += 0.5;
      p.handlers.push(
        timer.setTimeout(() => {
          p.radius -= 5;
          p.speed -= 0.5;
        }, PICKUP_DURATION * 2)
      );
    },
  },
  {
    key: 'shoe',
    label: 'Magic Shoe',
    get({ collision: [p] }, timer) {
      p.speed += 1.5;
      p.handlers.push(timer.setTimeout(() => (p.speed -= 1.5), PICKUP_DURATION));
    },
  },
  {
    key: 'clock',
    label: 'Magic Clock',
    hits: 'Frozen!',
    get({ other }, timer) {
      other.forEach(x => {
        x.freezed = true;
        x.handlers.push(timer.setTimeout(() => (x.freezed = false), PICKUP_DURATION));
      });
    },
  },
  {
    key: 'potion',
    label: 'Magic Potion',
    hits: 'Out of paint!',
    get({ other }, timer) {
      other.forEach(x => {
        x.drawing = false;
        x.handlers.push(timer.setTimeout(() => (x.drawing = true), PICKUP_DURATION));
      });
    },
  },
  {
    key: 'bomb',
    label: 'Paint Bomb',
    get({ collision: [p] }, timer, ctx) {
      paintCircle(ctx, p.color, p.position.x | 0, p.position.y | 0, 120);
    },
  },
  {
    key: 'rain',
    label: 'Paint Rain',
    get({ collision: [p] }, timer, ctx, bounds) {
      const radius = p.radius;
      let drops = 0;
      timer.setInterval(m => {
        const x = rand(bounds.right - radius * 2) + radius;
        const y = rand(bounds.bottom - radius * 2) + radius;
        paintCircle(ctx, p.color, x, y, radius);
        if (++drops === PAINT_RAIN_DROPS) m.loop = false;
      }, PAINT_RAIN_INTERVAL);
    },
  },
];

export class Pickup extends Entity {
  constructor(bounds) {
    const radius = 32;
    //TODO: find better spot on canvas
    super(rand(bounds.right - radius * 2) + radius, rand(bounds.bottom - radius * 2) + radius);
    this.kind = KINDS[rand(KINDS.length)];
    this.radius = radius;
  }

  get(collisions, timer, ctx, bounds) {
    this.kind.get(collisions, timer, ctx, bounds);
  }
}
