import { Vector } from './vector.js';

// Base for anything round on the canvas (players, pickups).
export class Entity {
  constructor(x = 0, y = 0) {
    this.position = new Vector(x, y);
    this.canCollide = true;
  }

  checkCircleCollision(objects) {
    const collision = [];
    const other = [];

    for (const obj of objects) {
      if (obj.canCollide) {
        const distance = this.position.subtract(obj.position).magnitude();
        if (distance < this.radius + obj.radius) {
          collision.push(obj);
          continue;
        }
      }
      other.push(obj);
    }
    return { collision, other };
  }
}
