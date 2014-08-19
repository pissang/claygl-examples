define(function() {

    var statsList = [];

    var devicePixelRatio = window.devicePixelRatio || 1;

    function Stats(updateCb) {
        var canvas = document.createElement('canvas');
        canvas.width = 80 * devicePixelRatio;
        canvas.height = 50 * devicePixelRatio;
        canvas.style.width = '80px';
        canvas.style.height = '50px';
        
        var ctx = canvas.getContext('2d');
        ctx.scale(devicePixelRatio, devicePixelRatio);

        this.canvas = canvas;

        this.ctx = ctx;

        this.max = 0;

        this.min = 0;

        this.unit = '';

        this._maxQueueLen = 30;

        this._data = [];

        this._statsMin = Infinity;

        this._statsMax = -Infinity;

        this._statsAve = 0;

        this._count = 0;

        this._getData = updateCb;

        this._prevTime = Date.now();
    }

    Stats.prototype.update = function() {
        if (this._getData) {
            var data = this._getData();
            if (data == null || data == false) { // Is undefined or null or false
                return;
            }
            this.addData(data);

            var time = Date.now();
            // Update each 1s
            if (time - this._prevTime > 1000) {
                this._prevTime = time;
                this.draw();
            }
        }
    }

    Stats.prototype.addData = function(data) {
        var len = this._data.length;
        if (len > this._maxQueueLen) {
            this._data.shift();
        } else {
            len++;
        }
        this._data.push(data);

        // Update average
        var all = this._statsAve * this._count + data;
        this._count++;
        this._statsAve = all / this._count;

        // Update min
        if (data < this._statsMin) {
            this._statsMin = data;
        }
        // Update max
        if (data > this._statsMax) {
            this._statsMax = data;
        }
    }

    Stats.prototype.draw = function() {
        var ctx = this.ctx;
        var len = this._data.length;

        var h = this.canvas.height / devicePixelRatio;
        var w = this.canvas.width / devicePixelRatio;
        if (this.max === this.min) {
            var yStep = 1;
        } else {
            var yStep = h / (this.max - this.min);
        }
        var xStep = w / this._maxQueueLen;

        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 1;
        ctx.shadowColor = 'black';

        ctx.fillStyle = '#564F8A';
        ctx.fillRect(0, 0, w, h);
        ctx.beginPath();
        ctx.strokeStyle = '#e0ffdf';
        ctx.lineWidth = xStep;
        for (var i = 0; i < len; i++) {
            var y = h - (this._data[len - 1 - i] - this.min) * yStep;
            var x = w - i * xStep;
            ctx.moveTo(x, y);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        ctx.fillStyle = '#f4730d';
        ctx.textBaseline = 'top';
        ctx.font = '12px 微软雅黑';
        var textWidth = ctx.measureText(this._statsMax).width;
        ctx.fillText(this._statsMax, w - textWidth - 2, 4);
        ctx.textBaseline = 'bottom';
        textWidth = ctx.measureText(this._statsMin).width;
        ctx.fillText(this._statsMin, w - textWidth - 2, h - 4);

        ctx.textBaseline = 'top';
        ctx.font = '14px 微软雅黑';
        ctx.fillText(this._data[len - 1] + ' ' + this.unit, 5, 5);
    }

    function start() {

    }

    var statistics = {

        start: start,

        addStats: function(updateCb, min, max, unit) {
            var stats = new Stats(updateCb);
            stats.min = min;
            stats.max = max;
            stats.unit = unit || '';
            statsList.push(stats);
            document.getElementById('stats-list').appendChild(stats.canvas);

            return stats;
        },

        update: function(renderInfo) {
            for (var i = 0; i < statsList.length; i++) {
                statsList[i].update();
            }
        }
    };

    return statistics;
});