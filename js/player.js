PB.player = (function (obj) {
    // constructor
    function player(options) {
        //Default properties that can be overridden
		obj.call(this,0,0,0,0);
        this.name = 'Player';
        if (arguments[0]) for (var prop in arguments[0]) this[prop] = arguments[0][prop];

        //Default properties that can't be overridden
        this.score = 0;
    }
	extend(obj, player, {
        move: function(){
		
		}
    });
    return player;
})(PB.object);