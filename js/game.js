PB.startGame = function (bounds, players) {
    var canvas = document.getElementById('PB'),
        ctx = canvas.getContext("2d"),
        propCanvas = document.getElementById('Prop'),
        propCtx = propCanvas.getContext("2d"),
        pause = false,
        gameState = new PB.gameState({
            canvas: propCanvas,
            context: propCtx,
            fps: 60,
            states: { game: update }
        });

    init();
    function init() {
        canvas.width = bounds.right;
        canvas.height = bounds.bottom;
        propCanvas.width = bounds.right;
        propCanvas.height = bounds.bottom;
        gameState.start('game');

        setTimeout(function() {
            alert(findWinner().join('\n'));
            gameState.stop();
        }, 60000);

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
            propCtx.drawImage(
                PB.images.brush, (player.position.x | 0) - player.radius, (player.position.y | 0) - player.radius - player.radius / 2,
                player.radius *2, player.radius*2
            );
            if (!player.canDraw) continue;
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.position.x | 0, player.position.y | 0, player.radius, 0, 2 * Math.PI, false);
            ctx.fill();
        }
    }

    function update() {
        updatePlayers();
        drawPlayers();
    }

    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    function findWinner() {
        var amountOfPixels = bounds.right * bounds.bottom,
            colors = {},
            imageData = ctx.getImageData(0, 0, bounds.right, bounds.bottom).data;
        
        for (var i = 0, n = imageData.length; i < n; i += 4) {
            var r = imageData[i],
                g = imageData[i + 1],
                b = imageData[i + 2],
                a = imageData[i + 3],
                hex = rgbToHex(r, g, b);

            if (colors[hex]) {
                colors[hex]++;
            } else {
                colors[hex] = 1;
            }
        }
        var result = [];

        for (var i = 0, l = players.length; i < l; i++) {
            var player = players[i];
            var amountOfColor = colors[player.color];
            var percent = amountOfColor * 100 / amountOfPixels;
            result.push(player.name + ': ' + Math.ceil(percent) + '%');
        }
        return result;
    }
};