PB.vector = (function () {
    function vector(x, y) {
        this.x = x;
        this.y = y;
    }
    vector.prototype = {
        add: function (otherVector) {
            var x = this.x + otherVector.x;
            var y = this.y + otherVector.y;
            return new vector(x, y);
        },
        subtract: function (otherVector) {
            var x = this.x - otherVector.x;
            var y = this.y - otherVector.y;
            return new vector(x, y);
        },
        multiply: function (scalar) {
            var x = this.x * scalar;
            var y = this.y * scalar;
            return new vector(x, y);
        },
        divide: function (scalar) {
            var x = this.x,
                y = this.y;
            if (x && y) {
                x /= scalar;
                y /= scalar;
            }
            return new vector(x, y);
        },
        normalise: function () {
            var x = this.x,
                y = this.y,
                distance = this.magnitude();
            x = x * (1.0 / distance);
            y = y * (1.0 / distance);
            return new vector(x, y);
        },
        magnitude: function () {
            var magnitude = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
            return magnitude;
        },
        dot: function (otherVector) {
            var dotProduct = ((this.x * otherVector.x) + (this.y * otherVector.y));
            return dotProduct;
        }
    }
    return vector;
})();