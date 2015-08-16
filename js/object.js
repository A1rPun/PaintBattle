// Prototypal inheritance function
function extend(base, sub, proto) {
	if(proto)
		for(var key in proto)
			proto[key] = { value: proto[key], enumerable: true, configurable: true, writable: true };
    sub.prototype = Object.create(base.prototype, proto);
    sub.prototype.constructor = sub;
}
PB.object = (function () {
    function object(x, y) {
        this.position = new PB.vector(x || 0, y || 0);
    }
    object.prototype = {
        canCollide: true,
        checkCircleCollision: function (objects) {
            if (!objects) return;
            var x = this.position.x,
                y = this.position.y,
                result = {
                    collision: [],
                    other: []
                };

            for (var i = objects.length; i--;) {
                var obj = objects[i];
                if (!obj.canCollide) {
                    result.other.push(obj);
                    continue;
                }
                var xDistance = x - obj.position.x; // subtract the X distances from each other. 
                var yDistance = y - obj.position.y; // subtract the Y distances from each other. 
                var distance = new PB.vector(xDistance, yDistance).magnitude(); // the distance between the balls is the sqrt of Xsquared + Ysquared.
                var sumOfRadius = this.radius + obj.radius; // add the balls radius together
                // if the distance between them is less than the sum of radius they have collided.
                result[distance < sumOfRadius ? 'collision' : 'other'].push(obj);
            }
            //With pickups we need to do something with the result.. for now present a boolean
            return result;
        }
    };
    return object;
}());