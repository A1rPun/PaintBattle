PB.vector = (function () {
    function vector(x, y) {
        this.setX(x);
        this.setY(y);
    };

    vector.prototype.getX = function () { return this.x; };
    vector.prototype.setX = function (x) { this.x = x; };
    vector.prototype.getY = function () { return this.y; };
    vector.prototype.setY = function (y) { this.y = y; };
    vector.prototype.setXandY = function (x, y) {
        this.x = x;
        this.y = y;
    }

    // Vector functions
    vector.prototype.add = function (otherVector) {
        var x = this.x + otherVector.getX();
        var y = this.y + otherVector.getY();
        return new vector(x, y);
    }

    vector.prototype.subtract = function (otherVector) {
        var x = this.x - otherVector.getX();
        var y = this.y - otherVector.getY();
        return new vector(x, y);
    }

    vector.prototype.multiply = function (scalar) {
        var x = this.x * scalar;
        var y = this.y * scalar;
        return new vector(x, y);
    }

    vector.prototype.divide = function (scalar) {
        var x = this.x,
			y = this.y;
        if (x && y) {
            x /= scalar;
            y /= scalar;
        }
        return new vector(x, y);
    }

    vector.prototype.normalise = function () {
        var x = this.x,
			y = this.y,
            xsquared = this.x * this.x,
            ysquared = this.y * this.y,
            distance = Math.sqrt(xsquared + ysquared);
        x = x * (1.0 / distance);
        y = y * (1.0 / distance);
        return new vector(x, y);
    }

    vector.prototype.magnitude = function () {
        var magnitude = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        return magnitude;
    }

    vector.prototype.dot = function (otherVector) {
        var dotProduct = ((this.x * otherVector.getX()) + (this.y * otherVector.getY()));
        return dotProduct;
        //x *= otherVector.getX();
        //y *= otherVector.getY();
        //return new vector(x,y);
    }

    return vector;
})();