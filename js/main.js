(function () {
    var midX = 400,
        midY = 300,
        bounds = {
            top: 0,
            right: 800,
            bottom: 600,
            left: 0
        },
        players = [
            new PB.player({
                x: midX - 30,
                y: midY - 30,
                degree: 225,
                left: 37,
                right: 39,
                color: '#FF5EAA',
                name: 'Player 1',
                //isComputer: true
            }),
            /* */
            new PB.player({
                x: midX + 30,
                y: midY - 30,
                degree: 315,
                left: 65,
                right: 68,
                color: '#299EFE',
                name: 'Player 2',
                isComputer: true
            }),
            /* */
            new PB.player({
                x: midX - 30,
                y: midY + 30,
                degree: 135,
                left: 74,
                right: 76,
                color: '#FDBC56',
                name: 'Player 3',
                isComputer: true
            }),
            new PB.player({
                x: midX + 30,
                y: midY + 30,
                degree: 45,
                left: 100,
                right: 102,
                color: '#67DB66',
                name: 'Player 4',
                isComputer: true
            })
            /* */
        ];

    function makeImages(images, callback) {
        var result = {},
            loads = 0,
            keys = Object.keys(images),
            num = keys.length,
            cb = function () {
                if (++loads >= num) callback(result);
            };

        for (var i = num; i--;) {
            var key = keys[i],
                img = new Image();
            img.onload = cb;
            img.onerror = cb;
            img.src = images[key];
            result[key] = img;
        }
    }
    function makeAudio(sounds, callback) {
        var result = {},
            loads = 0,
            keys = Object.keys(sounds),
            num = keys.length,
            cb = function () {
                if (++loads >= num) callback(result);
            };

        for (var i = num; i--;) {
            var key = keys[i],
                snd = new Audio();
            snd.oncanplaythrough = cb;
            snd.onerror = cb;
            snd.src = sounds[key];
            result[key] = snd;
        }
    }
    PB.playSound = function (snd, loop) {
        if (SneekMe.sound && SneekMe.sound[snd]) {
            var sound = SneekMe.sound[snd];

            try {
                sound.currentTime = 0;
            } catch (e) {

            }            

            if (loop) {
                if (typeof sound.loop === 'boolean') {
                    sound.loop = true;
                } else {
                    sound.addEventListener('ended', function () {
                        sound.currentTime = 0;
                        sound.play();
                    }, false);
                }
            }
            sound.play();
        }
    };
    PB.store = {
        getItem: function (key) {
            if (localStorage) {
                var value = localStorage.getItem(key);
                return value;
            }
        },
        get: function (key) {
            if (localStorage) {
                var value = localStorage.getItem(key);
                if (!value) return;
                try {
                    value = JSON.parse(value);
                } catch (e) { }
                return value;
            }
        },
        set: function (key, obj) {
            if (localStorage) {
                if (typeof obj === 'object') obj = JSON.stringify(obj);
                localStorage.setItem(key, obj);
            }
        }
    };

    makeImages({
        bg: 'img/canvas.png',
        brush: 'img/brush.png',
        clean: 'img/clean.png',
        shadow: 'img/shadow.png',
        pickup: 'img/present.png',
        plaster: 'img/plaster.png'
    }, init);
    /*
    makeAudio({
        //menu: 'snd/music1.mp3',
        bg: 'snd/music2.mp3',
        //win: 'snd/music3.mp3'
    }, function (sounds) {
        PB.sound = sounds;
    });
	*/

    function drawBackground() {
        var bgCanvas = document.getElementById('BG'),
            bgCtx = bgCanvas.getContext('2d');
        bgCanvas.width = bounds.right;
        bgCanvas.height = bounds.bottom;
        bgCtx.drawImage(PB.images.bg, 0, 0, bounds.right, bounds.bottom);
    }

    function init(images) {
        PB.keys = [];
        PB.images = images;
        document.addEventListener('keydown', function (e) {
            e = e ? e : window.event;
            PB.keys[e.keyCode] = true;
            PB.keyHandler && PB.keyHandler(e.keyCode);
        });
        document.addEventListener('keyup', function (e) {            
            e = e ? e : window.event;
            PB.keys[e.keyCode] = false;
        });
        drawBackground();
		PB.startGame(bounds, players);
    }
}());