// Game clock driven by requestAnimationFrame at a fixed 60 steps per second.
// Timeouts/intervals ("moments") count game steps, so they freeze while paused.
const FPS60 = 1000 / 60;

class Moment {
  constructor(loop, fn, interval) {
    this.loop = loop;
    this.fn = fn;
    this.interval = interval || FPS60;
    this.delta = 0;
  }
}

export class Timer {
  constructor() {
    this.id = null;
    this.interval = FPS60;
    this.enabled = true;
    this.then = performance.now();
    this.moments = [];
    this.boundLoop = this.loop.bind(this);
    this.queue();
  }

  loop() {
    if (!this.enabled) return;
    const now = performance.now();
    const delta = now - this.then;

    if (delta > this.interval) {
      // keep the remainder for the next check
      this.then = now - (delta % this.interval);

      for (let i = this.moments.length; i--; ) {
        if (!this.enabled) return;
        // a callback may have removed moments, so the index can be stale
        const m = this.moments[i];
        if (!m) continue;
        m.delta += this.interval;

        if (m.delta < m.interval) continue;
        m.fn(m);
        m.delta = 0;

        if (!m.loop) this.clearTimeout(m);
      }
    }
    this.queue();
  }

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.then = performance.now();
    this.queue();
  }

  queue() {
    this.id = requestAnimationFrame(this.boundLoop);
  }

  stop() {
    this.enabled = false;
    if (this.id) cancelAnimationFrame(this.id);
  }

  setTimeout(fn, interval) {
    const m = new Moment(false, fn, interval);
    this.moments.push(m);
    return m;
  }

  setInterval(fn, interval) {
    const m = new Moment(true, fn, interval);
    this.moments.push(m);
    return m;
  }

  clearTimeout(m) {
    const index = this.moments.indexOf(m);
    if (index !== -1) this.moments.splice(index, 1);
    return index !== -1;
  }
}
