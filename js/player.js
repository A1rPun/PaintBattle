PB.player = (function (obj) {
    var DEFAULT_RADIUS = 20,
        DEFAULT_SPEED = 2,
        DEFAULT_TURN_SPEED = 3;
    // constructor
    function player(options) {
        //Default properties that can be overridden
		obj.call(this, options && options.x, options && options.y);
		this.name = 'Player';
		this.degree = 0;

        if (arguments[0]) for (var prop in arguments[0]) this[prop] = arguments[0][prop];

        //Default properties that can't be overridden
        this.score = 0;
        this.canDraw = true;
        this.speed = DEFAULT_SPEED;
        this.radius = DEFAULT_RADIUS;
        
    }
    extend(obj, player, {
        move: function () {
            var me = this;

            if (PB.keys[me.left]) {
                me.degree -= DEFAULT_TURN_SPEED;
            } else if (PB.keys[me.right]) {
                me.degree += DEFAULT_TURN_SPEED;
            }
            //degrees = radians * 180 / Math.PI;
            var radian = me.degree * Math.PI / 180;
            x = me.position.x + (Math.cos(radian) * me.speed),
            y = me.position.y + (Math.sin(radian) * me.speed);
            me.position = new PB.vector(x, y);
        },
        restrict: function (bounds) {
            var me = this;

            if (me.position.x < bounds.left + me.radius)
                me.position.x = bounds.left + me.radius;
            else if (me.position.x > bounds.right - me.radius)
                me.position.x = bounds.right - me.radius;

            if (me.position.y < bounds.top + me.radius)
                me.position.y = bounds.top + me.radius;
            else if (me.position.y > bounds.bottom - me.radius)
                me.position.y = bounds.bottom - me.radius;
        }
    });
    return player;
})(PB.object);