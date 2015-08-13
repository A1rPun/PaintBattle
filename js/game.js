PB.startGame = function (players) {
    function rand(num) {
        return Math.floor(Math.random() * num);
    }
	
    var canvas = document.getElementById('PB'),
        ctx = canvas.getContext("2d"),
        pause = false,
        gameState = new PB.gameState({
            doClear: false,
            fps: 60,
            canvas: canvas,
            context: ctx,
            states: { game: update }
        }),
        bounds = {
            top: 0,
            right: 800,
            bottom: 600,
            left: 0
        };

    init();
    function init() {
        canvas.width = bounds.right;
        canvas.height = bounds.bottom;
        ctx.drawImage(PB.images.bg, 0, 0, bounds.right, bounds.bottom);
        gameState.start('game');

        PB.keyHandler = function (key) {
            //space
            if (key === 32) {
                if (pause) {
                    pause = false;
                    gameState.start('game');
                } else {
                    pause = true;
                    gameState.stop();
                }
            }
        }
    }

    function updatePlayers() {
        for (var i = players.length; i--;) {
            var player = players[i];
            player.move();
            player.restrict(bounds);
        }
    }

    function drawPlayers() {
        for (var i = players.length; i--;) {
            var player = players[i];
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.position.x, player.position.y, player.radius, 0, 2 * Math.PI, false);
            ctx.fill();
        }
    }

    function update() {
        updatePlayers();
        drawPlayers();
    }
};