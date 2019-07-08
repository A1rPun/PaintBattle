// Prototypal inheritance function
function extend(base, sub, proto) {
  if (proto)
    for (var key in proto)
      proto[key] = { value: proto[key], enumerable: true, configurable: true, writable: true };
  sub.prototype = Object.create(base.prototype, proto);
  sub.prototype.constructor = sub;
}
PB.object = (function() {
  function object(x, y) {
    this.position = new PB.vector(x || 0, y || 0);
  }
  object.prototype = {
    canCollide: true,
    checkCircleCollision: function(objects) {
      if (!objects) return;
      const x = this.position.x;
      const y = this.position.y;
      const collision = [];
      const other = [];

      for (var i = objects.length; i--; ) {
        var obj = objects[i];

        if (obj.canCollide) {
          var xDistance = x - obj.position.x;
          var yDistance = y - obj.position.y;
          var distance = new PB.vector(xDistance, yDistance).magnitude();
          var sumOfRadius = this.radius + obj.radius;

          if (distance < sumOfRadius) {
            collision.push(obj);
            continue;
          }
        }
        other.push(obj);
      }
      return { collision, other };
    },
  };
  return object;
})();
