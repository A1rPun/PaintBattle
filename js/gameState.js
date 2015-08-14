PB.gameState = (function (g) {

    // constructor
    function gameState(o) {
        var me = this;

        if (o) {
            me.canvas = o.canvas;
            me.ctx = o.context || me.canvas.getContext('2d');
            me.states = o.states || {};
            me.setFps(o.fps || 60);
        }
        me.pause = true;
        me.then = Date.now();
        //bind loop to variable because of requestAnimationFrame call.
        me.boundLoop = me.loop.bind(me);
    }

    gameState.prototype = {
        clear: function () {
            var c = this.canvas;
            this.ctx.clearRect(0, 0, c.width, c.height);
        },
        setFps: function (F) {
            this.interval = 1000 / F;
        },
        isState: function (state) {
            return this.state === state
        },
        loop: function () {
            var me = this;
            if (!me.pause) {
                me.now = Date.now();
                var delta = me.now - me.then;

                if (delta > me.interval) {
                    me.then = me.now - (delta % me.interval);
                    me.clear();
                    me.update && me.update(delta);
                }
                me.queue();
                me.loops++;
            }
        },
        queue: function () {
            g.requestAnimationFrame(this.boundLoop);
        },
        start: function (state) {
            var me = this;
            me.state = state;
            me.loops = 0;
            me.update = me.states[me.state];

            if (me.pause) {
                me.pause = false;
                me.queue();
            }
        },
        stop: function () {
            this.pause = true;
        }
    };
    return gameState;
})(window);
/*
PB.timer = (function (g) {
    var requestAnimFrame = g.requestAnimationFrame
            || g.webkitRequestAnimationFrame
            || g.mozRequestAnimationFrame
            || function(callback) {
                g.setTimeout(callback, 1000 / 60);
            },
        cancelAnimFrame = g.cancelAnimationFrame
            || g.mozCancelAnimationFrame
            || g.clearTimeout;


    function timer() {
        var me = this;
        me.interval = interval || 1000 / 60;
        me.enabled = disable ? false : true;
        me.then = Date.now();
        //bind loop to variable because of requestAnimationFrame call.
        me.boundLoop = fn.bind(me);
    }

    function loop() {
        requestAnimFrame(loop);
    }
    requestAnimFrame(loop);

    timer.prototype = {
        loop: function () {
            var me = this;
            if (me.pause) return;

            me.now = Date.now();
            var delta = me.now - me.then;

            if (delta > me.interval) {
                me.then = me.now - (delta % me.interval);
            }
        },
        start: function (state) {
            var me = this;
            me.update = me.states[me.state];

            if (!me.enabled) {
                me.enabled = true;
                me.queue();
            }
        },
        stop: function () {
            this.enabled = false;
        }
    };
    return {
        timeout: function (fn, interval, disable) {
            return new timer();
        },
        interval: function (fn, interval, disable) {
            
        }
    };
})(window);
*/