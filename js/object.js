// Prototypal inheritance function
function extend(base, sub, proto) {
	if(proto)
		for(var key in proto)
			proto[key] = { value: proto[key], enumerable: true, configurable: true, writable: true };
    sub.prototype = Object.create(base.prototype, proto);
    sub.prototype.constructor = sub;
}
PB.object = (function () {
    function object(x, y, veloX, veloY) {
        this.position = new PB.vector(x, y);
        this.velocity = new PB.vector(veloX, veloY);
        this.update = function () { this.position = this.position.add(this.velocity); };
    }
	object.prototype = {};
    return object;
}());