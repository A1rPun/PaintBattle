PB.pickup = (function(obj) {
  function rand(num) {
    return Math.floor(Math.random() * num);
  }

  const PICKUP_DURATION = 15 * 1000;
  const SMALL_PAINT_BOMBS = 50;
  const kinds = [
    /* Magic Brush */
    function(collisions, gameState) {
      var p = collisions.collision[0];
      p.radius += 5;
      p.speed += 0.5;
      p.handlers.push(
        gameState.setTimeout(function() {
          p.radius -= 5;
          p.speed -= 0.5;
        }, PICKUP_DURATION * 2)
      );
    },
    /* Magic shoe */
    function(collisions, gameState) {
      var p = collisions.collision[0];
      p.speed += 1.5;
      p.handlers.push(
        gameState.setTimeout(function() {
          p.speed -= 1.5;
        }, PICKUP_DURATION)
      );
    },
    /* Magic clock */
    function(collisions, gameState) {
      collisions.other.forEach(x => {
        x.freezed = true;
        x.handlers.push(
          gameState.setTimeout(() => {
            x.freezed = false;
          }, PICKUP_DURATION)
        );
      });
    },
    /* Magic potion */
    function(collisions, gameState) {
      collisions.other.forEach(x => {
        x.drawing = false;
        x.handlers.push(
          gameState.setTimeout(() => {
            x.drawing = true;
          }, PICKUP_DURATION)
        );
      });
    },
    /* Paint Bomb */
    function(collisions, gameState, ctx) {
      var p = collisions.collision[0];
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x | 0, p.position.y | 0, 120, 0, 180 * Math.PI, false);
      ctx.fill();
    },
    /* Small paint bombs */
    function(collisions, gameState, ctx, bounds) {
      var p = collisions.collision[0],
        radius = p.radius,
        bombs = 0;
      gameState.setInterval(function() {
        var x = rand(bounds.right - radius * 2) + radius,
          y = rand(bounds.bottom - radius * 2) + radius;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 180 * Math.PI, false);
        ctx.fill();

        bombs++;
        if (bombs === SMALL_PAINT_BOMBS) this.loop = false;
      }, SMALL_PAINT_BOMBS);
    },
    /* */
  ];

  // constructor
  function pickup(bounds) {
    var radius = 32,
      x = rand(bounds.right - radius * 2) + radius,
      y = rand(bounds.bottom - radius * 2) + radius;
    //TODO: find better spot on canvas
    obj.call(this, x, y);
    this.kind = rand(kinds.length);
    this.radius = radius;
  }
  extend(obj, pickup, {
    get: function(player, bounds, context, gameState) {
      var kind = kinds[this.kind];
      kind.apply(this, arguments);
    },
  });
  return pickup;
})(PB.object);
