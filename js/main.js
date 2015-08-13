(function () {
    var midX = 400,
        midY = 300,
        players = [
            new PB.player({
                x: midX - 40,
                y: midY - 30,
                degree: 225,
                left: 37,
                right: 39,
                color: '#C1053D'
            }),
            new PB.player({
                x: midX + 40,
                y: midY - 30,
                degree: 315,
                left: 37,
                right: 39,
                color: '#BADA55'
            }),
            new PB.player({
                x: midX - 40,
                y: midY + 30,
                degree: 135,
                left: 37,
                right: 39,
                color: '#C0FFEE'
            }),
            new PB.player({
                x: midX + 40,
                y: midY + 30,
                degree: 45,
                left: 37,
                right: 39,
                color: '#FA7A55'
            })
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
        bg: 'img/canvas.png'
    }, init);
    /*
    makeAudio({}, function (sounds) {
        PB.sound = sounds;
    });
	*/
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
		PB.startGame(players);
    }
}());