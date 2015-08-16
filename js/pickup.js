PB.pickup = (function (obj) {
    function rand(num) {
        return Math.floor(Math.random() * num);
    }

    var PICKUP_DURATION = 5000,
        kinds = [
        /* Magic Brush */
        function (collisions, gameState) {
            var p = collisions.collision[0];
            p.radius += 5;
            gameState.setTimeout(function () {
                p.radius -= 5;
            }, PICKUP_DURATION);
        },
        /* Magic shoe */
        function (collisions, gameState) {
            var p = collisions.collision[0];
            p.speed += 1;
            gameState.setTimeout(function () {
                p.speed -= 1;
            }, PICKUP_DURATION);
        },
        /* Magic clock */
        function (collisions, gameState) {
            var others = collisions.other;

            for (var i = others.length; i--;)
                others[i].freezed = true;

            gameState.setTimeout(function () {
                for (var i = others.length; i--;)
                    others[i].freezed = false;
            }, PICKUP_DURATION);
        },
        /* Magic potion */
        function (collisions, gameState) {
            var others = collisions.other;

            for (var i = others.length; i--;)
                others[i].drawing = false;

            gameState.setTimeout(function () {
                for (var i = others.length; i--;)
                    others[i].drawing = true;
            }, PICKUP_DURATION);
        },
        /* Paint Bomb */
        function (collisions, gameState, ctx) {
            var p = collisions.collision[0];
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.position.x | 0, p.position.y | 0, 120, 0, 180 * Math.PI, false);
            ctx.fill();
        },
        /* Small paint bombs */
        function (collisions, gameState, ctx, bounds) {
            var p = collisions.collision[0],
                radius = p.radius,
                maxBombs = 25,
                bombs = 0;
            gameState.setInterval(function () {
                var x = rand(bounds.right - radius * 2) + radius,
                    y = rand(bounds.bottom - radius * 2) + radius;

                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 180 * Math.PI, false);
                ctx.fill();

                bombs++;
                if (bombs === maxBombs)
                    this.loop = false;
            }, PICKUP_DURATION / 100);
        }
        /* */
        ];

    // constructor
    function pickup(bounds) {
        var radius = 32,
            x = rand(bounds.right - radius * 2) + radius,
            y = rand(bounds.bottom - radius * 2) + radius;
        //TODO: find better spot on canvas
        obj.call(this, x, y);
        this.kind = rand(kinds.length);
        this.radius = radius;
    }
    extend(obj, pickup, {
        get: function (player, bounds, context, gameState) {
            var kind = kinds[this.kind];
            kind.apply(this, arguments);
        }
    });
    return pickup;
})(PB.object);