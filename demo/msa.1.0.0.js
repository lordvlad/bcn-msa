(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./src/index.sjs":[function(require,module,exports){
var request$5923 = require('./request'), MSA$5924 = require('./MSASource'), extend$5925 = require('extend'), colorSchemeSelector$5926 = require('biojs-util-colorschemes').selector;
/**
 * Helpers
 */
var floor$5928 = Math.floor.bind(Math);
var ceil$5930 = Math.ceil.bind(Math);
function minmaxval$5931(mi$5938, ma$5939, val$5940) {
    if (val$5940 < mi$5938)
        return mi$5938;
    if (val$5940 > ma$5939)
        return ma$5939;
    return val$5940;
}
function slice$5932(arr$5941, a$5942, b$5943) {
    return Array.prototype.slice.call(arr$5941, a$5942, b$5943);
}
function $$5933(q$5944, r$5945) {
    return (r$5945 || document).querySelector(q$5944);
}
function $$$5935(q$5946, r$5947) {
    if (q$5946.constructor.name !== 'NodeList')
        q$5946 = (r$5947 || document).querySelectorAll(q$5946);
    return slice$5932(q$5946);
}
/**
 * MultiSequenceAlignment Viewer class
 */
function MSAView$5936(root$5948, options$5949) {
    window.a = this;
    var canvas$5951;
    // include default options and options from DOM dataset
    options$5949 = extend$5925({}, MSAView$5936.defaultOptions, root$5948.dataset, options$5949);
    // create canvas if not present
    if (!(canvas$5951 = $$5933('canvas', root$5948)))
        root$5948.appendChild(canvas$5951 = document.createElement('canvas'));
    if ('bcnMsaFullscreen' in options$5949)
        root$5948.style.width = root$5948.style.height = '100%';
    // set canvas proportions and hide cursor
    canvas$5951.width = root$5948.offsetWidth;
    canvas$5951.height = root$5948.offsetHeight;
    // canvas.style.cursor = 'none';
    // convenience method
    canvas$5951.on = function (__fa_args$5954, event$5955, callback$5956) {
        return canvas$5951.addEventListener(event$5955, callback$5956.bind(this));
    }.bind(this, typeof arguments !== 'undefined' ? arguments : undefined);
    // attach event handlers
    canvas$5951.on('mousewheel', this.onScroll);
    canvas$5951.on('wheel', this.onScroll);
    canvas$5951.on('mousemove', this.onPointerMove);
    canvas$5951.on('mouseout', this.onPointerOut);
    canvas$5951.on('mousedown', this.onPointerDown);
    canvas$5951.on('mouseup', this.onPointerUp);
    canvas$5951.on('contextmenu', function (__fa_args$5958, e$5959) {
        return e$5959.preventDefault();
    }.bind(this, typeof arguments !== 'undefined' ? arguments : undefined));
    this.alignment = new MSA$5924(root$5948.dataset.alignment);
    this.scrollPos = {
        x: 0,
        y: 0,
        maxX: 0,
        maxY: 0
    };
    this.ctx = canvas$5951.getContext('2d');
    this.ctx.font = options$5949.font;
    this.draw = this.draw.bind(this);
    this.render = this.draw.bind(this);
    this.colorScheme = colorSchemeSelector$5926.getColor(options$5949.colorScheme);
    this.options = options$5949;
    this.canvas = canvas$5951;
    this.mousePos = null;
    this.LOCK = false;
    this.view = null;
    this.updateView();
    requestAnimationFrame(this.draw);
}
MSAView$5936.prototype.updateView = function updateView() {
    if (this.LOCK)
        return this.LOCK;
    if (!this.view)
        return Promise.resolve();
    var cvs$5962 = this.canvas, aln$5963 = this.alignment, opt$5964 = this.options, view$5965 = this.view, scroll$5966 = this.scrollPos, em$5967 = view$5965.charWidth + opt$5964.letterSpacing, H$5968 = cvs$5962.clientHeight, W$5969 = cvs$5962.clientWidth;
    return this.LOCK = Promise.all([
        aln$5963.getLines(view$5965.offsetY, view$5965.offsetY + view$5965.height),
        aln$5963.getSize()
    ]).then(function (res$5970) {
        view$5965.tracks = res$5970[0];
        view$5965.alignment = res$5970[1].alignment;
        view$5965.count = res$5970[1].sequenceCount;
        view$5965.sequenceWidth = res$5970[1].sequenceWidth;
        scroll$5966.maxX = floor$5928(view$5965.sequenceWidth * em$5967) - W$5969 + opt$5964.labelWidth + opt$5964.leftMargin;
        scroll$5966.maxY = (res$5970[1].sequenceCount - view$5965.height) * opt$5964.lineHeight - H$5968;
        view$5965.lastOffsetY = view$5965.offsetY;
        this.LOCK = false;
    }.bind(this));
};
MSAView$5936.prototype.onScroll = function onScroll(e$5971) {
    if (this.LOCK)
        return;
    var s$5974 = this.scrollPos, dx$5975 = e$5971.deltaX || -e$5971.wheelDeltaX, dy$5976 = e$5971.deltaY || -e$5971.wheelDeltaY;
    s$5974.x = floor$5928(minmaxval$5931(0, s$5974.maxX, s$5974.x + dx$5975));
    s$5974.y = floor$5928(minmaxval$5931(0, s$5974.maxY, s$5974.y + dy$5976));
};
MSAView$5936.prototype.onPointerOut = function onPointerOut() {
    this.mousePos = null;
};
MSAView$5936.prototype.onPointerMove = function onPointerMove(e$5977) {
    var r$5979 = this.canvas.getBoundingClientRect(), m$5980 = this.mousePos || {};
    this.mousePos = {
        left: m$5980.left,
        right: m$5980.right,
        middle: m$5980.middle,
        y: e$5977.clientY - r$5979.top,
        x: e$5977.clientX - r$5979.left
    };
};
MSAView$5936.prototype.onPointerDown = function onPointerDown(e$5981) {
    var m$5983 = this.mousePos;
    if (!m$5983)
        return;
    switch (e$5981.which) {
    case 1:
        m$5983.left = true;
        break;
    case 3:
        m$5983.right = true;
        break;
    case 2:
        m$5983.middle = true;
        break;
    }
    if (m$5983.middle)
        this.scrollPos.pan = {
            x: m$5983.x,
            y: m$5983.y
        };
    if (m$5983.left)
        this.view.mark = {
            sx: m$5983.sx,
            sy: m$5983.sy
        };
};
MSAView$5936.prototype.onPointerUp = function onPointerUp(e$5984) {
    var m$5986 = this.mousePos;
    if (m$5986.middle)
        this.scrollPos.pan = null;
    switch (e$5984.which) {
    case 1:
        m$5986.left = false;
        break;
    case 3:
        m$5986.right = false;
        break;
    case 2:
        m$5986.middle = false;
        break;
    }
};
MSAView$5936.prototype.draw = function draw(t$5987) {
    var cvs$5989 = this.canvas, ctx$5990 = this.ctx, opt$5991 = this.options, view$5992 = this.view, lock$5993 = this.LOCK, mouse$5994 = this.mousePos, scroll$5995 = this.scrollPos, col$5996 = this.colorScheme, em$5997 = view$5992 && view$5992.charWidth + opt$5991.letterSpacing, charWidth$5998 = view$5992 && view$5992.charWidth, H$5999 = cvs$5989.clientHeight, W$6000 = cvs$5989.clientWidth, lineHeight$6001 = opt$5991.lineHeight, letterSpacing$6002 = opt$5991.letterSpacing, labelWidth$6003 = opt$5991.labelWidth, leftMargin$6004 = opt$5991.leftMargin;
    if (!view$5992) {
        view$5992 = this.view = { tracks: [] };
        charWidth$5998 = view$5992.charWidth = ceil$5930(ctx$5990.measureText('x').width);
        em$5997 = view$5992.charWidth + letterSpacing$6002;
        view$5992.height = floor$5928(H$5999 / lineHeight$6001) - 4;
        view$5992.seqOffset = labelWidth$6003 + letterSpacing$6002 + leftMargin$6004;
        view$5992.labelTruncate = floor$5928((labelWidth$6003 - leftMargin$6004) / charWidth$5998);
    }
    // check mouse middle button scroll
    if (mouse$5994 && mouse$5994.middle) {
        var dx$6007 = (mouse$5994.x - scroll$5995.pan.x) / 10, dy$6008 = (mouse$5994.y - scroll$5995.pan.y) / 10;
        scroll$5995.x = floor$5928(minmaxval$5931(0, scroll$5995.maxX, scroll$5995.x + dx$6007));
        scroll$5995.y = floor$5928(minmaxval$5931(0, scroll$5995.maxY, scroll$5995.y + dy$6008));
    }
    view$5992.offsetX = floor$5928(scroll$5995.x / em$5997);
    view$5992.offsetY = floor$5928(scroll$5995.y / lineHeight$6001);
    // get mouse coordinates relative to sequence and
    // aminoacid position
    if (mouse$5994) {
        mouse$5994.sx = floor$5928((mouse$5994.x - view$5992.seqOffset) / em$5997) + view$5992.offsetX;
        mouse$5994.sy = floor$5928(mouse$5994.y / lineHeight$6001) - 2 + view$5992.offsetY;
    }
    // maybe we need to fetch new lines from the underlying source
    if (!lock$5993 && view$5992.offsetY !== view$5992.lastOffsetY)
        this.updateView();
    // clear canvas
    ctx$5990.clearRect(0, 0, W$6000, H$5999);
    // loading text
    if (lock$5993)
        ctx$5990.fillText(opt$5991.loadingText, leftMargin$6004, lineHeight$6001);
    // ruler
    {
        var y$6011 = lineHeight$6001 * 2, x$6012 = view$5992.seqOffset, i$6013 = view$5992.offsetX + 1;
        while (x$6012 < W$6000) {
            if (i$6013 % 10 === 0 || i$6013 === 1)
                ctx$5990.fillText(i$6013 + '', x$6012, y$6011);
            else if (i$6013 % 5 === 0)
                ctx$5990.fillText('.', x$6012, y$6011);
            i$6013 += 1;
            x$6012 += em$5997;
        }
    }
    // tracks
    if (view$5992 && view$5992.tracks) {
        var bgW$6016 = em$5997 + 2, bgH$6017 = lineHeight$6001 + 2, bgX$6018 = -em$5997 / 4, bgY$6019 = -lineHeight$6001 * 4 / 5, m$6020 = mouse$5994;
        view$5992.tracks.forEach(function (t$6021, i$6022) {
            var y$6025 = (i$6022 + 3) * lineHeight$6001, x$6026 = view$5992.seqOffset, j$6027 = view$5992.offsetX, s$6028 = t$6021.sequence, l$6029 = t$6021.label;
            // sequence
            while (x$6026 < W$6000) {
                var a$6032 = s$6028[j$6027];
                if ((aa = s$6028[j$6027]) !== '-' && col$5996[aa]) {
                    ctx$5990.beginPath();
                    ctx$5990.fillStyle = col$5996[aa];
                    ctx$5990.strokeStyle = col$5996[aa];
                    ctx$5990.rect(x$6026 + bgX$6018, y$6025 + bgY$6019, em$5997, lineHeight$6001);
                    ctx$5990.fill();
                    ctx$5990.stroke();
                    ctx$5990.closePath();
                    ctx$5990.fillStyle = 'black';
                }
                ctx$5990.fillText(aa, x$6026, y$6025);
                j$6027 += 1;
                x$6026 += em$5997;
            }
            // label
            if (m$6020 && mouse$5994.sx < view$5992.offsetX && mouse$5994.sy === view$5992.offsetY + i$6022) {
                ctx$5990.save();
                ctx$5990.fillStyle = 'rgb(255, 255, 255)';
                ctx$5990.fillRect(leftMargin$6004, y$6025 - lineHeight$6001 + 2, W$6000, lineHeight$6001 + 4);
                ctx$5990.restore();
            } else {
                l$6029 = l$6029.substr(0, view$5992.labelTruncate) + '...';
            }
            ctx$5990.fillText(l$6029, leftMargin$6004, y$6025);
        });
    }
    if (mouse$5994) {
        var r$6035 = mouse$5994.left || mouse$5994.right || mouse$5994.middle ? 6 : 4;
        // info line
        if (view$5992.tracks && view$5992.tracks[mouse$5994.sy]) {
            var seq$6038 = view$5992.tracks[mouse$5994.sy], pos$6039 = seq$6038.sequence[mouse$5994.sx];
            if (pos$6039 && pos$6039 !== '-') {
                pos$6039 += seq$6038.sequence.substr(0, mouse$5994.sx).replace(/-/g, '').length + 1;
                ctx$5990.fillText(pos$6039, view$5992.seqOffset, lineHeight$6001);
            }
            ctx$5990.fillText(seq$6038.label, view$5992.seqOffset + 6 * charWidth$5998, lineHeight$6001);
        }
    }    // ctx.save();
         // ctx.fillStyle = opt.cursorColor;
         // // if middle button is pressed
         // if (mouse.middle) {
         //     // draw 3 circles between the point where
         //     // the mouse button has first been pressed
         //     // and the current coordinates;
         //     let x = scroll.pan.x, y = scroll.pan.y, i = 4
         //     , dx = (x-mouse.x) / i, dy = (y-mouse.y) / i
         //     ;
         //     fillCircle(x, y, r * 3, ctx);
         //     while (--i)
         //         fillCircle(x - dx*i, y - dy*i, i * r/2, ctx);
         // } else {
         //     fillCircle(mouse.x, mouse.y, r * 3, ctx);
         // }
         // // draw small inner circle
         // fillCircle(mouse.x, mouse.y, r * 2, ctx);
         // ctx.restore();
    requestAnimationFrame(this.draw);
};
function fillCircle$5937(x$6040, y$6041, r$6042, ctx$6043) {
    ctx$6043.beginPath();
    ctx$6043.arc(x$6040, y$6041, r$6042, 0, Math.PI * 2);
    ctx$6043.fill();
    ctx$6043.closePath();
}
MSAView$5936.create = function (options$6044, domNode$6045) {
    return new MSAView$5936(domNode$6045, options$6044);
};
MSAView$5936.defaultOptions = {
    font: '12px monospace',
    lineHeight: 14,
    labelWidth: 100,
    leftMargin: 20,
    letterSpacing: 8,
    cursorColor: 'rgba(128, 128, 128, 0.2)',
    loadingText: 'loading...',
    colorScheme: 'clustal2'
};
$$$5935('[data-bcn="msa"]').map(MSAView$5936.create.bind(null, null));

},{"./MSASource":"/home/wre/dev/js/msa/src/MSASource.js","./request":"/home/wre/dev/js/msa/src/request.js","biojs-util-colorschemes":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/index.js","extend":"/home/wre/dev/js/msa/node_modules/extend/index.js"}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/index.js":[function(require,module,exports){
module.exports = require('./src/index.js')

},{"./src/index.js":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/index.js"}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/buried.js":[function(require,module,exports){
module.exports = {
  A: "#00a35c",
  R: "#00fc03",
  N: "#00eb14",
  D: "#00eb14",
  C: "#0000ff",
  Q: "#00f10e",
  E: "#00f10e",
  G: "#009d62",
  H: "#00d52a",
  I: "#0054ab",
  L: "#007b84",
  K: "#00ff00",
  M: "#009768",
  F: "#008778",
  P: "#00e01f",
  S: "#00d52a",
  T: "#00db24",
  W: "#00a857",
  Y: "#00e619",
  V: "#005fa0",
  B: "#00eb14",
  X: "#00b649",
  Z: "#00f10e"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/cinema.js":[function(require,module,exports){
module.exports = {
  A: "#BBBBBB",
  B: "grey",
  C: "yellow",
  D: "red",
  E: "red",
  F: "magenta",
  G: "brown",
  H: "#00FFFF",
  I: "#BBBBBB",
  J: "#fff",
  K: "#00FFFF",
  L: "#BBBBBB",
  M: "#BBBBBB",
  N: "green",
  O: "#fff",
  P: "brown",
  Q: "green",
  R: "#00FFFF",
  S: "green",
  T: "green",
  U: "#fff",
  V: "#BBBBBB",
  W: "magenta",
  X: "grey",
  Y: "magenta",
  Z: "grey",
  Gap: "grey"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/clustal.js":[function(require,module,exports){
module.exports = {
  A: "orange",
  B: "#fff",
  C: "green",
  D: "red",
  E: "red",
  F: "blue",
  G: "orange",
  H: "red",
  I: "green",
  J: "#fff",
  K: "red",
  L: "green",
  M: "green",
  N: "#fff",
  O: "#fff",
  P: "orange",
  Q: "#fff",
  R: "red",
  S: "orange",
  T: "orange",
  U: "#fff",
  V: "green",
  W: "blue",
  X: "#fff",
  Y: "blue",
  Z: "#fff",
  Gap: "#fff"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/clustal2.js":[function(require,module,exports){
module.exports = {
  A: "#80a0f0",
  R: "#f01505",
  N: "#00ff00",
  D: "#c048c0",
  C: "#f08080",
  Q: "#00ff00",
  E: "#c048c0",
  G: "#f09048",
  H: "#15a4a4",
  I: "#80a0f0",
  L: "#80a0f0",
  K: "#f01505",
  M: "#80a0f0",
  F: "#80a0f0",
  P: "#ffff00",
  S: "#00ff00",
  T: "#00ff00",
  W: "#80a0f0",
  Y: "#15a4a4",
  V: "#80a0f0",
  B: "#fff",
  X: "#fff",
  Z: "#fff"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/helix.js":[function(require,module,exports){
module.exports = {
  A: "#e718e7",
  R: "#6f906f",
  N: "#1be41b",
  D: "#778877",
  C: "#23dc23",
  Q: "#926d92",
  E: "#ff00ff",
  G: "#00ff00",
  H: "#758a75",
  I: "#8a758a",
  L: "#ae51ae",
  K: "#a05fa0",
  M: "#ef10ef",
  F: "#986798",
  P: "#00ff00",
  S: "#36c936",
  T: "#47b847",
  W: "#8a758a",
  Y: "#21de21",
  V: "#857a85",
  B: "#49b649",
  X: "#758a75",
  Z: "#c936c9"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/hydrophobicity.js":[function(require,module,exports){
module.exports = {
  A: "#ad0052",
  B: "#0c00f3",
  C: "#c2003d",
  D: "#0c00f3",
  E: "#0c00f3",
  F: "#cb0034",
  G: "#6a0095",
  H: "#1500ea",
  I: "#ff0000",
  J: "#fff",
  K: "#0000ff",
  L: "#ea0015",
  M: "#b0004f",
  N: "#0c00f3",
  O: "#fff",
  P: "#4600b9",
  Q: "#0c00f3",
  R: "#0000ff",
  S: "#5e00a1",
  T: "#61009e",
  U: "#fff",
  V: "#f60009",
  W: "#5b00a4",
  X: "#680097",
  Y: "#4f00b0",
  Z: "#0c00f3"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/index.js":[function(require,module,exports){
module.exports.selector = require("./selector");

// basics
module.exports.taylor = require("./taylor");
module.exports.zappo= require("./zappo");
module.exports.hydro= require("./hydrophobicity");

module.exports.clustal = require("./clustal");
module.exports.clustal2 = require("./clustal2");

module.exports.curied = require("./buried");
module.exports.cinema = require("./cinema");
module.exports.nucleotide  = require("./nucleotide");
module.exports.helix  = require("./helix");
module.exports.lesk  = require("./lesk");
module.exports.mae = require("./mae");
module.exports.purine = require("./purine");
module.exports.strand = require("./strand");
module.exports.turn = require("./turn");

},{"./buried":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/buried.js","./cinema":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/cinema.js","./clustal":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/clustal.js","./clustal2":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/clustal2.js","./helix":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/helix.js","./hydrophobicity":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/hydrophobicity.js","./lesk":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/lesk.js","./mae":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/mae.js","./nucleotide":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/nucleotide.js","./purine":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/purine.js","./selector":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/selector.js","./strand":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/strand.js","./taylor":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/taylor.js","./turn":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/turn.js","./zappo":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/zappo.js"}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/lesk.js":[function(require,module,exports){
module.exports = {
  A: " orange",
  B: " #fff",
  C: " green",
  D: " red",
  E: " red",
  F: " green",
  G: " orange",
  H: " magenta",
  I: " green",
  J: " #fff",
  K: " red",
  L: " green",
  M: " green",
  N: " magenta",
  O: " #fff",
  P: " green",
  Q: " magenta",
  R: " red",
  S: " orange",
  T: " orange",
  U: " #fff",
  V: " green",
  W: " green",
  X: " #fff",
  Y: " green",
  Z: " #fff",
  Gap: " #fff"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/mae.js":[function(require,module,exports){
module.exports = {
  A: " #77dd88",
  B: " #fff",
  C: " #99ee66",
  D: " #55bb33",
  E: " #55bb33",
  F: " #9999ff",
  G: " #77dd88",
  H: " #5555ff",
  I: " #66bbff",
  J: " #fff",
  K: " #ffcc77",
  L: " #66bbff",
  M: " #66bbff",
  N: " #55bb33",
  O: " #fff",
  P: " #eeaaaa",
  Q: " #55bb33",
  R: " #ffcc77",
  S: " #ff4455",
  T: " #ff4455",
  U: " #fff",
  V: " #66bbff",
  W: " #9999ff",
  X: " #fff",
  Y: " #9999ff",
  Z: " #fff",
  Gap: " #fff"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/nucleotide.js":[function(require,module,exports){
module.exports = {
  A: " #64F73F",
  C: " #FFB340",
  G: " #EB413C",
  T: " #3C88EE",
  U: " #3C88EE"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/purine.js":[function(require,module,exports){
module.exports = {
  A: " #FF83FA",
  C: " #40E0D0",
  G: " #FF83FA",
  R: " #FF83FA",
  T: " #40E0D0",
  U: " #40E0D0",
  Y: " #40E0D0"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/selector.js":[function(require,module,exports){
var Buried = require("./buried");
var Cinema = require("./cinema");
var Clustal = require("./clustal");
var Clustal2 = require("./clustal2");
var Helix = require("./helix");
var Hydro = require("./hydrophobicity");
var Lesk = require("./lesk");
var Mae = require("./mae");
var Nucleotide = require("./nucleotide");
var Purine = require("./purine");
var Strand = require("./strand");
var Taylor = require("./taylor");
var Turn = require("./turn");
var Zappo = require("./zappo");

module.exports = Colors = {
  mapping: {
    buried: Buried,
    buried_index: Buried,
    cinema: Cinema,
    clustal2: Clustal2,
    clustal: Clustal,
    helix: Helix,
    helix_propensity: Helix,
    hydro: Hydro,
    lesk: Lesk,
    mae: Mae,
    nucleotide: Nucleotide,
    purine: Purine,
    purine_pyrimidine: Purine,
    strand: Strand,
    strand_propensity: Strand,
    taylor: Taylor,
    turn: Turn,
    turn_propensity: Turn,
    zappo: Zappo,
  },
  getColor: function(scheme) {
    var color = Colors.mapping[scheme];
    if (color === undefined) {
      color = {};
    }
    return color;
  }
};

},{"./buried":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/buried.js","./cinema":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/cinema.js","./clustal":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/clustal.js","./clustal2":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/clustal2.js","./helix":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/helix.js","./hydrophobicity":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/hydrophobicity.js","./lesk":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/lesk.js","./mae":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/mae.js","./nucleotide":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/nucleotide.js","./purine":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/purine.js","./strand":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/strand.js","./taylor":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/taylor.js","./turn":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/turn.js","./zappo":"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/zappo.js"}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/strand.js":[function(require,module,exports){
module.exports = {
  A: "#5858a7",
  R: "#6b6b94",
  N: "#64649b",
  D: "#2121de",
  C: "#9d9d62",
  Q: "#8c8c73",
  E: "#0000ff",
  G: "#4949b6",
  H: "#60609f",
  I: "#ecec13",
  L: "#b2b24d",
  K: "#4747b8",
  M: "#82827d",
  F: "#c2c23d",
  P: "#2323dc",
  S: "#4949b6",
  T: "#9d9d62",
  W: "#c0c03f",
  Y: "#d3d32c",
  V: "#ffff00",
  B: "#4343bc",
  X: "#797986",
  Z: "#4747b8"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/taylor.js":[function(require,module,exports){
module.exports = {
  A: "#ccff00",
  R: "#0000ff",
  N: "#cc00ff",
  D: "#ff0000",
  C: "#ffff00",
  Q: "#ff00cc",
  E: "#ff0066",
  G: "#ff9900",
  H: "#0066ff",
  I: "#66ff00",
  L: "#33ff00",
  K: "#6600ff",
  M: "#00ff00",
  F: "#00ff66",
  P: "#ffcc00",
  S: "#ff3300",
  T: "#ff6600",
  W: "#00ccff",
  Y: "#00ffcc",
  V: "#99ff00",
  B: "#fff",
  X: "#fff",
  Z: "#fff"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/turn.js":[function(require,module,exports){
module.exports = {
  A: "#2cd3d3",
  R: "#708f8f",
  N: "#ff0000",
  D: "#e81717",
  C: "#a85757",
  Q: "#3fc0c0",
  E: "#778888",
  G: "#ff0000",
  H: "#708f8f",
  I: "#00ffff",
  L: "#1ce3e3",
  K: "#7e8181",
  M: "#1ee1e1",
  F: "#1ee1e1",
  P: "#f60909",
  S: "#e11e1e",
  T: "#738c8c",
  W: "#738c8c",
  Y: "#9d6262",
  V: "#07f8f8",
  B: "#f30c0c",
  X: "#7c8383",
  Z: "#5ba4a4"
};

},{}],"/home/wre/dev/js/msa/node_modules/biojs-util-colorschemes/src/zappo.js":[function(require,module,exports){
module.exports = {
  A: "#ffafaf",
  R: "#6464ff",
  N: "#00ff00",
  D: "#ff0000",
  C: "#ffff00",
  Q: "#00ff00",
  E: "#ff0000",
  G: "#ff00ff",
  H: "#6464ff",
  I: "#ffafaf",
  L: "#ffafaf",
  K: "#6464ff",
  M: "#ffafaf",
  F: "#ffc800",
  P: "#ff00ff",
  S: "#00ff00",
  T: "#00ff00",
  W: "#ffc800",
  Y: "#ffc800",
  V: "#ffafaf",
  B: "#fff",
  X: "#fff",
  Z: "#fff"
};

},{}],"/home/wre/dev/js/msa/node_modules/extend/index.js":[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toString.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],"/home/wre/dev/js/msa/src/MSASource.js":[function(require,module,exports){
var request = require('./request')
, extend = require('extend')
;

function min(arr) {
    return Math.min.apply(Math, arr);
}

function max(arr) {
    return Math.max.apply(Math, arr);
}

function createLineCache () {
    var lc = [], idx = [], len = MSA.numCachedLines;

    var to = null;
    function trim(dir) {
        var a, b;
        while ( (a=max(idx)) - (b=min(idx)) > len) {
            i = dir ? b : a;
            delete lc[i];
            idx.splice(idx.indexOf(i), 1);
        }
    }

    lc.set = function (i, val) {
        clearTimeout(to);
        var dir = i > max(idx) ? 1 : 0;
        this[i] = val;
        idx.push(i);
        if (this.length > len) {
            to = setTimeout(trim.bind(null, dir), 300);
        }
    };
    Object.defineProperties(lc, {
        'lastDefinedIndex': {
            get: function () {return max(idx);}
        }, 'firstDefinedIndex': {
            get: function () {return min(idx);}
        }
    });

    return lc;
}


function MSA(src) {
    this.src = null;
    this.href = null;
    this.sizePromise = null;
    this.lineCache = createLineCache();
    this.linePromises = [];
    this.LOCK = false;

    if (!(/http/.test(src))) {
        this.src = src;
    } else {
        this.href = src;
    }
}


/** @prop {int} set the number of lines that should be cached at most */
MSA.numCachedLines = 3000;

/** @prop {int} set the number of lines to fetch eagerly */
MSA.numPrefetchLines = 1000;

/** @prop {float} fraction at which to trigger prefetch */
MSA.numPrefetchTrigger = 0.5;


/**
 * Fetch and calculate different aspects of the MSA.
 * Returns the promise of an object:
 *   {
 *     {int} size       The bytesize of the whole MSA file
 *     {int} width      The widht of the MSA, i.e. the line length
 *                      of those lines actually containing sequences
 *     {int} offset     The byte offset to the first sequence
 *     {int} count      The number of sequences in the MSA
 *     {int} labelWidth The number of characters reserved for labels
 *                      in front of the sequences
 *   }
 *
 * @return {Promise}
 */

MSA.prototype.getSize = function () {

    var lineCache = this.lineCache;

    // Return the promise if the quers has been
    // performed before
    if (this.sizePromise)
        return this.sizePromise;


    // Get the headers for the file to find out the total
    // file size
    var headP = request(this.href, {method: 'HEAD'})
        .then(function (req){
            return {size: parseInt(req.getResponseHeader('Content-Length'))};
        });

    // get the first 10 kb to find out the line width, label width
    // and byte offset to the first sequence
    var startP = request(this.href, {headers: {range: 'bytes=0-10240'}})
        .then(function (req) {
            var i = 0, lineWidth, labelWidth, lines = req.response.split('\n')
            , lOffset = 1, offset = lines[0].length + 1, seq;

            // walk down the file, for each 'empty'
            // line add one to the offset, because of the \n
            // removed during the split('\n')
            while (!lines[++i].length) {
                offset++;
                lOffset++;
            }

            // i is now the first line with an actual sequence
            // add one because of the \n we lost in the split
            lineWidth = lines[i].length + 1;
            labelWidth = lines[i].match(/.* +/)[0].length;

            // now push the rest of the lines onto the cache
            // if they are whole
            while ((lines[i].length + 1) === lineWidth) {
                 seq = {
                    label: lines[i].substr(0, labelWidth)
                    , sequence: lines[i].substr(labelWidth)
                };
                lineCache.set(i-lOffset, seq);
                i++;
            }

            return {
                labelWidth: labelWidth
                , lineWidth: lineWidth
                , sequenceWidth: lineWidth - labelWidth
                , offset: offset
            };
        }.bind(this));

    // get last 10kb to get the alignment from the last line
    var endP = request(this.href, {headers: {range: 'bytes=-10240'}})
        .then(function (req) {
            var lines = req.response.split('\n')
            , aln = lines.slice(-2)[0]
            ;

            return {alignment: aln};
        });

    // and count the number of sequences
    this.sizePromise = Promise.all([headP, startP, endP])
        .then(function (props) {
            // merge everything into one object
            props = extend({}, props[0], props[1], props[2]);

            // calculate sequence count and width
            props.sequenceCount = (props.size - props.offset) / props.lineWidth - 2;

            return props;
        });

    return this.sizePromise;
};

/**
 * Returns the Promise of a string containing
 * the actual alignment information
 *
 * @return {Promise}
 */

MSA.prototype.getAlignment = function () {
    return this.getSize().then(function (props) {
        return props.alignment;
    });
};

/**
 * Returns the Promise of an integer containing
 * the sequence count
 *
 * @return {Promise}
 */

MSA.prototype.getCount = function () {
    return this.getSize().then(function (props) {
        return props.sequenceCount;
    });
};

/**
 * Return the Promise of a single sequence object
 * containing
 * {
 *   {string} label
 *   {string} sequence
 * }
 *
 * @param {int} l line to get, 0-indexed
 * @return {Promise}
 */

MSA.prototype.getLine = function (l) {
    var x;

    if ((x = this.lineCache[l])) {
        return Promise.resolve(x);
    }

    return this.getLines(l, l, true).then(function (lines) {return lines[0];});
};

/**
 * Return the Promise of an array of sequence objects
 * containing
 * {
 *   {string} label
 *   {string} sequence
 * }
 *
 * @param {int} a              first line to get, 0-indexed
 * @param {int} [b]            last line to get, defaults to a
 * @param {bool} doNotPrefetch flag to supress prefetch
 * @return {Promise}
 */

MSA.prototype.getLines = function (a, b, doNotPrefetch) {
    b = b || a;

    var lineCache = this.lineCache
    , linePromises = this.linePromises
    , href = this.href
    ;

    return this.getSize().then(function (props) {
        var labelWidth = props.labelWidth
        , lineWidth = props.lineWidth
        , count = props.sequenceCount
        , offset = props.offset
        , res = [], fetch = [], wait = []
        , range, x, i, p, c, d, e, f
        ;


        if (a > count) {
            return Promise.resolve(null);
        }

        if (b > count) {
            b = count;
        }

        // get lines from Cache if available
        for (i = a; i <= b; i++) {
            if ((x = lineCache[i])) {
                res.push(x);
            } else if ((x = linePromises[i])) {
                if (wait.indexOf(x) === -1) {
                    wait.push(x);
                }
            } else {
                fetch.push(i);
            }
        }

        // trigger eager prefetch
        if (!doNotPrefetch && !this.LOCK) {
            e = lineCache.lastDefinedIndex - (MSA.numPrefetchLines * MSA.numPrefetchTrigger);
            f = lineCache.firstDefinedIndex + (MSA.numPrefetchLines * MSA.numPrefetchTrigger);

            if (b > e && lineCache.lastDefinedIndex < count) {
                // prefetch forward
                e = lineCache.lastDefinedIndex;
                f = min([e + MSA.numPrefetchLines, count]);
            } else if (a < f && lineCache.firstDefinedIndex > 0) {
                // prefetch backward
                f = lineCache.firstDefinedIndex;
                e = max([f - MSA.numPrefetchLines, 0]);
            } else {
                e = f = null;
            }

            if (e) {
                this.LOCK = true;
                this.getLines(e, f, true)
                    .then(function(){
                        this.LOCK = false;
                    }.bind(this));
            }
        }

        // if we do not need to fetch more lines
        // from the remote source, return the
        // results now
        if (fetch.length === 0 && wait.length === 0) {
            return Promise.resolve(res);
        }

        if (fetch.length > 0) {
            // construct range request
            c = min(fetch); d = max(fetch);

            range = [
                offset + c * lineWidth
                , offset + (d+1) * lineWidth - 2
            ].join('-');

            p = request(href, {headers: {range: 'bytes=' + range}})
                .then(function (req) {
                    // put all the fetches lines onto the linecache
                    // and push them to the response
                    req.response.split('\n').forEach(function (l, i) {
                        var seq = {
                            label: l.substr(0, labelWidth)
                            , sequence: l.substr(labelWidth)
                        };
                        lineCache.set(c+i, seq);
                        delete linePromises[c+i];
                    });
                });
            wait.push(p);
            for (i=c;i <=d; i++) {
                linePromises[i] = p;
            }
        }

        return Promise.all(wait).then(function() {
            return lineCache.slice(a, b+1);
        });
    }.bind(this));
};

module.exports = MSA;

},{"./request":"/home/wre/dev/js/msa/src/request.js","extend":"/home/wre/dev/js/msa/node_modules/extend/index.js"}],"/home/wre/dev/js/msa/src/request.js":[function(require,module,exports){
module.exports = function request(url, opt) {
    opt = opt || {};

    return new Promise(function (resolve, reject) {
        var req = new XMLHttpRequest();

        req.open(opt.method || 'GET', url, true);

        Object.keys(opt.headers || {}).forEach(function (k) {
            req.setRequestHeader(k, opt.headers[k]);
        });

        req.onload = function () {
            return req.status >= 400 ? reject(req) : resolve(req);
        };

        req.onerror = function (err) {
            return reject(err);
        };

        req.send(opt.data || void 0);
    });
};

},{}]},{},["./src/index.sjs"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS93cmUvZGV2L2pzL21zYS9zcmMvaW5kZXguc2pzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9idXJpZWQuanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL2NpbmVtYS5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvY2x1c3RhbC5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvY2x1c3RhbDIuanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL2hlbGl4LmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9oeWRyb3Bob2JpY2l0eS5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL2xlc2suanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL21hZS5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvbnVjbGVvdGlkZS5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvcHVyaW5lLmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9zZWxlY3Rvci5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvc3RyYW5kLmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy90YXlsb3IuanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL3R1cm4uanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL3phcHBvLmpzIiwibm9kZV9tb2R1bGVzL2V4dGVuZC9pbmRleC5qcyIsInNyYy9NU0FTb3VyY2UuanMiLCJzcmMvcmVxdWVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ3dVSSxJQXhVQSxZQUFBLEdBQVUsT0FBQSxDQUFRLFdBQVIsQ0F3VVYsRUF2VUYsUUFBQSxHQUFNLE9BQUEsQ0FBUSxhQUFSLENBdVVKLEVBdFVGLFdBQUEsR0FBUyxPQUFBLENBQVEsUUFBUixDQXNVUCxFQXJVRix3QkFBQSxHQUFzQixPQUFBLENBQVEseUJBQVIsRUFBbUMsUUFxVXZELENBeFVKO0FBd1VJO0FBQUE7QUFBQTtBQUFBLElBOVRBLFVBQUEsR0FBUSxJQUFBLENBQUssS0FBTCxDQUFXLElBQVgsQ0FBZ0IsSUFBaEIsQ0E4VFIsQ0F4VUo7QUF3VUksSUE3VEEsU0FBQSxHQUFPLElBQUEsQ0FBSyxJQUFMLENBQVUsSUFBVixDQUFlLElBQWYsQ0E2VFAsQ0F4VUo7QUFhQSxTQUFTLGNBQVQsQ0FBbUIsT0FBbkIsRUFBdUIsT0FBdkIsRUFBMkIsUUFBM0IsRUFBZ0M7QUFBQSxJQUM1QixJQUFJLFFBQUEsR0FBTSxPQUFWO0FBQUEsUUFBYyxPQUFPLE9BQVAsQ0FEYztBQUFBLElBRTVCLElBQUksUUFBQSxHQUFNLE9BQVY7QUFBQSxRQUFjLE9BQU8sT0FBUCxDQUZjO0FBQUEsSUFHNUIsT0FBTyxRQUFQLENBSDRCO0FBQUEsQ0FiaEM7QUFtQkEsU0FBUyxVQUFULENBQWUsUUFBZixFQUFvQixNQUFwQixFQUF1QixNQUF2QixFQUEwQjtBQUFBLElBQ3RCLE9BQU8sS0FBQSxDQUFNLFNBQU4sQ0FBZ0IsS0FBaEIsQ0FBc0IsSUFBdEIsQ0FBMkIsUUFBM0IsRUFBZ0MsTUFBaEMsRUFBbUMsTUFB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpXG4sIE1TQSA9IHJlcXVpcmUoJy4vTVNBU291cmNlJylcbiwgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJylcbiwgY29sb3JTY2hlbWVTZWxlY3RvciA9IHJlcXVpcmUoJ2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzJykuc2VsZWN0b3JcbjtcblxuLyoqXG4gKiBIZWxwZXJzXG4gKi9cblxudmFyIGZsb29yID0gTWF0aC5mbG9vci5iaW5kKE1hdGgpO1xudmFyIGNlaWwgPSBNYXRoLmNlaWwuYmluZChNYXRoKTtcblxuZnVuY3Rpb24gbWlubWF4dmFsKG1pLCBtYSwgdmFsKSB7XG4gICAgaWYgKHZhbCA8IG1pKSByZXR1cm4gbWk7XG4gICAgaWYgKHZhbCA+IG1hKSByZXR1cm4gbWE7XG4gICAgcmV0dXJuIHZhbDtcbn1cblxuZnVuY3Rpb24gc2xpY2UoYXJyLCBhLCBiKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyciwgYSwgYik7XG59XG5cbmZ1bmN0aW9uICQocSwgcikge1xuICAgIHJldHVybiAocnx8ZG9jdW1lbnQpLnF1ZXJ5U2VsZWN0b3IocSk7XG59XG5cbmZ1bmN0aW9uICQkKHEsIHIpIHtcbiAgICBpZiAocS5jb25zdHJ1Y3Rvci5uYW1lICE9PSAnTm9kZUxpc3QnKVxuICAgICAgICBxID0gKHJ8fGRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKHEpO1xuXG4gICAgcmV0dXJuIHNsaWNlKHEpO1xufVxuXG4vKipcbiAqIE11bHRpU2VxdWVuY2VBbGlnbm1lbnQgVmlld2VyIGNsYXNzXG4gKi9cblxuXG5jbGFzcyBNU0FWaWV3ICB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgTXV0bGlTZXF1ZW5jZUFsaWdubWVudCBWaWV3ZXJcbiAgICAgKiBPcHRpb25zIGluY2x1ZGVcbiAgICAgKiAgICAgZm9udDoge3N0cmluZ30gbGlrZSAnMTJweCBtb25vc3BhY2UnXG4gICAgICogICAgIGxpbmVIZWlnaHQ6IHtpbnR9XG4gICAgICogICAgIGxhYmVsV2lkdGg6IHtpbnR9XG4gICAgICogICAgIGxlZnRNYXJnaW46IHtpbnR9XG4gICAgICogICAgIGxldHRlclNwYWNpbmc6IHtpbnR9XG4gICAgICogICAgIGN1cnNvckNvbG9yOiB7c3RyaW5nfSBsaWtlICdyZ2JhKDEyOCwgMTI4LCAxMjgsIDAuMiknXG4gICAgICogICAgIGxvYWRpbmdUZXh0OiB7c3RyaW5nfVxuICAgICAqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtET01Ob2RlfSByb290XG4gICAgICogQHBhcmFtIHtvYmplY3R9ICBvcHRpb25zXG4gICAgICovXG5cbiAgICBjb25zdHJ1Y3RvciAocm9vdCwgb3B0aW9ucykge1xuXG4gICAgICAgIHdpbmRvdy5hID0gdGhpcztcblxuICAgICAgICB2YXIgY2FudmFzO1xuXG4gICAgICAgIC8vIGluY2x1ZGUgZGVmYXVsdCBvcHRpb25zIGFuZCBvcHRpb25zIGZyb20gRE9NIGRhdGFzZXRcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZCh7fSwgTVNBVmlldy5kZWZhdWx0T3B0aW9ucywgcm9vdC5kYXRhc2V0LCBvcHRpb25zKTtcblxuICAgICAgICAvLyBjcmVhdGUgY2FudmFzIGlmIG5vdCBwcmVzZW50XG4gICAgICAgIGlmICghKGNhbnZhcyA9ICQoJ2NhbnZhcycsIHJvb3QpKSlcbiAgICAgICAgICAgIHJvb3QuYXBwZW5kQ2hpbGQoY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykpO1xuXG4gICAgICAgIGlmICgnYmNuTXNhRnVsbHNjcmVlbicgaW4gb3B0aW9ucylcbiAgICAgICAgICAgIHJvb3Quc3R5bGUud2lkdGggPSByb290LnN0eWxlLmhlaWdodCA9ICcxMDAlJztcblxuICAgICAgICAvLyBzZXQgY2FudmFzIHByb3BvcnRpb25zIGFuZCBoaWRlIGN1cnNvclxuICAgICAgICBjYW52YXMud2lkdGggPSByb290Lm9mZnNldFdpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gcm9vdC5vZmZzZXRIZWlnaHQ7XG4gICAgICAgIC8vIGNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnbm9uZSc7XG5cbiAgICAgICAgLy8gY29udmVuaWVuY2UgbWV0aG9kXG4gICAgICAgIGNhbnZhcy5vbiA9IChldmVudCwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgY2FsbGJhY2suYmluZCh0aGlzKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYXR0YWNoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGNhbnZhcy5vbignbW91c2V3aGVlbCcsIHRoaXMub25TY3JvbGwpO1xuICAgICAgICBjYW52YXMub24oJ3doZWVsJywgdGhpcy5vblNjcm9sbCk7XG4gICAgICAgIGNhbnZhcy5vbignbW91c2Vtb3ZlJywgdGhpcy5vblBvaW50ZXJNb3ZlKTtcbiAgICAgICAgY2FudmFzLm9uKCdtb3VzZW91dCcsIHRoaXMub25Qb2ludGVyT3V0KTtcbiAgICAgICAgY2FudmFzLm9uKCdtb3VzZWRvd24nLCB0aGlzLm9uUG9pbnRlckRvd24pO1xuICAgICAgICBjYW52YXMub24oJ21vdXNldXAnLCB0aGlzLm9uUG9pbnRlclVwKTtcbiAgICAgICAgY2FudmFzLm9uKCdjb250ZXh0bWVudScsIGUgPT4gZS5wcmV2ZW50RGVmYXVsdCgpICk7XG5cbiAgICAgICAgdGhpcy5hbGlnbm1lbnQgPSBuZXcgTVNBKHJvb3QuZGF0YXNldC5hbGlnbm1lbnQpO1xuICAgICAgICB0aGlzLnNjcm9sbFBvcyA9IHt4OiAwLCB5OiAwLCBtYXhYOiAwLCBtYXhZOiAwfTtcbiAgICAgICAgdGhpcy5jdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgdGhpcy5jdHguZm9udCA9IG9wdGlvbnMuZm9udDtcbiAgICAgICAgdGhpcy5kcmF3ID0gdGhpcy5kcmF3LmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucmVuZGVyID0gdGhpcy5kcmF3LmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY29sb3JTY2hlbWUgPSBjb2xvclNjaGVtZVNlbGVjdG9yLmdldENvbG9yKG9wdGlvbnMuY29sb3JTY2hlbWUpO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICAgICAgdGhpcy5tb3VzZVBvcyA9IG51bGw7XG4gICAgICAgIHRoaXMuTE9DSyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnZpZXcgPSBudWxsO1xuICAgICAgICB0aGlzLnVwZGF0ZVZpZXcoKTtcblxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5kcmF3KTtcbiAgICB9XG5cbiAgICB1cGRhdGVWaWV3ICgpIHtcblxuICAgICAgICBpZiAodGhpcy5MT0NLKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuTE9DSztcblxuICAgICAgICBpZiAoISh0aGlzLnZpZXcpKVxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXG5cbiAgICAgICAgdmFyIGN2cyA9IHRoaXMuY2FudmFzXG4gICAgICAgICwgYWxuID0gdGhpcy5hbGlnbm1lbnRcbiAgICAgICAgLCBvcHQgPSB0aGlzLm9wdGlvbnNcbiAgICAgICAgLCB2aWV3ID0gdGhpcy52aWV3XG4gICAgICAgICwgc2Nyb2xsID0gdGhpcy5zY3JvbGxQb3NcbiAgICAgICAgLCBlbSA9IHZpZXcuY2hhcldpZHRoICsgb3B0LmxldHRlclNwYWNpbmdcbiAgICAgICAgLCBIID0gY3ZzLmNsaWVudEhlaWdodCwgVyA9IGN2cy5jbGllbnRXaWR0aFxuICAgICAgICA7XG5cbiAgICAgICAgcmV0dXJuICh0aGlzLkxPQ0sgPSBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICBhbG4uZ2V0TGluZXModmlldy5vZmZzZXRZLCB2aWV3Lm9mZnNldFkgKyB2aWV3LmhlaWdodClcbiAgICAgICAgICAgICwgYWxuLmdldFNpemUoKVxuICAgICAgICBdKS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcblxuICAgICAgICAgICAgdmlldy50cmFja3MgPSByZXNbMF07XG4gICAgICAgICAgICB2aWV3LmFsaWdubWVudCA9IHJlc1sxXS5hbGlnbm1lbnQ7XG4gICAgICAgICAgICB2aWV3LmNvdW50ID0gcmVzWzFdLnNlcXVlbmNlQ291bnQ7XG4gICAgICAgICAgICB2aWV3LnNlcXVlbmNlV2lkdGggPSByZXNbMV0uc2VxdWVuY2VXaWR0aDtcblxuICAgICAgICAgICAgc2Nyb2xsLm1heFggPSBmbG9vcih2aWV3LnNlcXVlbmNlV2lkdGggKiBlbSlcbiAgICAgICAgICAgICAgICAtIFcgKyBvcHQubGFiZWxXaWR0aCArIG9wdC5sZWZ0TWFyZ2luO1xuICAgICAgICAgICAgc2Nyb2xsLm1heFkgPSAocmVzWzFdLnNlcXVlbmNlQ291bnQgLSB2aWV3LmhlaWdodClcbiAgICAgICAgICAgICAgICAqIG9wdC5saW5lSGVpZ2h0IC0gSDtcblxuICAgICAgICAgICAgdmlldy5sYXN0T2Zmc2V0WSA9IHZpZXcub2Zmc2V0WTtcbiAgICAgICAgICAgIHRoaXMuTE9DSyA9IGZhbHNlO1xuICAgICAgICB9LmJpbmQodGhpcykpKTtcbiAgICB9XG5cbiAgICBvblNjcm9sbCAoZSkge1xuICAgICAgICBpZiAodGhpcy5MT0NLKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBzID0gdGhpcy5zY3JvbGxQb3NcbiAgICAgICAgLCBkeCA9IGUuZGVsdGFYIHx8IC1lLndoZWVsRGVsdGFYXG4gICAgICAgICwgZHkgPSBlLmRlbHRhWSB8fCAtZS53aGVlbERlbHRhWVxuICAgICAgICA7XG5cbiAgICAgICAgcy54ID0gZmxvb3IobWlubWF4dmFsKDAsIHMubWF4WCwgcy54ICsgZHgpKTtcbiAgICAgICAgcy55ID0gZmxvb3IobWlubWF4dmFsKDAsIHMubWF4WSwgcy55ICsgZHkpKTtcbiAgICB9XG5cbiAgICBvblBvaW50ZXJPdXQgKCkge1xuICAgICAgICB0aGlzLm1vdXNlUG9zID0gbnVsbDtcbiAgICB9XG5cbiAgICBvblBvaW50ZXJNb3ZlIChlKSB7XG4gICAgICAgIHZhciByID0gdGhpcy5jYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiAgICAgICAgLCBtID0gdGhpcy5tb3VzZVBvcyB8fCB7fVxuICAgICAgICA7XG5cbiAgICAgICAgdGhpcy5tb3VzZVBvcyA9IHtcbiAgICAgICAgICAgIGxlZnQ6IG0ubGVmdFxuICAgICAgICAgICAgLCByaWdodDogbS5yaWdodFxuICAgICAgICAgICAgLCBtaWRkbGU6IG0ubWlkZGxlXG4gICAgICAgICAgICAsIHk6IGUuY2xpZW50WSAtIHIudG9wXG4gICAgICAgICAgICAsIHg6IGUuY2xpZW50WCAtIHIubGVmdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIG9uUG9pbnRlckRvd24gKGUpIHtcbiAgICAgICAgdmFyIG0gPSB0aGlzLm1vdXNlUG9zO1xuXG4gICAgICAgIGlmICghbSkgcmV0dXJuO1xuXG4gICAgICAgIHN3aXRjaCAoZS53aGljaCkge1xuICAgICAgICAgICAgY2FzZSAxOiBtLmxlZnQgPSB0cnVlOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzogbS5yaWdodCA9IHRydWU7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOiBtLm1pZGRsZSA9IHRydWU7IGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG0ubWlkZGxlKVxuICAgICAgICAgICAgdGhpcy5zY3JvbGxQb3MucGFuID0ge3g6IG0ueCwgeTogbS55fTtcblxuICAgICAgICBpZiAobS5sZWZ0KVxuICAgICAgICAgICAgdGhpcy52aWV3Lm1hcmsgPSB7c3g6IG0uc3gsIHN5OiBtLnN5fTtcblxuICAgIH1cblxuICAgIG9uUG9pbnRlclVwIChlKSB7XG4gICAgICAgIHZhciBtID0gdGhpcy5tb3VzZVBvcztcblxuICAgICAgICBpZiAobS5taWRkbGUpXG4gICAgICAgICAgICB0aGlzLnNjcm9sbFBvcy5wYW4gPSBudWxsO1xuXG4gICAgICAgIHN3aXRjaCAoZS53aGljaCkge1xuICAgICAgICAgICAgY2FzZSAxOiBtLmxlZnQgPSBmYWxzZTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM6IG0ucmlnaHQgPSBmYWxzZTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6IG0ubWlkZGxlID0gZmFsc2U7IGJyZWFrO1xuICAgICAgICB9XG5cblxuICAgIH1cblxuICAgIGRyYXcgKHQpIHtcblxuICAgICAgICB2YXIgY3ZzID0gdGhpcy5jYW52YXNcbiAgICAgICAgLCBjdHggPSB0aGlzLmN0eFxuICAgICAgICAsIG9wdCA9IHRoaXMub3B0aW9uc1xuICAgICAgICAsIHZpZXcgPSB0aGlzLnZpZXdcbiAgICAgICAgLCBsb2NrID0gdGhpcy5MT0NLXG4gICAgICAgICwgbW91c2UgPSB0aGlzLm1vdXNlUG9zXG4gICAgICAgICwgc2Nyb2xsID0gdGhpcy5zY3JvbGxQb3NcbiAgICAgICAgLCBjb2wgPSB0aGlzLmNvbG9yU2NoZW1lXG4gICAgICAgICwgZW0gPSB2aWV3ICYmICh2aWV3LmNoYXJXaWR0aCArIG9wdC5sZXR0ZXJTcGFjaW5nKVxuICAgICAgICAsIGNoYXJXaWR0aCA9IHZpZXcgJiYgdmlldy5jaGFyV2lkdGhcbiAgICAgICAgLCBIID0gY3ZzLmNsaWVudEhlaWdodCwgVyA9IGN2cy5jbGllbnRXaWR0aFxuICAgICAgICAsIGxpbmVIZWlnaHQgPSBvcHQubGluZUhlaWdodFxuICAgICAgICAsIGxldHRlclNwYWNpbmcgPSBvcHQubGV0dGVyU3BhY2luZ1xuICAgICAgICAsIGxhYmVsV2lkdGggPSBvcHQubGFiZWxXaWR0aFxuICAgICAgICAsIGxlZnRNYXJnaW4gPSBvcHQubGVmdE1hcmdpblxuICAgICAgICA7XG5cbiAgICAgICAgaWYgKCF2aWV3KSB7XG4gICAgICAgICAgICB2aWV3ID0gdGhpcy52aWV3ID0ge3RyYWNrczogW119O1xuICAgICAgICAgICAgY2hhcldpZHRoID0gdmlldy5jaGFyV2lkdGggPSBjZWlsKGN0eC5tZWFzdXJlVGV4dCgneCcpLndpZHRoKTtcbiAgICAgICAgICAgIGVtID0gdmlldy5jaGFyV2lkdGggKyBsZXR0ZXJTcGFjaW5nO1xuICAgICAgICAgICAgdmlldy5oZWlnaHQgPSBmbG9vcihIIC8gbGluZUhlaWdodCkgLSA0O1xuICAgICAgICAgICAgdmlldy5zZXFPZmZzZXQgPSBsYWJlbFdpZHRoICsgbGV0dGVyU3BhY2luZyArIGxlZnRNYXJnaW47XG4gICAgICAgICAgICB2aWV3LmxhYmVsVHJ1bmNhdGUgPSBmbG9vcigobGFiZWxXaWR0aCAtIGxlZnRNYXJnaW4pIC8gY2hhcldpZHRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoZWNrIG1vdXNlIG1pZGRsZSBidXR0b24gc2Nyb2xsXG4gICAgICAgIGlmIChtb3VzZSAmJiBtb3VzZS5taWRkbGUpIHtcbiAgICAgICAgICAgIGxldCBkeCA9IChtb3VzZS54IC0gc2Nyb2xsLnBhbi54KSAvIDEwXG4gICAgICAgICAgICAsIGR5ID0gKG1vdXNlLnkgLSBzY3JvbGwucGFuLnkpIC8gMTBcbiAgICAgICAgICAgIDtcblxuICAgICAgICAgICAgc2Nyb2xsLnggPSBmbG9vcihtaW5tYXh2YWwoMCwgc2Nyb2xsLm1heFgsIHNjcm9sbC54ICsgZHgpKTtcbiAgICAgICAgICAgIHNjcm9sbC55ID0gZmxvb3IobWlubWF4dmFsKDAsIHNjcm9sbC5tYXhZLCBzY3JvbGwueSArIGR5KSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHZpZXcub2Zmc2V0WCA9IGZsb29yKHNjcm9sbC54IC8gZW0pO1xuICAgICAgICB2aWV3Lm9mZnNldFkgPSBmbG9vcihzY3JvbGwueSAvIGxpbmVIZWlnaHQpO1xuXG4gICAgICAgIC8vIGdldCBtb3VzZSBjb29yZGluYXRlcyByZWxhdGl2ZSB0byBzZXF1ZW5jZSBhbmRcbiAgICAgICAgLy8gYW1pbm9hY2lkIHBvc2l0aW9uXG4gICAgICAgIGlmIChtb3VzZSkge1xuICAgICAgICAgICAgbW91c2Uuc3ggPSBmbG9vcigobW91c2UueCAtIHZpZXcuc2VxT2Zmc2V0KSAvIGVtKSArIHZpZXcub2Zmc2V0WDtcbiAgICAgICAgICAgIG1vdXNlLnN5ID0gZmxvb3IobW91c2UueSAvIGxpbmVIZWlnaHQpIC0gMiArIHZpZXcub2Zmc2V0WTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG1heWJlIHdlIG5lZWQgdG8gZmV0Y2ggbmV3IGxpbmVzIGZyb20gdGhlIHVuZGVybHlpbmcgc291cmNlXG4gICAgICAgIGlmICghbG9jayAmJiAodmlldy5vZmZzZXRZICE9PSB2aWV3Lmxhc3RPZmZzZXRZKSlcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlldygpO1xuXG4gICAgICAgIC8vIGNsZWFyIGNhbnZhc1xuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIFcsIEgpO1xuXG4gICAgICAgIC8vIGxvYWRpbmcgdGV4dFxuICAgICAgICBpZiAobG9jaylcbiAgICAgICAgICAgIGN0eC5maWxsVGV4dChvcHQubG9hZGluZ1RleHQsIGxlZnRNYXJnaW4sIGxpbmVIZWlnaHQpO1xuXG5cbiAgICAgICAgLy8gcnVsZXJcbiAgICAgICAge1xuICAgICAgICAgICAgbGV0IHkgPSBsaW5lSGVpZ2h0ICogMiwgeCA9IHZpZXcuc2VxT2Zmc2V0LCBpID0gdmlldy5vZmZzZXRYICsgMTtcbiAgICAgICAgICAgIHdoaWxlICh4IDwgVykge1xuICAgICAgICAgICAgICAgIGlmIChpICUgMTAgPT09IDAgfHwgaSA9PT0gMSlcbiAgICAgICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGkrJycsIHgsIHkpO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGkgJSA1ID09PSAwKVxuICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFRleHQoJy4nLCB4LCB5KTtcblxuICAgICAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgICAgICB4ICs9IGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICAvLyB0cmFja3NcbiAgICAgICAgaWYgKHZpZXcgJiYgdmlldy50cmFja3MpIHtcbiAgICAgICAgICAgIGxldCBiZ1cgPSBlbSArIDIsIGJnSCA9IGxpbmVIZWlnaHQgKyAyXG4gICAgICAgICAgICAsIGJnWCA9IC1lbS80LCBiZ1kgPSAtbGluZUhlaWdodCAqIDQvNVxuICAgICAgICAgICAgLCBtID0gbW91c2VcbiAgICAgICAgICAgIDtcblxuICAgICAgICAgICAgdmlldy50cmFja3MuZm9yRWFjaChmdW5jdGlvbiAodCwgaSkge1xuXG4gICAgICAgICAgICAgICAgbGV0IHkgPSAoaSArIDMpICogbGluZUhlaWdodCwgeCA9IHZpZXcuc2VxT2Zmc2V0XG4gICAgICAgICAgICAgICAgLCBqID0gdmlldy5vZmZzZXRYLCBzID0gIHQuc2VxdWVuY2UsIGwgPSB0LmxhYmVsXG4gICAgICAgICAgICAgICAgO1xuXG4gICAgICAgICAgICAgICAgLy8gc2VxdWVuY2VcbiAgICAgICAgICAgICAgICB3aGlsZSAoeCA8IFcpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGEgPSBzW2pdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGFhID0gc1tqXSkgIT09ICctJyAmJiBjb2xbYWFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gY29sW2FhXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGNvbFthYV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHgucmVjdCh4ICsgYmdYLCB5ICsgYmdZLCBlbSwgbGluZUhlaWdodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguZmlsbCgpOyBjdHguc3Ryb2tlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ2JsYWNrJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFRleHQoYWEsIHgsIHkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGogKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBlbTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBsYWJlbFxuICAgICAgICAgICAgICAgIGlmIChtICYmIChtb3VzZS5zeCA8IHZpZXcub2Zmc2V0WCkgJiYgbW91c2Uuc3kgPT09IHZpZXcub2Zmc2V0WSArIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZ2IoMjU1LCAyNTUsIDI1NSknO1xuICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFJlY3QobGVmdE1hcmdpbiwgeSAtIGxpbmVIZWlnaHQgKyAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsIFcsIGxpbmVIZWlnaHQgKyA0KTtcbiAgICAgICAgICAgICAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsID0gbC5zdWJzdHIoMCwgdmlldy5sYWJlbFRydW5jYXRlKSArICcuLi4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dChsLCBsZWZ0TWFyZ2luLCB5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1vdXNlKSB7XG4gICAgICAgICAgICBsZXQgciA9IG1vdXNlLmxlZnQgfHwgbW91c2UucmlnaHQgfHwgbW91c2UubWlkZGxlID8gNiA6IDQ7XG5cbiAgICAgICAgICAgIC8vIGluZm8gbGluZVxuICAgICAgICAgICAgaWYgKHZpZXcudHJhY2tzICYmIHZpZXcudHJhY2tzW21vdXNlLnN5XSkge1xuICAgICAgICAgICAgICAgIGxldCBzZXEgPSB2aWV3LnRyYWNrc1ttb3VzZS5zeV1cbiAgICAgICAgICAgICAgICAsIHBvcyA9IHNlcS5zZXF1ZW5jZVttb3VzZS5zeF07XG5cbiAgICAgICAgICAgICAgICBpZiAocG9zICYmIHBvcyAhPT0gJy0nKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcyArPSBzZXEuc2VxdWVuY2Uuc3Vic3RyKDAsIG1vdXNlLnN4KS5yZXBsYWNlKC8tL2csJycpLmxlbmd0aCsxO1xuICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFRleHQocG9zLCB2aWV3LnNlcU9mZnNldCwgbGluZUhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dChzZXEubGFiZWwsIHZpZXcuc2VxT2Zmc2V0ICsgNiAqIGNoYXJXaWR0aCwgbGluZUhlaWdodCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGN0eC5zYXZlKCk7XG4gICAgICAgICAgICAvLyBjdHguZmlsbFN0eWxlID0gb3B0LmN1cnNvckNvbG9yO1xuXG4gICAgICAgICAgICAvLyAvLyBpZiBtaWRkbGUgYnV0dG9uIGlzIHByZXNzZWRcbiAgICAgICAgICAgIC8vIGlmIChtb3VzZS5taWRkbGUpIHtcblxuICAgICAgICAgICAgLy8gICAgIC8vIGRyYXcgMyBjaXJjbGVzIGJldHdlZW4gdGhlIHBvaW50IHdoZXJlXG4gICAgICAgICAgICAvLyAgICAgLy8gdGhlIG1vdXNlIGJ1dHRvbiBoYXMgZmlyc3QgYmVlbiBwcmVzc2VkXG4gICAgICAgICAgICAvLyAgICAgLy8gYW5kIHRoZSBjdXJyZW50IGNvb3JkaW5hdGVzO1xuICAgICAgICAgICAgLy8gICAgIGxldCB4ID0gc2Nyb2xsLnBhbi54LCB5ID0gc2Nyb2xsLnBhbi55LCBpID0gNFxuICAgICAgICAgICAgLy8gICAgICwgZHggPSAoeC1tb3VzZS54KSAvIGksIGR5ID0gKHktbW91c2UueSkgLyBpXG4gICAgICAgICAgICAvLyAgICAgO1xuXG4gICAgICAgICAgICAvLyAgICAgZmlsbENpcmNsZSh4LCB5LCByICogMywgY3R4KTtcblxuICAgICAgICAgICAgLy8gICAgIHdoaWxlICgtLWkpXG4gICAgICAgICAgICAvLyAgICAgICAgIGZpbGxDaXJjbGUoeCAtIGR4KmksIHkgLSBkeSppLCBpICogci8yLCBjdHgpO1xuICAgICAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgICAgIC8vICAgICBmaWxsQ2lyY2xlKG1vdXNlLngsIG1vdXNlLnksIHIgKiAzLCBjdHgpO1xuICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICAvLyAvLyBkcmF3IHNtYWxsIGlubmVyIGNpcmNsZVxuICAgICAgICAgICAgLy8gZmlsbENpcmNsZShtb3VzZS54LCBtb3VzZS55LCByICogMiwgY3R4KTtcblxuICAgICAgICAgICAgLy8gY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuZHJhdyk7XG4gICAgfVxuXG59XG5cbmZ1bmN0aW9uIGZpbGxDaXJjbGUoeCwgeSwgciwgY3R4KSB7XG5cbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4LmFyYyh4LCB5LCByLCAwLCBNYXRoLlBJKjIpO1xuICAgIGN0eC5maWxsKCk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xufVxuXG5NU0FWaWV3LmNyZWF0ZSA9IGZ1bmN0aW9uIChvcHRpb25zLCBkb21Ob2RlKSB7XG4gICAgcmV0dXJuIG5ldyBNU0FWaWV3KGRvbU5vZGUsIG9wdGlvbnMpO1xufTtcblxuTVNBVmlldy5kZWZhdWx0T3B0aW9ucyA9IHtcbiAgICBmb250OiAnMTJweCBtb25vc3BhY2UnXG4gICAgLCBsaW5lSGVpZ2h0OiAxNCAgICAgLy8gcHhcbiAgICAsIGxhYmVsV2lkdGg6IDEwMCAgICAvLyBweFxuICAgICwgbGVmdE1hcmdpbjogMjAgICAgIC8vIHB4XG4gICAgLCBsZXR0ZXJTcGFjaW5nOiA4ICAgLy8gcHggYmV0d2VlbiBhbWlub2FjaWRzXG4gICAgLCBjdXJzb3JDb2xvcjogJ3JnYmEoMTI4LCAxMjgsIDEyOCwgMC4yKSdcbiAgICAsIGxvYWRpbmdUZXh0OiAnbG9hZGluZy4uLidcbiAgICAsIGNvbG9yU2NoZW1lOiAnY2x1c3RhbDInXG59O1xuXG5cbiQkKCdbZGF0YS1iY249XCJtc2FcIl0nKS5tYXAoTVNBVmlldy5jcmVhdGUuYmluZChudWxsLCBudWxsKSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2luZGV4LmpzJylcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBOiBcIiMwMGEzNWNcIixcbiAgUjogXCIjMDBmYzAzXCIsXG4gIE46IFwiIzAwZWIxNFwiLFxuICBEOiBcIiMwMGViMTRcIixcbiAgQzogXCIjMDAwMGZmXCIsXG4gIFE6IFwiIzAwZjEwZVwiLFxuICBFOiBcIiMwMGYxMGVcIixcbiAgRzogXCIjMDA5ZDYyXCIsXG4gIEg6IFwiIzAwZDUyYVwiLFxuICBJOiBcIiMwMDU0YWJcIixcbiAgTDogXCIjMDA3Yjg0XCIsXG4gIEs6IFwiIzAwZmYwMFwiLFxuICBNOiBcIiMwMDk3NjhcIixcbiAgRjogXCIjMDA4Nzc4XCIsXG4gIFA6IFwiIzAwZTAxZlwiLFxuICBTOiBcIiMwMGQ1MmFcIixcbiAgVDogXCIjMDBkYjI0XCIsXG4gIFc6IFwiIzAwYTg1N1wiLFxuICBZOiBcIiMwMGU2MTlcIixcbiAgVjogXCIjMDA1ZmEwXCIsXG4gIEI6IFwiIzAwZWIxNFwiLFxuICBYOiBcIiMwMGI2NDlcIixcbiAgWjogXCIjMDBmMTBlXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjQkJCQkJCXCIsXG4gIEI6IFwiZ3JleVwiLFxuICBDOiBcInllbGxvd1wiLFxuICBEOiBcInJlZFwiLFxuICBFOiBcInJlZFwiLFxuICBGOiBcIm1hZ2VudGFcIixcbiAgRzogXCJicm93blwiLFxuICBIOiBcIiMwMEZGRkZcIixcbiAgSTogXCIjQkJCQkJCXCIsXG4gIEo6IFwiI2ZmZlwiLFxuICBLOiBcIiMwMEZGRkZcIixcbiAgTDogXCIjQkJCQkJCXCIsXG4gIE06IFwiI0JCQkJCQlwiLFxuICBOOiBcImdyZWVuXCIsXG4gIE86IFwiI2ZmZlwiLFxuICBQOiBcImJyb3duXCIsXG4gIFE6IFwiZ3JlZW5cIixcbiAgUjogXCIjMDBGRkZGXCIsXG4gIFM6IFwiZ3JlZW5cIixcbiAgVDogXCJncmVlblwiLFxuICBVOiBcIiNmZmZcIixcbiAgVjogXCIjQkJCQkJCXCIsXG4gIFc6IFwibWFnZW50YVwiLFxuICBYOiBcImdyZXlcIixcbiAgWTogXCJtYWdlbnRhXCIsXG4gIFo6IFwiZ3JleVwiLFxuICBHYXA6IFwiZ3JleVwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwib3JhbmdlXCIsXG4gIEI6IFwiI2ZmZlwiLFxuICBDOiBcImdyZWVuXCIsXG4gIEQ6IFwicmVkXCIsXG4gIEU6IFwicmVkXCIsXG4gIEY6IFwiYmx1ZVwiLFxuICBHOiBcIm9yYW5nZVwiLFxuICBIOiBcInJlZFwiLFxuICBJOiBcImdyZWVuXCIsXG4gIEo6IFwiI2ZmZlwiLFxuICBLOiBcInJlZFwiLFxuICBMOiBcImdyZWVuXCIsXG4gIE06IFwiZ3JlZW5cIixcbiAgTjogXCIjZmZmXCIsXG4gIE86IFwiI2ZmZlwiLFxuICBQOiBcIm9yYW5nZVwiLFxuICBROiBcIiNmZmZcIixcbiAgUjogXCJyZWRcIixcbiAgUzogXCJvcmFuZ2VcIixcbiAgVDogXCJvcmFuZ2VcIixcbiAgVTogXCIjZmZmXCIsXG4gIFY6IFwiZ3JlZW5cIixcbiAgVzogXCJibHVlXCIsXG4gIFg6IFwiI2ZmZlwiLFxuICBZOiBcImJsdWVcIixcbiAgWjogXCIjZmZmXCIsXG4gIEdhcDogXCIjZmZmXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjODBhMGYwXCIsXG4gIFI6IFwiI2YwMTUwNVwiLFxuICBOOiBcIiMwMGZmMDBcIixcbiAgRDogXCIjYzA0OGMwXCIsXG4gIEM6IFwiI2YwODA4MFwiLFxuICBROiBcIiMwMGZmMDBcIixcbiAgRTogXCIjYzA0OGMwXCIsXG4gIEc6IFwiI2YwOTA0OFwiLFxuICBIOiBcIiMxNWE0YTRcIixcbiAgSTogXCIjODBhMGYwXCIsXG4gIEw6IFwiIzgwYTBmMFwiLFxuICBLOiBcIiNmMDE1MDVcIixcbiAgTTogXCIjODBhMGYwXCIsXG4gIEY6IFwiIzgwYTBmMFwiLFxuICBQOiBcIiNmZmZmMDBcIixcbiAgUzogXCIjMDBmZjAwXCIsXG4gIFQ6IFwiIzAwZmYwMFwiLFxuICBXOiBcIiM4MGEwZjBcIixcbiAgWTogXCIjMTVhNGE0XCIsXG4gIFY6IFwiIzgwYTBmMFwiLFxuICBCOiBcIiNmZmZcIixcbiAgWDogXCIjZmZmXCIsXG4gIFo6IFwiI2ZmZlwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiI2U3MThlN1wiLFxuICBSOiBcIiM2ZjkwNmZcIixcbiAgTjogXCIjMWJlNDFiXCIsXG4gIEQ6IFwiIzc3ODg3N1wiLFxuICBDOiBcIiMyM2RjMjNcIixcbiAgUTogXCIjOTI2ZDkyXCIsXG4gIEU6IFwiI2ZmMDBmZlwiLFxuICBHOiBcIiMwMGZmMDBcIixcbiAgSDogXCIjNzU4YTc1XCIsXG4gIEk6IFwiIzhhNzU4YVwiLFxuICBMOiBcIiNhZTUxYWVcIixcbiAgSzogXCIjYTA1ZmEwXCIsXG4gIE06IFwiI2VmMTBlZlwiLFxuICBGOiBcIiM5ODY3OThcIixcbiAgUDogXCIjMDBmZjAwXCIsXG4gIFM6IFwiIzM2YzkzNlwiLFxuICBUOiBcIiM0N2I4NDdcIixcbiAgVzogXCIjOGE3NThhXCIsXG4gIFk6IFwiIzIxZGUyMVwiLFxuICBWOiBcIiM4NTdhODVcIixcbiAgQjogXCIjNDliNjQ5XCIsXG4gIFg6IFwiIzc1OGE3NVwiLFxuICBaOiBcIiNjOTM2YzlcIlxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBOiBcIiNhZDAwNTJcIixcbiAgQjogXCIjMGMwMGYzXCIsXG4gIEM6IFwiI2MyMDAzZFwiLFxuICBEOiBcIiMwYzAwZjNcIixcbiAgRTogXCIjMGMwMGYzXCIsXG4gIEY6IFwiI2NiMDAzNFwiLFxuICBHOiBcIiM2YTAwOTVcIixcbiAgSDogXCIjMTUwMGVhXCIsXG4gIEk6IFwiI2ZmMDAwMFwiLFxuICBKOiBcIiNmZmZcIixcbiAgSzogXCIjMDAwMGZmXCIsXG4gIEw6IFwiI2VhMDAxNVwiLFxuICBNOiBcIiNiMDAwNGZcIixcbiAgTjogXCIjMGMwMGYzXCIsXG4gIE86IFwiI2ZmZlwiLFxuICBQOiBcIiM0NjAwYjlcIixcbiAgUTogXCIjMGMwMGYzXCIsXG4gIFI6IFwiIzAwMDBmZlwiLFxuICBTOiBcIiM1ZTAwYTFcIixcbiAgVDogXCIjNjEwMDllXCIsXG4gIFU6IFwiI2ZmZlwiLFxuICBWOiBcIiNmNjAwMDlcIixcbiAgVzogXCIjNWIwMGE0XCIsXG4gIFg6IFwiIzY4MDA5N1wiLFxuICBZOiBcIiM0ZjAwYjBcIixcbiAgWjogXCIjMGMwMGYzXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cy5zZWxlY3RvciA9IHJlcXVpcmUoXCIuL3NlbGVjdG9yXCIpO1xuXG4vLyBiYXNpY3Ncbm1vZHVsZS5leHBvcnRzLnRheWxvciA9IHJlcXVpcmUoXCIuL3RheWxvclwiKTtcbm1vZHVsZS5leHBvcnRzLnphcHBvPSByZXF1aXJlKFwiLi96YXBwb1wiKTtcbm1vZHVsZS5leHBvcnRzLmh5ZHJvPSByZXF1aXJlKFwiLi9oeWRyb3Bob2JpY2l0eVwiKTtcblxubW9kdWxlLmV4cG9ydHMuY2x1c3RhbCA9IHJlcXVpcmUoXCIuL2NsdXN0YWxcIik7XG5tb2R1bGUuZXhwb3J0cy5jbHVzdGFsMiA9IHJlcXVpcmUoXCIuL2NsdXN0YWwyXCIpO1xuXG5tb2R1bGUuZXhwb3J0cy5jdXJpZWQgPSByZXF1aXJlKFwiLi9idXJpZWRcIik7XG5tb2R1bGUuZXhwb3J0cy5jaW5lbWEgPSByZXF1aXJlKFwiLi9jaW5lbWFcIik7XG5tb2R1bGUuZXhwb3J0cy5udWNsZW90aWRlICA9IHJlcXVpcmUoXCIuL251Y2xlb3RpZGVcIik7XG5tb2R1bGUuZXhwb3J0cy5oZWxpeCAgPSByZXF1aXJlKFwiLi9oZWxpeFwiKTtcbm1vZHVsZS5leHBvcnRzLmxlc2sgID0gcmVxdWlyZShcIi4vbGVza1wiKTtcbm1vZHVsZS5leHBvcnRzLm1hZSA9IHJlcXVpcmUoXCIuL21hZVwiKTtcbm1vZHVsZS5leHBvcnRzLnB1cmluZSA9IHJlcXVpcmUoXCIuL3B1cmluZVwiKTtcbm1vZHVsZS5leHBvcnRzLnN0cmFuZCA9IHJlcXVpcmUoXCIuL3N0cmFuZFwiKTtcbm1vZHVsZS5leHBvcnRzLnR1cm4gPSByZXF1aXJlKFwiLi90dXJuXCIpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiIG9yYW5nZVwiLFxuICBCOiBcIiAjZmZmXCIsXG4gIEM6IFwiIGdyZWVuXCIsXG4gIEQ6IFwiIHJlZFwiLFxuICBFOiBcIiByZWRcIixcbiAgRjogXCIgZ3JlZW5cIixcbiAgRzogXCIgb3JhbmdlXCIsXG4gIEg6IFwiIG1hZ2VudGFcIixcbiAgSTogXCIgZ3JlZW5cIixcbiAgSjogXCIgI2ZmZlwiLFxuICBLOiBcIiByZWRcIixcbiAgTDogXCIgZ3JlZW5cIixcbiAgTTogXCIgZ3JlZW5cIixcbiAgTjogXCIgbWFnZW50YVwiLFxuICBPOiBcIiAjZmZmXCIsXG4gIFA6IFwiIGdyZWVuXCIsXG4gIFE6IFwiIG1hZ2VudGFcIixcbiAgUjogXCIgcmVkXCIsXG4gIFM6IFwiIG9yYW5nZVwiLFxuICBUOiBcIiBvcmFuZ2VcIixcbiAgVTogXCIgI2ZmZlwiLFxuICBWOiBcIiBncmVlblwiLFxuICBXOiBcIiBncmVlblwiLFxuICBYOiBcIiAjZmZmXCIsXG4gIFk6IFwiIGdyZWVuXCIsXG4gIFo6IFwiICNmZmZcIixcbiAgR2FwOiBcIiAjZmZmXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIgIzc3ZGQ4OFwiLFxuICBCOiBcIiAjZmZmXCIsXG4gIEM6IFwiICM5OWVlNjZcIixcbiAgRDogXCIgIzU1YmIzM1wiLFxuICBFOiBcIiAjNTViYjMzXCIsXG4gIEY6IFwiICM5OTk5ZmZcIixcbiAgRzogXCIgIzc3ZGQ4OFwiLFxuICBIOiBcIiAjNTU1NWZmXCIsXG4gIEk6IFwiICM2NmJiZmZcIixcbiAgSjogXCIgI2ZmZlwiLFxuICBLOiBcIiAjZmZjYzc3XCIsXG4gIEw6IFwiICM2NmJiZmZcIixcbiAgTTogXCIgIzY2YmJmZlwiLFxuICBOOiBcIiAjNTViYjMzXCIsXG4gIE86IFwiICNmZmZcIixcbiAgUDogXCIgI2VlYWFhYVwiLFxuICBROiBcIiAjNTViYjMzXCIsXG4gIFI6IFwiICNmZmNjNzdcIixcbiAgUzogXCIgI2ZmNDQ1NVwiLFxuICBUOiBcIiAjZmY0NDU1XCIsXG4gIFU6IFwiICNmZmZcIixcbiAgVjogXCIgIzY2YmJmZlwiLFxuICBXOiBcIiAjOTk5OWZmXCIsXG4gIFg6IFwiICNmZmZcIixcbiAgWTogXCIgIzk5OTlmZlwiLFxuICBaOiBcIiAjZmZmXCIsXG4gIEdhcDogXCIgI2ZmZlwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiICM2NEY3M0ZcIixcbiAgQzogXCIgI0ZGQjM0MFwiLFxuICBHOiBcIiAjRUI0MTNDXCIsXG4gIFQ6IFwiICMzQzg4RUVcIixcbiAgVTogXCIgIzNDODhFRVwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiICNGRjgzRkFcIixcbiAgQzogXCIgIzQwRTBEMFwiLFxuICBHOiBcIiAjRkY4M0ZBXCIsXG4gIFI6IFwiICNGRjgzRkFcIixcbiAgVDogXCIgIzQwRTBEMFwiLFxuICBVOiBcIiAjNDBFMEQwXCIsXG4gIFk6IFwiICM0MEUwRDBcIlxufTtcbiIsInZhciBCdXJpZWQgPSByZXF1aXJlKFwiLi9idXJpZWRcIik7XG52YXIgQ2luZW1hID0gcmVxdWlyZShcIi4vY2luZW1hXCIpO1xudmFyIENsdXN0YWwgPSByZXF1aXJlKFwiLi9jbHVzdGFsXCIpO1xudmFyIENsdXN0YWwyID0gcmVxdWlyZShcIi4vY2x1c3RhbDJcIik7XG52YXIgSGVsaXggPSByZXF1aXJlKFwiLi9oZWxpeFwiKTtcbnZhciBIeWRybyA9IHJlcXVpcmUoXCIuL2h5ZHJvcGhvYmljaXR5XCIpO1xudmFyIExlc2sgPSByZXF1aXJlKFwiLi9sZXNrXCIpO1xudmFyIE1hZSA9IHJlcXVpcmUoXCIuL21hZVwiKTtcbnZhciBOdWNsZW90aWRlID0gcmVxdWlyZShcIi4vbnVjbGVvdGlkZVwiKTtcbnZhciBQdXJpbmUgPSByZXF1aXJlKFwiLi9wdXJpbmVcIik7XG52YXIgU3RyYW5kID0gcmVxdWlyZShcIi4vc3RyYW5kXCIpO1xudmFyIFRheWxvciA9IHJlcXVpcmUoXCIuL3RheWxvclwiKTtcbnZhciBUdXJuID0gcmVxdWlyZShcIi4vdHVyblwiKTtcbnZhciBaYXBwbyA9IHJlcXVpcmUoXCIuL3phcHBvXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9ycyA9IHtcbiAgbWFwcGluZzoge1xuICAgIGJ1cmllZDogQnVyaWVkLFxuICAgIGJ1cmllZF9pbmRleDogQnVyaWVkLFxuICAgIGNpbmVtYTogQ2luZW1hLFxuICAgIGNsdXN0YWwyOiBDbHVzdGFsMixcbiAgICBjbHVzdGFsOiBDbHVzdGFsLFxuICAgIGhlbGl4OiBIZWxpeCxcbiAgICBoZWxpeF9wcm9wZW5zaXR5OiBIZWxpeCxcbiAgICBoeWRybzogSHlkcm8sXG4gICAgbGVzazogTGVzayxcbiAgICBtYWU6IE1hZSxcbiAgICBudWNsZW90aWRlOiBOdWNsZW90aWRlLFxuICAgIHB1cmluZTogUHVyaW5lLFxuICAgIHB1cmluZV9weXJpbWlkaW5lOiBQdXJpbmUsXG4gICAgc3RyYW5kOiBTdHJhbmQsXG4gICAgc3RyYW5kX3Byb3BlbnNpdHk6IFN0cmFuZCxcbiAgICB0YXlsb3I6IFRheWxvcixcbiAgICB0dXJuOiBUdXJuLFxuICAgIHR1cm5fcHJvcGVuc2l0eTogVHVybixcbiAgICB6YXBwbzogWmFwcG8sXG4gIH0sXG4gIGdldENvbG9yOiBmdW5jdGlvbihzY2hlbWUpIHtcbiAgICB2YXIgY29sb3IgPSBDb2xvcnMubWFwcGluZ1tzY2hlbWVdO1xuICAgIGlmIChjb2xvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb2xvciA9IHt9O1xuICAgIH1cbiAgICByZXR1cm4gY29sb3I7XG4gIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjNTg1OGE3XCIsXG4gIFI6IFwiIzZiNmI5NFwiLFxuICBOOiBcIiM2NDY0OWJcIixcbiAgRDogXCIjMjEyMWRlXCIsXG4gIEM6IFwiIzlkOWQ2MlwiLFxuICBROiBcIiM4YzhjNzNcIixcbiAgRTogXCIjMDAwMGZmXCIsXG4gIEc6IFwiIzQ5NDliNlwiLFxuICBIOiBcIiM2MDYwOWZcIixcbiAgSTogXCIjZWNlYzEzXCIsXG4gIEw6IFwiI2IyYjI0ZFwiLFxuICBLOiBcIiM0NzQ3YjhcIixcbiAgTTogXCIjODI4MjdkXCIsXG4gIEY6IFwiI2MyYzIzZFwiLFxuICBQOiBcIiMyMzIzZGNcIixcbiAgUzogXCIjNDk0OWI2XCIsXG4gIFQ6IFwiIzlkOWQ2MlwiLFxuICBXOiBcIiNjMGMwM2ZcIixcbiAgWTogXCIjZDNkMzJjXCIsXG4gIFY6IFwiI2ZmZmYwMFwiLFxuICBCOiBcIiM0MzQzYmNcIixcbiAgWDogXCIjNzk3OTg2XCIsXG4gIFo6IFwiIzQ3NDdiOFwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiI2NjZmYwMFwiLFxuICBSOiBcIiMwMDAwZmZcIixcbiAgTjogXCIjY2MwMGZmXCIsXG4gIEQ6IFwiI2ZmMDAwMFwiLFxuICBDOiBcIiNmZmZmMDBcIixcbiAgUTogXCIjZmYwMGNjXCIsXG4gIEU6IFwiI2ZmMDA2NlwiLFxuICBHOiBcIiNmZjk5MDBcIixcbiAgSDogXCIjMDA2NmZmXCIsXG4gIEk6IFwiIzY2ZmYwMFwiLFxuICBMOiBcIiMzM2ZmMDBcIixcbiAgSzogXCIjNjYwMGZmXCIsXG4gIE06IFwiIzAwZmYwMFwiLFxuICBGOiBcIiMwMGZmNjZcIixcbiAgUDogXCIjZmZjYzAwXCIsXG4gIFM6IFwiI2ZmMzMwMFwiLFxuICBUOiBcIiNmZjY2MDBcIixcbiAgVzogXCIjMDBjY2ZmXCIsXG4gIFk6IFwiIzAwZmZjY1wiLFxuICBWOiBcIiM5OWZmMDBcIixcbiAgQjogXCIjZmZmXCIsXG4gIFg6IFwiI2ZmZlwiLFxuICBaOiBcIiNmZmZcIlxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBOiBcIiMyY2QzZDNcIixcbiAgUjogXCIjNzA4ZjhmXCIsXG4gIE46IFwiI2ZmMDAwMFwiLFxuICBEOiBcIiNlODE3MTdcIixcbiAgQzogXCIjYTg1NzU3XCIsXG4gIFE6IFwiIzNmYzBjMFwiLFxuICBFOiBcIiM3Nzg4ODhcIixcbiAgRzogXCIjZmYwMDAwXCIsXG4gIEg6IFwiIzcwOGY4ZlwiLFxuICBJOiBcIiMwMGZmZmZcIixcbiAgTDogXCIjMWNlM2UzXCIsXG4gIEs6IFwiIzdlODE4MVwiLFxuICBNOiBcIiMxZWUxZTFcIixcbiAgRjogXCIjMWVlMWUxXCIsXG4gIFA6IFwiI2Y2MDkwOVwiLFxuICBTOiBcIiNlMTFlMWVcIixcbiAgVDogXCIjNzM4YzhjXCIsXG4gIFc6IFwiIzczOGM4Y1wiLFxuICBZOiBcIiM5ZDYyNjJcIixcbiAgVjogXCIjMDdmOGY4XCIsXG4gIEI6IFwiI2YzMGMwY1wiLFxuICBYOiBcIiM3YzgzODNcIixcbiAgWjogXCIjNWJhNGE0XCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjZmZhZmFmXCIsXG4gIFI6IFwiIzY0NjRmZlwiLFxuICBOOiBcIiMwMGZmMDBcIixcbiAgRDogXCIjZmYwMDAwXCIsXG4gIEM6IFwiI2ZmZmYwMFwiLFxuICBROiBcIiMwMGZmMDBcIixcbiAgRTogXCIjZmYwMDAwXCIsXG4gIEc6IFwiI2ZmMDBmZlwiLFxuICBIOiBcIiM2NDY0ZmZcIixcbiAgSTogXCIjZmZhZmFmXCIsXG4gIEw6IFwiI2ZmYWZhZlwiLFxuICBLOiBcIiM2NDY0ZmZcIixcbiAgTTogXCIjZmZhZmFmXCIsXG4gIEY6IFwiI2ZmYzgwMFwiLFxuICBQOiBcIiNmZjAwZmZcIixcbiAgUzogXCIjMDBmZjAwXCIsXG4gIFQ6IFwiIzAwZmYwMFwiLFxuICBXOiBcIiNmZmM4MDBcIixcbiAgWTogXCIjZmZjODAwXCIsXG4gIFY6IFwiI2ZmYWZhZlwiLFxuICBCOiBcIiNmZmZcIixcbiAgWDogXCIjZmZmXCIsXG4gIFo6IFwiI2ZmZlwiXG59O1xuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHQndXNlIHN0cmljdCc7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9IGVsc2UgaWYgKCh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB8fCB0YXJnZXQgPT0gbnVsbCkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbaV07XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmIChvcHRpb25zICE9IG51bGwpIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAobmFtZSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFtuYW1lXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbbmFtZV07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAodGFyZ2V0ID09PSBjb3B5KSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKGRlZXAgJiYgY29weSAmJiAoaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvcHkpKSkpIHtcblx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gZXh0ZW5kKGRlZXAsIGNsb25lLCBjb3B5KTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29weSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iLCJ2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpXG4sIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpXG47XG5cbmZ1bmN0aW9uIG1pbihhcnIpIHtcbiAgICByZXR1cm4gTWF0aC5taW4uYXBwbHkoTWF0aCwgYXJyKTtcbn1cblxuZnVuY3Rpb24gbWF4KGFycikge1xuICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBhcnIpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVMaW5lQ2FjaGUgKCkge1xuICAgIHZhciBsYyA9IFtdLCBpZHggPSBbXSwgbGVuID0gTVNBLm51bUNhY2hlZExpbmVzO1xuXG4gICAgdmFyIHRvID0gbnVsbDtcbiAgICBmdW5jdGlvbiB0cmltKGRpcikge1xuICAgICAgICB2YXIgYSwgYjtcbiAgICAgICAgd2hpbGUgKCAoYT1tYXgoaWR4KSkgLSAoYj1taW4oaWR4KSkgPiBsZW4pIHtcbiAgICAgICAgICAgIGkgPSBkaXIgPyBiIDogYTtcbiAgICAgICAgICAgIGRlbGV0ZSBsY1tpXTtcbiAgICAgICAgICAgIGlkeC5zcGxpY2UoaWR4LmluZGV4T2YoaSksIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbGMuc2V0ID0gZnVuY3Rpb24gKGksIHZhbCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodG8pO1xuICAgICAgICB2YXIgZGlyID0gaSA+IG1heChpZHgpID8gMSA6IDA7XG4gICAgICAgIHRoaXNbaV0gPSB2YWw7XG4gICAgICAgIGlkeC5wdXNoKGkpO1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgICAgIHRvID0gc2V0VGltZW91dCh0cmltLmJpbmQobnVsbCwgZGlyKSwgMzAwKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobGMsIHtcbiAgICAgICAgJ2xhc3REZWZpbmVkSW5kZXgnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtyZXR1cm4gbWF4KGlkeCk7fVxuICAgICAgICB9LCAnZmlyc3REZWZpbmVkSW5kZXgnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtyZXR1cm4gbWluKGlkeCk7fVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbGM7XG59XG5cblxuZnVuY3Rpb24gTVNBKHNyYykge1xuICAgIHRoaXMuc3JjID0gbnVsbDtcbiAgICB0aGlzLmhyZWYgPSBudWxsO1xuICAgIHRoaXMuc2l6ZVByb21pc2UgPSBudWxsO1xuICAgIHRoaXMubGluZUNhY2hlID0gY3JlYXRlTGluZUNhY2hlKCk7XG4gICAgdGhpcy5saW5lUHJvbWlzZXMgPSBbXTtcbiAgICB0aGlzLkxPQ0sgPSBmYWxzZTtcblxuICAgIGlmICghKC9odHRwLy50ZXN0KHNyYykpKSB7XG4gICAgICAgIHRoaXMuc3JjID0gc3JjO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaHJlZiA9IHNyYztcbiAgICB9XG59XG5cblxuLyoqIEBwcm9wIHtpbnR9IHNldCB0aGUgbnVtYmVyIG9mIGxpbmVzIHRoYXQgc2hvdWxkIGJlIGNhY2hlZCBhdCBtb3N0ICovXG5NU0EubnVtQ2FjaGVkTGluZXMgPSAzMDAwO1xuXG4vKiogQHByb3Age2ludH0gc2V0IHRoZSBudW1iZXIgb2YgbGluZXMgdG8gZmV0Y2ggZWFnZXJseSAqL1xuTVNBLm51bVByZWZldGNoTGluZXMgPSAxMDAwO1xuXG4vKiogQHByb3Age2Zsb2F0fSBmcmFjdGlvbiBhdCB3aGljaCB0byB0cmlnZ2VyIHByZWZldGNoICovXG5NU0EubnVtUHJlZmV0Y2hUcmlnZ2VyID0gMC41O1xuXG5cbi8qKlxuICogRmV0Y2ggYW5kIGNhbGN1bGF0ZSBkaWZmZXJlbnQgYXNwZWN0cyBvZiB0aGUgTVNBLlxuICogUmV0dXJucyB0aGUgcHJvbWlzZSBvZiBhbiBvYmplY3Q6XG4gKiAgIHtcbiAqICAgICB7aW50fSBzaXplICAgICAgIFRoZSBieXRlc2l6ZSBvZiB0aGUgd2hvbGUgTVNBIGZpbGVcbiAqICAgICB7aW50fSB3aWR0aCAgICAgIFRoZSB3aWRodCBvZiB0aGUgTVNBLCBpLmUuIHRoZSBsaW5lIGxlbmd0aFxuICogICAgICAgICAgICAgICAgICAgICAgb2YgdGhvc2UgbGluZXMgYWN0dWFsbHkgY29udGFpbmluZyBzZXF1ZW5jZXNcbiAqICAgICB7aW50fSBvZmZzZXQgICAgIFRoZSBieXRlIG9mZnNldCB0byB0aGUgZmlyc3Qgc2VxdWVuY2VcbiAqICAgICB7aW50fSBjb3VudCAgICAgIFRoZSBudW1iZXIgb2Ygc2VxdWVuY2VzIGluIHRoZSBNU0FcbiAqICAgICB7aW50fSBsYWJlbFdpZHRoIFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyByZXNlcnZlZCBmb3IgbGFiZWxzXG4gKiAgICAgICAgICAgICAgICAgICAgICBpbiBmcm9udCBvZiB0aGUgc2VxdWVuY2VzXG4gKiAgIH1cbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5cbk1TQS5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBsaW5lQ2FjaGUgPSB0aGlzLmxpbmVDYWNoZTtcblxuICAgIC8vIFJldHVybiB0aGUgcHJvbWlzZSBpZiB0aGUgcXVlcnMgaGFzIGJlZW5cbiAgICAvLyBwZXJmb3JtZWQgYmVmb3JlXG4gICAgaWYgKHRoaXMuc2l6ZVByb21pc2UpXG4gICAgICAgIHJldHVybiB0aGlzLnNpemVQcm9taXNlO1xuXG5cbiAgICAvLyBHZXQgdGhlIGhlYWRlcnMgZm9yIHRoZSBmaWxlIHRvIGZpbmQgb3V0IHRoZSB0b3RhbFxuICAgIC8vIGZpbGUgc2l6ZVxuICAgIHZhciBoZWFkUCA9IHJlcXVlc3QodGhpcy5ocmVmLCB7bWV0aG9kOiAnSEVBRCd9KVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVxKXtcbiAgICAgICAgICAgIHJldHVybiB7c2l6ZTogcGFyc2VJbnQocmVxLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LUxlbmd0aCcpKX07XG4gICAgICAgIH0pO1xuXG4gICAgLy8gZ2V0IHRoZSBmaXJzdCAxMCBrYiB0byBmaW5kIG91dCB0aGUgbGluZSB3aWR0aCwgbGFiZWwgd2lkdGhcbiAgICAvLyBhbmQgYnl0ZSBvZmZzZXQgdG8gdGhlIGZpcnN0IHNlcXVlbmNlXG4gICAgdmFyIHN0YXJ0UCA9IHJlcXVlc3QodGhpcy5ocmVmLCB7aGVhZGVyczoge3JhbmdlOiAnYnl0ZXM9MC0xMDI0MCd9fSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICAgICAgdmFyIGkgPSAwLCBsaW5lV2lkdGgsIGxhYmVsV2lkdGgsIGxpbmVzID0gcmVxLnJlc3BvbnNlLnNwbGl0KCdcXG4nKVxuICAgICAgICAgICAgLCBsT2Zmc2V0ID0gMSwgb2Zmc2V0ID0gbGluZXNbMF0ubGVuZ3RoICsgMSwgc2VxO1xuXG4gICAgICAgICAgICAvLyB3YWxrIGRvd24gdGhlIGZpbGUsIGZvciBlYWNoICdlbXB0eSdcbiAgICAgICAgICAgIC8vIGxpbmUgYWRkIG9uZSB0byB0aGUgb2Zmc2V0LCBiZWNhdXNlIG9mIHRoZSBcXG5cbiAgICAgICAgICAgIC8vIHJlbW92ZWQgZHVyaW5nIHRoZSBzcGxpdCgnXFxuJylcbiAgICAgICAgICAgIHdoaWxlICghbGluZXNbKytpXS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQrKztcbiAgICAgICAgICAgICAgICBsT2Zmc2V0Kys7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGkgaXMgbm93IHRoZSBmaXJzdCBsaW5lIHdpdGggYW4gYWN0dWFsIHNlcXVlbmNlXG4gICAgICAgICAgICAvLyBhZGQgb25lIGJlY2F1c2Ugb2YgdGhlIFxcbiB3ZSBsb3N0IGluIHRoZSBzcGxpdFxuICAgICAgICAgICAgbGluZVdpZHRoID0gbGluZXNbaV0ubGVuZ3RoICsgMTtcbiAgICAgICAgICAgIGxhYmVsV2lkdGggPSBsaW5lc1tpXS5tYXRjaCgvLiogKy8pWzBdLmxlbmd0aDtcblxuICAgICAgICAgICAgLy8gbm93IHB1c2ggdGhlIHJlc3Qgb2YgdGhlIGxpbmVzIG9udG8gdGhlIGNhY2hlXG4gICAgICAgICAgICAvLyBpZiB0aGV5IGFyZSB3aG9sZVxuICAgICAgICAgICAgd2hpbGUgKChsaW5lc1tpXS5sZW5ndGggKyAxKSA9PT0gbGluZVdpZHRoKSB7XG4gICAgICAgICAgICAgICAgIHNlcSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IGxpbmVzW2ldLnN1YnN0cigwLCBsYWJlbFdpZHRoKVxuICAgICAgICAgICAgICAgICAgICAsIHNlcXVlbmNlOiBsaW5lc1tpXS5zdWJzdHIobGFiZWxXaWR0aClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGxpbmVDYWNoZS5zZXQoaS1sT2Zmc2V0LCBzZXEpO1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBsYWJlbFdpZHRoOiBsYWJlbFdpZHRoXG4gICAgICAgICAgICAgICAgLCBsaW5lV2lkdGg6IGxpbmVXaWR0aFxuICAgICAgICAgICAgICAgICwgc2VxdWVuY2VXaWR0aDogbGluZVdpZHRoIC0gbGFiZWxXaWR0aFxuICAgICAgICAgICAgICAgICwgb2Zmc2V0OiBvZmZzZXRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAvLyBnZXQgbGFzdCAxMGtiIHRvIGdldCB0aGUgYWxpZ25tZW50IGZyb20gdGhlIGxhc3QgbGluZVxuICAgIHZhciBlbmRQID0gcmVxdWVzdCh0aGlzLmhyZWYsIHtoZWFkZXJzOiB7cmFuZ2U6ICdieXRlcz0tMTAyNDAnfX0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgICAgIHZhciBsaW5lcyA9IHJlcS5yZXNwb25zZS5zcGxpdCgnXFxuJylcbiAgICAgICAgICAgICwgYWxuID0gbGluZXMuc2xpY2UoLTIpWzBdXG4gICAgICAgICAgICA7XG5cbiAgICAgICAgICAgIHJldHVybiB7YWxpZ25tZW50OiBhbG59O1xuICAgICAgICB9KTtcblxuICAgIC8vIGFuZCBjb3VudCB0aGUgbnVtYmVyIG9mIHNlcXVlbmNlc1xuICAgIHRoaXMuc2l6ZVByb21pc2UgPSBQcm9taXNlLmFsbChbaGVhZFAsIHN0YXJ0UCwgZW5kUF0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9wcykge1xuICAgICAgICAgICAgLy8gbWVyZ2UgZXZlcnl0aGluZyBpbnRvIG9uZSBvYmplY3RcbiAgICAgICAgICAgIHByb3BzID0gZXh0ZW5kKHt9LCBwcm9wc1swXSwgcHJvcHNbMV0sIHByb3BzWzJdKTtcblxuICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHNlcXVlbmNlIGNvdW50IGFuZCB3aWR0aFxuICAgICAgICAgICAgcHJvcHMuc2VxdWVuY2VDb3VudCA9IChwcm9wcy5zaXplIC0gcHJvcHMub2Zmc2V0KSAvIHByb3BzLmxpbmVXaWR0aCAtIDI7XG5cbiAgICAgICAgICAgIHJldHVybiBwcm9wcztcbiAgICAgICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcy5zaXplUHJvbWlzZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgUHJvbWlzZSBvZiBhIHN0cmluZyBjb250YWluaW5nXG4gKiB0aGUgYWN0dWFsIGFsaWdubWVudCBpbmZvcm1hdGlvblxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cblxuTVNBLnByb3RvdHlwZS5nZXRBbGlnbm1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U2l6ZSgpLnRoZW4oZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICAgIHJldHVybiBwcm9wcy5hbGlnbm1lbnQ7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIFByb21pc2Ugb2YgYW4gaW50ZWdlciBjb250YWluaW5nXG4gKiB0aGUgc2VxdWVuY2UgY291bnRcbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5cbk1TQS5wcm90b3R5cGUuZ2V0Q291bnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U2l6ZSgpLnRoZW4oZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICAgIHJldHVybiBwcm9wcy5zZXF1ZW5jZUNvdW50O1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIFByb21pc2Ugb2YgYSBzaW5nbGUgc2VxdWVuY2Ugb2JqZWN0XG4gKiBjb250YWluaW5nXG4gKiB7XG4gKiAgIHtzdHJpbmd9IGxhYmVsXG4gKiAgIHtzdHJpbmd9IHNlcXVlbmNlXG4gKiB9XG4gKlxuICogQHBhcmFtIHtpbnR9IGwgbGluZSB0byBnZXQsIDAtaW5kZXhlZFxuICogQHJldHVybiB7UHJvbWlzZX1cbiAqL1xuXG5NU0EucHJvdG90eXBlLmdldExpbmUgPSBmdW5jdGlvbiAobCkge1xuICAgIHZhciB4O1xuXG4gICAgaWYgKCh4ID0gdGhpcy5saW5lQ2FjaGVbbF0pKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoeCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0TGluZXMobCwgbCwgdHJ1ZSkudGhlbihmdW5jdGlvbiAobGluZXMpIHtyZXR1cm4gbGluZXNbMF07fSk7XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgUHJvbWlzZSBvZiBhbiBhcnJheSBvZiBzZXF1ZW5jZSBvYmplY3RzXG4gKiBjb250YWluaW5nXG4gKiB7XG4gKiAgIHtzdHJpbmd9IGxhYmVsXG4gKiAgIHtzdHJpbmd9IHNlcXVlbmNlXG4gKiB9XG4gKlxuICogQHBhcmFtIHtpbnR9IGEgICAgICAgICAgICAgIGZpcnN0IGxpbmUgdG8gZ2V0LCAwLWluZGV4ZWRcbiAqIEBwYXJhbSB7aW50fSBbYl0gICAgICAgICAgICBsYXN0IGxpbmUgdG8gZ2V0LCBkZWZhdWx0cyB0byBhXG4gKiBAcGFyYW0ge2Jvb2x9IGRvTm90UHJlZmV0Y2ggZmxhZyB0byBzdXByZXNzIHByZWZldGNoXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5cbk1TQS5wcm90b3R5cGUuZ2V0TGluZXMgPSBmdW5jdGlvbiAoYSwgYiwgZG9Ob3RQcmVmZXRjaCkge1xuICAgIGIgPSBiIHx8IGE7XG5cbiAgICB2YXIgbGluZUNhY2hlID0gdGhpcy5saW5lQ2FjaGVcbiAgICAsIGxpbmVQcm9taXNlcyA9IHRoaXMubGluZVByb21pc2VzXG4gICAgLCBocmVmID0gdGhpcy5ocmVmXG4gICAgO1xuXG4gICAgcmV0dXJuIHRoaXMuZ2V0U2l6ZSgpLnRoZW4oZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICAgIHZhciBsYWJlbFdpZHRoID0gcHJvcHMubGFiZWxXaWR0aFxuICAgICAgICAsIGxpbmVXaWR0aCA9IHByb3BzLmxpbmVXaWR0aFxuICAgICAgICAsIGNvdW50ID0gcHJvcHMuc2VxdWVuY2VDb3VudFxuICAgICAgICAsIG9mZnNldCA9IHByb3BzLm9mZnNldFxuICAgICAgICAsIHJlcyA9IFtdLCBmZXRjaCA9IFtdLCB3YWl0ID0gW11cbiAgICAgICAgLCByYW5nZSwgeCwgaSwgcCwgYywgZCwgZSwgZlxuICAgICAgICA7XG5cblxuICAgICAgICBpZiAoYSA+IGNvdW50KSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGIgPiBjb3VudCkge1xuICAgICAgICAgICAgYiA9IGNvdW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZ2V0IGxpbmVzIGZyb20gQ2FjaGUgaWYgYXZhaWxhYmxlXG4gICAgICAgIGZvciAoaSA9IGE7IGkgPD0gYjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoKHggPSBsaW5lQ2FjaGVbaV0pKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goeCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCh4ID0gbGluZVByb21pc2VzW2ldKSkge1xuICAgICAgICAgICAgICAgIGlmICh3YWl0LmluZGV4T2YoeCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHdhaXQucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZldGNoLnB1c2goaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0cmlnZ2VyIGVhZ2VyIHByZWZldGNoXG4gICAgICAgIGlmICghZG9Ob3RQcmVmZXRjaCAmJiAhdGhpcy5MT0NLKSB7XG4gICAgICAgICAgICBlID0gbGluZUNhY2hlLmxhc3REZWZpbmVkSW5kZXggLSAoTVNBLm51bVByZWZldGNoTGluZXMgKiBNU0EubnVtUHJlZmV0Y2hUcmlnZ2VyKTtcbiAgICAgICAgICAgIGYgPSBsaW5lQ2FjaGUuZmlyc3REZWZpbmVkSW5kZXggKyAoTVNBLm51bVByZWZldGNoTGluZXMgKiBNU0EubnVtUHJlZmV0Y2hUcmlnZ2VyKTtcblxuICAgICAgICAgICAgaWYgKGIgPiBlICYmIGxpbmVDYWNoZS5sYXN0RGVmaW5lZEluZGV4IDwgY291bnQpIHtcbiAgICAgICAgICAgICAgICAvLyBwcmVmZXRjaCBmb3J3YXJkXG4gICAgICAgICAgICAgICAgZSA9IGxpbmVDYWNoZS5sYXN0RGVmaW5lZEluZGV4O1xuICAgICAgICAgICAgICAgIGYgPSBtaW4oW2UgKyBNU0EubnVtUHJlZmV0Y2hMaW5lcywgY291bnRdKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYSA8IGYgJiYgbGluZUNhY2hlLmZpcnN0RGVmaW5lZEluZGV4ID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIHByZWZldGNoIGJhY2t3YXJkXG4gICAgICAgICAgICAgICAgZiA9IGxpbmVDYWNoZS5maXJzdERlZmluZWRJbmRleDtcbiAgICAgICAgICAgICAgICBlID0gbWF4KFtmIC0gTVNBLm51bVByZWZldGNoTGluZXMsIDBdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZSA9IGYgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuTE9DSyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5nZXRMaW5lcyhlLCBmLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5MT0NLID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB3ZSBkbyBub3QgbmVlZCB0byBmZXRjaCBtb3JlIGxpbmVzXG4gICAgICAgIC8vIGZyb20gdGhlIHJlbW90ZSBzb3VyY2UsIHJldHVybiB0aGVcbiAgICAgICAgLy8gcmVzdWx0cyBub3dcbiAgICAgICAgaWYgKGZldGNoLmxlbmd0aCA9PT0gMCAmJiB3YWl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZldGNoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIGNvbnN0cnVjdCByYW5nZSByZXF1ZXN0XG4gICAgICAgICAgICBjID0gbWluKGZldGNoKTsgZCA9IG1heChmZXRjaCk7XG5cbiAgICAgICAgICAgIHJhbmdlID0gW1xuICAgICAgICAgICAgICAgIG9mZnNldCArIGMgKiBsaW5lV2lkdGhcbiAgICAgICAgICAgICAgICAsIG9mZnNldCArIChkKzEpICogbGluZVdpZHRoIC0gMlxuICAgICAgICAgICAgXS5qb2luKCctJyk7XG5cbiAgICAgICAgICAgIHAgPSByZXF1ZXN0KGhyZWYsIHtoZWFkZXJzOiB7cmFuZ2U6ICdieXRlcz0nICsgcmFuZ2V9fSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHB1dCBhbGwgdGhlIGZldGNoZXMgbGluZXMgb250byB0aGUgbGluZWNhY2hlXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZCBwdXNoIHRoZW0gdG8gdGhlIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgIHJlcS5yZXNwb25zZS5zcGxpdCgnXFxuJykuZm9yRWFjaChmdW5jdGlvbiAobCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlcSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogbC5zdWJzdHIoMCwgbGFiZWxXaWR0aClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAsIHNlcXVlbmNlOiBsLnN1YnN0cihsYWJlbFdpZHRoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVDYWNoZS5zZXQoYytpLCBzZXEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGxpbmVQcm9taXNlc1tjK2ldO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdhaXQucHVzaChwKTtcbiAgICAgICAgICAgIGZvciAoaT1jO2kgPD1kOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsaW5lUHJvbWlzZXNbaV0gPSBwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHdhaXQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbGluZUNhY2hlLnNsaWNlKGEsIGIrMSk7XG4gICAgICAgIH0pO1xuICAgIH0uYmluZCh0aGlzKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1TQTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcmVxdWVzdCh1cmwsIG9wdCkge1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICByZXEub3BlbihvcHQubWV0aG9kIHx8ICdHRVQnLCB1cmwsIHRydWUpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKG9wdC5oZWFkZXJzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcihrLCBvcHQuaGVhZGVyc1trXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVxLnN0YXR1cyA+PSA0MDAgPyByZWplY3QocmVxKSA6IHJlc29sdmUocmVxKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXEuc2VuZChvcHQuZGF0YSB8fCB2b2lkIDApO1xuICAgIH0pO1xufTtcbiJdfQ==
