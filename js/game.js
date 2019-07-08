PB.startGame = function(bounds, players) {
  var canvas = document.getElementById('PB'),
    ctx = canvas.getContext('2d'),
    propCanvas = document.getElementById('Prop'),
    propCtx = propCanvas.getContext('2d'),
    pause = false,
    pickups = [],
    gameState = new PB.timer();

  const GAME_INTERVAL = 90 * 1000;
  const PICKUP_INTERVAL = 25 * 1000;

  init();
  function init() {
    canvas.width = bounds.right;
    canvas.height = bounds.bottom;
    propCanvas.width = bounds.right;
    propCanvas.height = bounds.bottom;
    gameState.setInterval(update);
    gameState.setTimeout(endGame, GAME_INTERVAL);
    gameState.setInterval(function() {
      pickups.push(new PB.pickup(bounds));
    }, PICKUP_INTERVAL);

    PB.keyHandler = function(key) {
      const space = 32;
      if (key === space) {
        if (pause) gameState.start();
        else gameState.stop();
        pause = !pause;
      }
    };
  }

  function endGame() {
    gameState.stop();
    const result = getGameResult()
      .map(x => `${x.name}: ${x.percent}% ${x.winner ? '🏆' : ''}`)
      .join('\n');
    alert(result);
  }

  function updatePlayers() {
    for (var i = players.length; i--; ) {
      var player = players[i];
      player.move(gameState);
      player.restrict(bounds);

      if (player.canCollide) {
        player.canCollide = false;
        var collision = player.checkCircleCollision(players).collision,
          j = collision.length;
        player.canCollide = true;

        if (j) {
          for (; j--; ) {
            collision[j].jump(gameState);
          }
          player.jump(gameState);
        }
      }
    }
  }

  function drawPlayers() {
    for (var i = players.length; i--; ) {
      var player = players[i],
        solved = player.resolve(player.radius),
        x = player.position.x | 0,
        y = player.position.y | 0;
      //draw image
      propCtx.drawImage(
        PB.images.shadow,
        x - player.radius,
        y - player.radius,
        player.radius * 2,
        player.radius * 2
      );
      propCtx.drawImage(
        player.drawing ? PB.images.brush : PB.images.clean,
        x - player.radius,
        y - player.radius - player.imgOffset,
        player.radius * 2,
        player.radius * 2
      );

      if (player.stunned) {
        propCtx.drawImage(
          PB.images.plaster,
          x - player.radius / 2,
          y - player.radius,
          player.radius,
          player.radius
        );
      }

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

  function updatePickup(pickup) {
    var collisions = pickup.checkCircleCollision(players);

    if (collisions.collision.length) {
      pickup.get(collisions, gameState, ctx, bounds);
      pickups.splice(pickups.indexOf(pickup), 1);
    }
  }

  function drawPickup(pickup) {
    propCtx.drawImage(
      PB.images.pickup,
      pickup.position.x - pickup.radius,
      pickup.position.y - pickup.radius,
      pickup.radius * 2,
      pickup.radius * 2
    );
  }

  function drawDebug() {
    propCtx.fillStyle = '#f00';
    propCtx.font = '11px Verdana';

    for (var i = 0, l = gameState.moments.length; i < l; i++) {
      propCtx.fillText(gameState.moments[i].delta | 0, 10, i * 15 + 30);
    }
  }

  function update() {
    propCtx.clearRect(0, 0, bounds.right, bounds.bottom);
    updatePlayers();
    drawPlayers();
    pickups.forEach(pickup => {
      updatePickup(pickup);
      drawPickup(pickup);
    });
    // drawDebug();
  }

  function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1)
      .toUpperCase()}`;
  }

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  function imageDataToRgbaList(imageData) {
    const rgbaList = [];
    for (let i = 0, l = imageData.length; i < l; ) {
      const r = imageData[i++];
      const g = imageData[i++];
      const b = imageData[i++];
      const a = imageData[i++];
      rgbaList.push([r, g, b, a]);
    }
    return rgbaList;
  }

  function getRgbDifference([r1, g1, b1], [r2, g2, b2]) {
    return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
  }

  function isBlack([r, g, b, a]) {
    return !r && !g && !b;
  }

  function getGameResult() {
    const imageData = ctx.getImageData(0, 0, bounds.right, bounds.bottom).data;
    const rgbList = imageDataToRgbaList(imageData);
    const playerColors = players.map(x => hexToRgb(x.color));
    const amountOfPixels = rgbList.length;
    const gameColors = rgbList.reduce((acc, cur) => {
      let playerColor;
      if (isBlack(cur)) {
        playerColor = rgbToHex(...cur);
      } else {
        const colorDiffs = playerColors.map(x => ({
          color: x,
          difference: getRgbDifference(x, cur),
        }));
        const leastDiffer = colorDiffs.sort((a, b) => a.difference - b.difference)[0].color;
        playerColor = rgbToHex(...leastDiffer);
      }
      if (acc[playerColor]) {
        acc[playerColor]++;
      } else {
        acc[playerColor] = 1;
      }
      return acc;
    }, {});
    const result = players.map(player => ({
      name: player.name,
      percent: Math.round((gameColors[player.color] * 100) / amountOfPixels),
    }));
    result.slice().sort((a, b) => b.percent - a.percent)[0].winner = true;
    result.push({
      name: 'Total',
      percent: result.reduce((acc, cur) => acc + cur.percent, 0),
    });
    return result;
  }
};
