PB.timer = (function (g) {
    var fps60 = 1000 / 60,
        requestAnimFrame = g.requestAnimationFrame
            || g.webkitRequestAnimationFrame
            || g.mozRequestAnimationFrame
            || function(callback) {
                g.setTimeout(callback, fps60);
            },
        cancelAnimFrame = g.cancelAnimationFrame
            || g.mozCancelAnimationFrame
            || g.clearTimeout;

    function moment(loop, fn, interval) {
        this.loop = loop;
        this.fn = fn;
        this.interval = interval || fps60;
        this.delta = 0;
    }

    function timer(disable) {
        var me = this;
        me.id = null;
        me.interval = fps60;
        me.enabled = disable ? false : true;
        me.then = Date.now();
        me.moments = [];
        //bind loop to variable because of the scope in requestAnimationFrame call.
        me.boundLoop = me.loop.bind(me);
        me.queue();
    }

    timer.prototype = {
        loop: function () {
            var me = this;

            if (!me.enabled)
                return;
            me.now = Date.now();
            //TODO: delta update
            var delta = me.now - me.then;
            //me.delta = delta;

            if (delta > me.interval) {
                //add the remaining delta for the next check
                me.then = me.now - (delta % me.interval);

                for (var i = me.moments.length; i--;) {
                    var m = me.moments[i];
                    m.delta += me.interval;

                    if (m.delta < m.interval)
                        continue;
                    m.fn();
                    m.delta = 0;

                    if (!m.loop) 
                        me.moments.splice(i, 1);
                }
            }
            me.queue();
        },
        start: function () {
            var me = this;

            if (me.enabled)
                return;
            me.enabled = true;
            me.then = Date.now();
            me.queue();
        },
        queue: function () {
            this.id = requestAnimFrame(this.boundLoop);
        },
        stop: function () {            
            this.enabled = false;
            this.id && cancelAnimFrame(this.id);
        },
        setTimeout: function (fn, interval) {
            var m = new moment(false, fn, interval);
            this.moments.push(m);
        },
        setInterval: function (fn, interval) {
            var m = new moment(true, fn, interval);
            this.moments.push(m);
        }
    };
    return timer;
})(window);
