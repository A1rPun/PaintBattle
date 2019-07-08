PB.timer = (function({ requestAnimationFrame, cancelAnimationFrame }) {
  const fps60 = 1000 / 60;

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
    loop: function() {
      var me = this;

      if (!me.enabled) return;
      me.now = Date.now();
      //TODO: delta update
      var delta = me.now - me.then;
      //me.delta = delta;

      if (delta > me.interval) {
        //add the remaining delta for the next check
        me.then = me.now - (delta % me.interval);

        for (var i = me.moments.length; i--; ) {
          var m = me.moments[i];
          m.delta += me.interval;

          if (m.delta < m.interval) continue;
          m.fn();
          m.delta = 0;

          if (!m.loop) me.moments.splice(i, 1);
        }
      }
      me.queue();
    },
    start: function() {
      var me = this;

      if (me.enabled) return;
      me.enabled = true;
      me.then = Date.now();
      me.queue();
    },
    queue: function() {
      this.id = requestAnimationFrame(this.boundLoop);
    },
    stop: function() {
      this.enabled = false;
      this.id && cancelAnimationFrame(this.id);
    },
    setTimeout: function(fn, interval) {
      var m = new moment(false, fn, interval);
      this.moments.push(m);
      return m;
    },
    setInterval: function(fn, interval) {
      var m = new moment(true, fn, interval);
      this.moments.push(m);
      return m;
    },
    clearTimeout: function(m) {
      const index = this.moments.indexOf(m);
      if (~index) this.moments.splice(index, 1);
      return !!~index;
    },
  };
  return timer;
})(window);
