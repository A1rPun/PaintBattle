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
	object.prototype = {};
    return object;
}());