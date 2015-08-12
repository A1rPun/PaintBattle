PB.player = (function (obj) {
    var DEFAULT_RADIUS = 25,
        DEFAULT_SPEED = 2,
        DEFAULT_TURN_SPEED = 3;
    // constructor
    function player(options) {
        //Default properties that can be overridden
		obj.call(this, 400, 300);
		this.name = 'Player';
		this.radius = DEFAULT_RADIUS;
		this.degree = 2;
		this.speed = DEFAULT_SPEED;
        if (arguments[0]) for (var prop in arguments[0]) this[prop] = arguments[0][prop];

        //Default properties that can't be overridden
        this.score = 0;
    }
    extend(obj, player, {
        move: function () {

            if (PB.keys[this.left]) {
                this.degree -= DEFAULT_TURN_SPEED;
            } else if (PB.keys[this.right]) {
                this.degree += DEFAULT_TURN_SPEED;
            }

            var //angle = Math.acos(this.x / this.magnitude()),
                //degrees = radians * 180 / PI;
                radian = this.degree * Math.PI / 180;
            x = this.position.x + (Math.cos(radian) * this.speed),
            y = this.position.y + (Math.sin(radian) * this.speed);
            this.position = new PB.vector(x, y);
        }
    });
    return player;
})(PB.object);