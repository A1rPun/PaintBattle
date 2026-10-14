import { Entity } from './entity.js';
import { Vector } from './vector.js';

const DEFAULT_RADIUS = 25;
const DEFAULT_SPEED = 2;
const TURN_SPEED = 3;
const IMAGE_OFFSET = DEFAULT_RADIUS / 2;
const JUMP_HEIGHT = 5;
const GRAVITY = 0.1;
const STUN_TIME = 5000;

const rand = num => Math.floor(Math.random() * num);

export class Player extends Entity {
  constructor({ id, name = 'Player', color, x, y, degree = 0, isComputer = false }) {
    super(x, y);
    this.id = id;
    this.name = name;
    this.color = color;
    this.degree = degree;
    this.isComputer = isComputer;
    // -1 = turn left, 0 = straight, 1 = turn right. Set from the phone.
    this.dir = 0;

    this.speed = DEFAULT_SPEED;
    this.radius = DEFAULT_RADIUS;
    this.drawing = true;
    this.jumping = false;
    this.stunned = false;
    this.freezed = false;
    this.jumpSpeed = 0;
    this.imgOffset = IMAGE_OFFSET;
    // pending timeouts of power-ups/stuns; they all end early when bumped
    this.handlers = [];
  }

  addAngle(degree) {
    this.degree = (this.degree + degree + 360) % 360;
  }

  canDraw() {
    return !this.jumping && this.drawing;
  }

  resolve(distance) {
    const radian = (this.degree * Math.PI) / 180;
    return new Vector(
      this.position.x + Math.cos(radian) * distance,
      this.position.y + Math.sin(radian) * distance
    );
  }

  jump(timer) {
    this.canCollide = false;
    this.jumping = true;
    this.runHandlers(timer);
    this.jumpSpeed = -JUMP_HEIGHT;
    this.addAngle(180);
  }

  land(timer) {
    this.canCollide = true;
    this.jumping = false;
    this.runHandlers(timer);
  }

  runHandlers(timer) {
    this.handlers.forEach(m => timer.clearTimeout(m) && m.fn(m));
    this.handlers = [];
  }

  move(timer) {
    if (this.isComputer) this.addAngle(rand(20) - 10);
    else if (this.dir) this.addAngle(this.dir * TURN_SPEED);

    if (!this.freezed) this.position = this.resolve(this.stunned ? this.speed / 2 : this.speed);

    if (this.jumping) {
      this.jumpSpeed += GRAVITY;
      this.imgOffset -= this.jumpSpeed;

      if (this.imgOffset < IMAGE_OFFSET) {
        this.imgOffset = IMAGE_OFFSET;
        this.land(timer);
        this.stunned = true;
        this.handlers.push(timer.setTimeout(() => (this.stunned = false), STUN_TIME));
      }
    }
  }

  restrict(bounds) {
    const { position: p, radius: r } = this;
    p.x = Math.min(Math.max(p.x, bounds.left + r), bounds.right - r);
    p.y = Math.min(Math.max(p.y, bounds.top + r), bounds.bottom - r);
  }
}
