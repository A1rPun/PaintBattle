PB.startGame = function (players) {
    function rand(num) {
        return Math.floor(Math.random() * num);
    }
	
    var canvas = document.getElementById('PB'),
        ctx = canvas.getContext("2d"),
        gameState = new PB.gameState({
            fps: 60,
            canvas: canvas,
            context: ctx,
            states: { game: update }
        });

    init();
    function init() {
		gameState.start('game');
    }

    function update() {
        
    }
};