PB.player = (function (obj) {
    function rand(num) {
        return Math.floor(Math.random() * num);
    }

    var DEFAULT_RADIUS = 20,
        DEFAULT_SPEED = 2,
        DEFAULT_TURN_SPEED = 3,
        DEFAULT_IMAGE_OFFSET = DEFAULT_RADIUS / 2,
        JUMP_HEIGHT = 5,
        GRAVITY = 0.1;

    // constructor
    function player(options) {
        //Default properties that can be overridden
		obj.call(this, options && options.x, options && options.y);
		this.name = 'Player';
		this.degree = 0;

        if (arguments[0]) for (var prop in arguments[0]) this[prop] = arguments[0][prop];

        //Default properties that can't be overridden
        this.speed = DEFAULT_SPEED;
        this.radius = DEFAULT_RADIUS;
        this.drawing = true;
        this.jumping = false;        
        this.stunned = false;
        this.freezed = false;
        this.jumpSpeed = 0;
        this.imgOffset = DEFAULT_IMAGE_OFFSET;
    }
    extend(obj, player, {
        addAngle: function (degree) {
            this.degree = this.degree + degree % 360;
        },
        canDraw: function(){
            return !this.jumping && this.drawing;
        },
        resolve: function (speed) {
            //degrees = radians * 180 / Math.PI;
            var radian = this.degree * Math.PI / 180;
                x = this.position.x + (Math.cos(radian) * speed),
                y = this.position.y + (Math.sin(radian) * speed);
            return new PB.vector(x, y);
        },
        jump: function () {
            this.canCollide = false;
            this.jumping = true;
            this.jumpSpeed = JUMP_HEIGHT * -1;
            this.addAngle(180);
        },
        move: function (timer) {
            var me = this;

            if (me.isComputer) {
                me.addAngle(rand(20) - 10);
            }else if (PB.keys[me.left]) {
                me.addAngle(-DEFAULT_TURN_SPEED);
            } else if (PB.keys[me.right]) {
                me.addAngle(DEFAULT_TURN_SPEED);
            }

            if (!me.freezed)
                me.position = me.resolve(me.stunned ? me.speed / 2 : me.speed);

            if (me.jumping) {
                me.jumpSpeed += GRAVITY;
                me.imgOffset -= me.jumpSpeed;

                if (me.imgOffset < DEFAULT_IMAGE_OFFSET) {
                    me.imgOffset = DEFAULT_IMAGE_OFFSET;
                    me.jumping = false;
                    me.canCollide = true;
                    me.stunned = true;
                    //TODO: Collision while stunned needs to be handled correctly with multiple timeouts (1 preferred)
                    timer.setTimeout(function () {
                        me.stunned = false;
                    }, 5000)
                }
            }
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