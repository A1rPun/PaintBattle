PB.pickup = (function (obj) {
    function rand(num) {
        return Math.floor(Math.random() * num);
    }

    kinds = [{
        //Magic Brush
        execute: function (collisions) {
            collisions.collision[0].radius += 5;
        }
    }, {
        //Magic shoe
        execute: function (collisions) {
            collisions.collision[0].speed += 1;
        }
    }
    /*, {
        //Magic potion
        execute: function (collisions) {
            for (var i = collisions.other.length; i--;)
                collisions.other[i].drawing = false;
        }
    }*/];

    // constructor
    function pickup(area) {
        obj.call(this, rand(area.right), rand(area.bottom));
        this.kind = rand(kinds.length);
        this.radius = 64;
    }
    extend(obj, pickup, {
        get: function (player, bounds, context, gameState) {
            kinds[this.kind].execute.apply(this, arguments);
        }
    });
    return pickup;
})(PB.object);