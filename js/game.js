﻿PB.startGame = function (bounds, players) {
    var canvas = document.getElementById('PB'),
        ctx = canvas.getContext("2d"),
        propCanvas = document.getElementById('Prop'),
        propCtx = propCanvas.getContext("2d"),
        pause = false,
        pickup = null,
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
            gameState.stop();
            alert(findWinner().join('\n'));
        }, 60000);

        setInterval(function () {
            pickup = new PB.pickup(bounds);
        }, 10000);

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

            if (player.canCollide) {
                player.canCollide = false;
                var collision = player.checkCircleCollision(players).collision,
                    j = collision.length;
                player.canCollide = true;

                if (j) {
                    for (; j--;) {
                        collision[j].jump();
                    }
                    player.jump();
                }
            }
        }
    }

    function drawPlayers() {
        for (var i = players.length; i--;) {
            var player = players[i],
                solved = player.resolve(player.radius),
                x = player.position.x | 0,
                y = player.position.y | 0;
            //draw image
            propCtx.drawImage(
                PB.images.shadow, x - player.radius, y - player.radius,
                player.radius * 2, player.radius * 2
            );
            propCtx.drawImage(
                PB.images.brush, x - player.radius, y - player.radius - player.imgOffset,
                player.radius *2, player.radius*2
            );
            //draw heading direction line
            propCtx.beginPath();
            propCtx.moveTo(x, y);
            propCtx.lineTo(solved.x, solved.y);
            propCtx.stroke();
            //draw paint
            if (!player.canDraw()) continue;
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.position.x | 0, player.position.y | 0, player.radius, 0, 180 * Math.PI, false);
            ctx.fill();
        }
    }

    

    function updatePickup() {
        var collisions = pickup.checkCircleCollision(players);

        if (collisions.collision.length) {
            pickup.get(collisions, bounds, ctx, gameState);
            pickup = null;
        }
    }

    function drawPickup() {
        propCtx.drawImage(PB.images.pickup, pickup.position.x - pickup.radius / 2, pickup.position.y - pickup.radius / 2,
            pickup.radius, pickup.radius);
    }

    function update() {
        updatePlayers();
        drawPlayers();

        if (pickup) {
            drawPickup();
            updatePickup();
        }
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
        var result = [],
            total = 0;

        for (var i = 0, l = players.length; i < l; i++) {
            var player = players[i];
            var amountOfColor = colors[player.color];
            var percent = Math.ceil(amountOfColor * 100 / amountOfPixels);
            result.push(player.name + ': ' + percent + '%');
            total += percent;
        }
        result.push('Total: ' + total + '%');
        return result;
    }
};