(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./src/index.js":[function(require,module,exports){
var request = require('./request')
, MSA = require('./MSASource')
, extend = require('extend')
, colorSchemeSelector = require('biojs-util-colorschemes').selector
;

var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
var isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
    // At least Safari 3+: "[object HTMLElementConstructor]"
var isChrome = !!window.chrome && !isOpera;              // Chrome 1+
var isIE = /*@cc_on!@*/false || !!document.documentMode; // At least IE6

/**
 * Helpers
 */

var floor = Math.floor.bind(Math);
var ceil = Math.ceil.bind(Math);

function minmaxval(min, max, val) {
    if (typeof min !== 'undefined' && val < min) return min |0;
    if (typeof max !== 'undefined' && val > max) return max |0;
    return val |0;
}

function normalizeWheelSpeed(event) {
    var raw, normalized = {x: 0, y: 0};
    if (event.wheelDelta) {
        normalized.x = (event.wheelDeltaX % 120 - 0) == -0
            ? event.wheelDeltaX / 120
            : event.wheelDeltaX / 12;
        normalized.y = (event.wheelDeltaY % 120 - 0) == -0
            ? event.wheelDeltaY / 120
            : event.wheelDeltaY / 12;
    } else {
        raw = event.deltaY ? event.deltaY : event.detail;
        normalized.y = -(raw % 3 ? raw * 10 : raw / 3);
        raw = event.deltaX ? event.deltaX : event.detail;
        normalized.x = -(raw % 3 ? raw * 10 : raw / 3);
    }

    return normalized;
}

/**
 * Create MutliSequenceAlignment Viewer
 * Options include
 *     font: {string} like '12px monospace'
 *     lineHeight: {number}
 *     labelWidth: {number}
 *     leftMargin: {number}
 *     letterSpacing: {number}
 *     cursorColor: {string} like 'rgba(128, 128, 128, 0.2)'
 *     loadingText: {string}
 *     colorScheme: {string} provided by biojs-util-colorschemes
 *
 * @constructor
 * @param {object} root
 * @param {object} opt
 */

function MSAView (root, opt) {

    // include default opt and opt from DOM dataset
    opt = extend({}, MSAView.defaultOptions, root.dataset, opt);

    root.msaview = this;

    // create stage
    var cvs = document.createElement('canvas');

    root.appendChild(cvs);

    var colorScheme = colorSchemeSelector.getColor(opt.colorScheme);
    var scroll = {x: 0|0, y: 0|0, maxX: 0|0, maxY: 0|0};
    var aln = new MSA(root.dataset.alignment);
    var ctx = cvs.getContext('2d');
    var rect = null;
    var mouse = null;
    var LOCK = false;
    var drawAgain = false;
    var charWidth = null;
    var em = null;
    var lineHeight = opt.lineHeight;
    var letterSpacing = opt.letterSpacing;
    var labelWidth = opt.labelWidth;
    var leftMargin = opt.leftMargin;

    // apply options
    if ('bcnMsaFullscreen' in opt)
        root.style.width = root.style.height = '100%';

    // set cvs proportions
    cvs.width = root.offsetWidth;
    cvs.height = root.offsetHeight;

    var H = cvs.clientHeight;
    var W = cvs.clientWidth;

    // attach event handlers
    if ('onwheel' in cvs) {
        cvs.addEventListener('wheel', onScroll);
    } else if ('onmousewheel' in cvs) {
        cvs.addEventListener('mousewheel', onScroll);
    }

    cvs.addEventListener('mousemove', onPointerMove);
    cvs.addEventListener('mouseleave', onPointerOut);
    cvs.addEventListener('mousedown', onPointerDown);
    cvs.addEventListener('mouseup', onPointerUp);
    cvs.addEventListener('contextmenu', function (e) {e.preventDefault();});

    this.setFont = function (font) {
        var i;

        ctx.font = font;
        charWidth = (ctx.measureText('x').width + 1) |0;
        em = (charWidth + letterSpacing) |0;
        rect = cvs.getBoundingClientRect();
    };

    this.setFont(opt.font);

    var tracks = [];
    var view = {
        height: (floor(H / lineHeight) - 4) |0
        , seqOffset: (labelWidth + letterSpacing + leftMargin) |0
        , labelTruncate: ((labelWidth - leftMargin) / (charWidth-1)) |0
    };

    updateView();

    function updateView () {

        if (LOCK)
            return LOCK;

        if (!(view))
            return Promise.resolve();

        return (LOCK = Promise.all([
            aln.getLines(view.offsetY, view.offsetY + view.height)
            , aln.getSize()
        ]).then(function (res) {

            tracks = res[0];
            view.alignment = res[1].alignment;
            view.count = res[1].sequenceCount;
            view.sequenceWidth = res[1].sequenceWidth;

            scroll.maxX = floor(view.sequenceWidth * em)
                - W + opt.labelWidth + opt.leftMargin;
            scroll.maxY = (res[1].sequenceCount - view.height)
                * opt.lineHeight - H;

            view.lastOffsetY = view.offsetY;
            LOCK = false;

            setTimeout(draw, 10);
        }));
    }

    function onScroll (e) {

        if (LOCK)
            return;

        rect = cvs.getBoundingClientRect();
        dx = e.deltaX |0;
        dy = e.deltaY |0;

        if (isFirefox) {
            dx = dx * 10 |0;
            dy = dy * 10 |0;
            return console.log(e);
        }

        scroll.lastX = scroll.x;
        scroll.lastY = scroll.y;

        scroll.x = minmaxval(0, scroll.maxX, scroll.x + dx);
        scroll.y = minmaxval(0, scroll.maxY, scroll.y + dy);

        draw();
    }

    function onPointerOut () {
        mouse = null;
        draw();
    }

    function onPointerMove (e) {
        rect = cvs.getBoundingClientRect();
        mouse = {
            left: mouse && mouse.left
            , right: mouse && mouse.right
            , middle: mouse && mouse.middle
            , y: e.clientY - rect.top
            , x: e.clientX - rect.left
        };



        draw();
    }

    function onPointerDown (e) {
        if (!mouse) return;

        switch (e.which) {
        case 1: mouse.left = true; break;
        case 3: mouse.right = true; break;
        case 2: mouse.middle = true; break;
        }

        if (mouse.middle)
            scroll.pan = {x: mouse.x, y: mouse.y};

        if (mouse.left)
            view.mark = {sx: mouse.sx, sy: mouse.sy};

        draw();
    }

    function onPointerUp (e) {
        if (mouse.middle)
            scroll.pan = null;

        switch (e.which) {
            case 1: mouse.left = false; break;
            case 3: mouse.right = false; break;
            case 2: mouse.middle = false; break;
        }

        draw();
    }

    function draw () {
        return drawAgain ? null : requestAnimationFrame(_draw);
    }

    function _draw (t) {

        drawAgain = false;

        var x, y, dx, dy, i, j, k, l, m, n, len = tracks.length
        , h = mouse && (mouse.sx < view.offsetX) // is mouse over labels?
        , redrawLabels = true
        , redrawRuler = true
        ;

        // check mouse middle button scroll
        if (mouse && mouse.middle) {
            scroll.x = minmaxval(0, scroll.maxX, scroll.x
                                 + ((mouse.x - scroll.pan.x) / 10));
            scroll.y = minmaxval(0, scroll.maxY, scroll.y
                                 + ((mouse.y - scroll.pan.y) / 10));

            drawAgain = true;
        }

        view.offsetX = (scroll.x / em)         |0;
        view.offsetY = (scroll.y / lineHeight) |0;

        // get mouse coordinates relative to sequence and
        // aminoacid position
        if (mouse) {
            mouse.sx = (((mouse.x - view.seqOffset) / em) + view.offsetX) |0;
            mouse.sy = ((mouse.y / lineHeight) - 2 + view.offsetY)        |0;
        }


        // maybe we need to fetch new lines from the underlying source
        if (!LOCK && (view.offsetY !== view.lastOffsetY))
            updateView();

        // clear canvas, leave labels and ruler intact if possible
        x = 0;
        y = 0;
        if (scroll.lastY === scroll.y) {
            x = view.seqOffset;
            redrawLabels = false;
        }
        if (scroll.lastX === scroll.x) {
            y = lineHeight;
            redrawRuler = false;
        }

        ctx.clearRect(x, y, W, H);

        // loading text
        if (LOCK)
            ctx.fillText(opt.loadingText, leftMargin, lineHeight);

        // ruler
        if (redrawRuler) {
            x = view.seqOffset   |0; // start pos on x axis
            y = lineHeight * 2   |0; // write ruler on 2nd line
            i = view.offsetX + 1 |0; // offsetX are the positions hidden on the left
            // positions are 1-indexed, not 0-indexed, thus +1
            j = 0                |0; // state variable

            while (x < W) {
                if (j === 2) {
                    j = 1 |0;
                }

                if (j === 0) {
                    ctx.fillText(i, x, y);   // draw first number
                    j = 2 |0;                // jump at least 2 numbers after the first one
                    // thus avoiding the first number overlapping
                    // with the next
                } else {
                    if (i % 10 === 0) {
                        ctx.fillText(i+'', x, y); // draw every tenth number
                        j = 5 |0;                 // remember that we have found a base-5 number
                    }
                    else if (i % 5 === 0) {
                        ctx.fillText('.', x, y); // draw a dot for every fifth
                        j = 5 |0;                // remember that we have found a base-5 number
                    }
                }

                i = i + j      |0;       // advance the number
                x = x + j * em |0;       // advance our x-position
            }
        }

        // tracks
        if (len) {

            // colors
            x = view.seqOffset - em/4   |0; // color boxes have a em/4 offset to the left
            i = view.offsetX            |0; // start index

            while (x < W) {

                y = (lineHeight * 1.3)  |0; // start pos on y is 3rd line
                j = 0                   |0; // track index
                n = lineHeight          |0; // box height
                l = 0[0];                   // undefined last seen color

                while (j !== len) {

                    k = tracks[j] && tracks[j].sequence[i]; // amino acid
                    m = colorScheme[k];                     // new color

                    // if last seen and current color are the same,
                    // increase box height
                    if (m === l) {
                        n = (n + lineHeight) |0;
                    } else {
                        // draw box if color is set
                        if (l) {
                            ctx.fillStyle = l;
                            ctx.fillRect(x, y, em, n);
                        }

                        y = y + n      |0; // new y position
                        n = lineHeight |0; // reset box height
                    }

                    l = m;       // update last seen color
                    j = j + 1|0; // next sequence
                }

                // close last box
                if (l) {
                    ctx.fillStyle = l;
                    ctx.fillRect(x, y, em, n);
                }

                x = x + em |0; // next draw column
                i = i + 1  |0; // next sequence column
            }


            // sequences
            ctx.fillStyle = 'black'; // black characters
            y = lineHeight * 3   |0; // start pos on y is 3rd line
            i = 0                |0; // track index

            while ((k = tracks[i])) {

                // draw sequence
                x = view.seqOffset   |0; // start pos on x axis
                j = view.offsetX     |0; // aminoacid index

                while ((l = k.sequence[j]) && (x < W)) {

                    // write amino acid
                    ctx.fillText(l, x, y);

                    j = j + 1  |0; // advance aminoacid index
                    x = x + em |0; // advance one character
                }

                if (redrawLabels) {

                    // if mouse is over the label, draw full label, with a
                    // white background, else draw tuncated label
                    if (h && (mouse.sy === view.offsetY + i)) {

                        ctx.save();
                        ctx.fillStyle = 'rgb(255, 255, 255)';
                        ctx.fillRect(leftMargin, y - lineHeight + 2
                                     , W, lineHeight + 4);
                        ctx.restore();
                        ctx.fillText(k.label, leftMargin, y);
                    } else {
                        ctx.fillText(k.label.substr(0, view.labelTruncate), leftMargin, y);
                    }
                }

                i = i + 1          |0; // advance track index
                y = y + lineHeight |0; // advance one line
            }
        }
        return;
    }
}


MSAView.defaultOptions = {
    font: '12px monospace'
    , lineHeight: 14  |0  // px force Int32 arithmetic
    , labelWidth: 100 |0  // px
    , leftMargin: 20  |0  // px
    , letterSpacing: 8|0  // px between aminoacids
    , cursorColor: 'rgba(128, 128, 128, 0.2)'
    , loadingText: 'loading...'
    , colorScheme: 'clustal2'
};


if (typeof define === 'function' && define.amd) {
    // require.js module
    define(MSAView);
} else {
    // Browser globals
    window.MSAView = MSAView;
}

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


/** @prop {number} set the number of lines that should be cached at most */
MSA.numCachedLines = 3000;

/** @prop {number} set the number of lines to fetch eagerly */
MSA.numPrefetchLines = 1000;

/** @prop {number} fraction at which to trigger prefetch */
MSA.numPrefetchTrigger = 0.5;


/**
 * Fetch and calculate different aspects of the MSA.
 * Returns the promise of an object:
 *   {
 *     {number} size       The bytesize of the whole MSA file
 *     {number} width      The widht of the MSA, i.e. the line length
 *                      of those lines actually containing sequences
 *     {number} offset     The byte offset to the first sequence
 *     {number} count      The number of sequences in the MSA
 *     {number} labelWidth The number of characters reserved for labels
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
            return {size: parseInt(req.getResponseHeader('Content-Length'), 10)};
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
 * @param {number} l line to get, 0-indexed
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
 * @param {number} a              first line to get, 0-indexed
 * @param {number} [b]            last line to get, defaults to a
 * @param {boolean} [doNotPrefetch] flag to supress prefetch
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
        req.overrideMimeType('text/plain');

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

},{}]},{},["./src/index.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL2J1cmllZC5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvY2luZW1hLmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9jbHVzdGFsLmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9jbHVzdGFsMi5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvaGVsaXguanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL2h5ZHJvcGhvYmljaXR5LmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvbGVzay5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvbWFlLmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9udWNsZW90aWRlLmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9wdXJpbmUuanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL3NlbGVjdG9yLmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9zdHJhbmQuanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL3RheWxvci5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvdHVybi5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvemFwcG8uanMiLCJub2RlX21vZHVsZXMvZXh0ZW5kL2luZGV4LmpzIiwic3JjL01TQVNvdXJjZS5qcyIsInNyYy9yZXF1ZXN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpXG4sIE1TQSA9IHJlcXVpcmUoJy4vTVNBU291cmNlJylcbiwgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJylcbiwgY29sb3JTY2hlbWVTZWxlY3RvciA9IHJlcXVpcmUoJ2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzJykuc2VsZWN0b3JcbjtcblxudmFyIGlzT3BlcmEgPSAhIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMDtcbiAgICAvLyBPcGVyYSA4LjArIChVQSBkZXRlY3Rpb24gdG8gZGV0ZWN0IEJsaW5rL3Y4LXBvd2VyZWQgT3BlcmEpXG52YXIgaXNGaXJlZm94ID0gdHlwZW9mIEluc3RhbGxUcmlnZ2VyICE9PSAndW5kZWZpbmVkJzsgICAvLyBGaXJlZm94IDEuMCtcbnZhciBpc1NhZmFyaSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cuSFRNTEVsZW1lbnQpLmluZGV4T2YoJ0NvbnN0cnVjdG9yJykgPiAwO1xuICAgIC8vIEF0IGxlYXN0IFNhZmFyaSAzKzogXCJbb2JqZWN0IEhUTUxFbGVtZW50Q29uc3RydWN0b3JdXCJcbnZhciBpc0Nocm9tZSA9ICEhd2luZG93LmNocm9tZSAmJiAhaXNPcGVyYTsgICAgICAgICAgICAgIC8vIENocm9tZSAxK1xudmFyIGlzSUUgPSAvKkBjY19vbiFAKi9mYWxzZSB8fCAhIWRvY3VtZW50LmRvY3VtZW50TW9kZTsgLy8gQXQgbGVhc3QgSUU2XG5cbi8qKlxuICogSGVscGVyc1xuICovXG5cbnZhciBmbG9vciA9IE1hdGguZmxvb3IuYmluZChNYXRoKTtcbnZhciBjZWlsID0gTWF0aC5jZWlsLmJpbmQoTWF0aCk7XG5cbmZ1bmN0aW9uIG1pbm1heHZhbChtaW4sIG1heCwgdmFsKSB7XG4gICAgaWYgKHR5cGVvZiBtaW4gIT09ICd1bmRlZmluZWQnICYmIHZhbCA8IG1pbikgcmV0dXJuIG1pbiB8MDtcbiAgICBpZiAodHlwZW9mIG1heCAhPT0gJ3VuZGVmaW5lZCcgJiYgdmFsID4gbWF4KSByZXR1cm4gbWF4IHwwO1xuICAgIHJldHVybiB2YWwgfDA7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVdoZWVsU3BlZWQoZXZlbnQpIHtcbiAgICB2YXIgcmF3LCBub3JtYWxpemVkID0ge3g6IDAsIHk6IDB9O1xuICAgIGlmIChldmVudC53aGVlbERlbHRhKSB7XG4gICAgICAgIG5vcm1hbGl6ZWQueCA9IChldmVudC53aGVlbERlbHRhWCAlIDEyMCAtIDApID09IC0wXG4gICAgICAgICAgICA/IGV2ZW50LndoZWVsRGVsdGFYIC8gMTIwXG4gICAgICAgICAgICA6IGV2ZW50LndoZWVsRGVsdGFYIC8gMTI7XG4gICAgICAgIG5vcm1hbGl6ZWQueSA9IChldmVudC53aGVlbERlbHRhWSAlIDEyMCAtIDApID09IC0wXG4gICAgICAgICAgICA/IGV2ZW50LndoZWVsRGVsdGFZIC8gMTIwXG4gICAgICAgICAgICA6IGV2ZW50LndoZWVsRGVsdGFZIC8gMTI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmF3ID0gZXZlbnQuZGVsdGFZID8gZXZlbnQuZGVsdGFZIDogZXZlbnQuZGV0YWlsO1xuICAgICAgICBub3JtYWxpemVkLnkgPSAtKHJhdyAlIDMgPyByYXcgKiAxMCA6IHJhdyAvIDMpO1xuICAgICAgICByYXcgPSBldmVudC5kZWx0YVggPyBldmVudC5kZWx0YVggOiBldmVudC5kZXRhaWw7XG4gICAgICAgIG5vcm1hbGl6ZWQueCA9IC0ocmF3ICUgMyA/IHJhdyAqIDEwIDogcmF3IC8gMyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vcm1hbGl6ZWQ7XG59XG5cbi8qKlxuICogQ3JlYXRlIE11dGxpU2VxdWVuY2VBbGlnbm1lbnQgVmlld2VyXG4gKiBPcHRpb25zIGluY2x1ZGVcbiAqICAgICBmb250OiB7c3RyaW5nfSBsaWtlICcxMnB4IG1vbm9zcGFjZSdcbiAqICAgICBsaW5lSGVpZ2h0OiB7bnVtYmVyfVxuICogICAgIGxhYmVsV2lkdGg6IHtudW1iZXJ9XG4gKiAgICAgbGVmdE1hcmdpbjoge251bWJlcn1cbiAqICAgICBsZXR0ZXJTcGFjaW5nOiB7bnVtYmVyfVxuICogICAgIGN1cnNvckNvbG9yOiB7c3RyaW5nfSBsaWtlICdyZ2JhKDEyOCwgMTI4LCAxMjgsIDAuMiknXG4gKiAgICAgbG9hZGluZ1RleHQ6IHtzdHJpbmd9XG4gKiAgICAgY29sb3JTY2hlbWU6IHtzdHJpbmd9IHByb3ZpZGVkIGJ5IGJpb2pzLXV0aWwtY29sb3JzY2hlbWVzXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge29iamVjdH0gcm9vdFxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICovXG5cbmZ1bmN0aW9uIE1TQVZpZXcgKHJvb3QsIG9wdCkge1xuXG4gICAgLy8gaW5jbHVkZSBkZWZhdWx0IG9wdCBhbmQgb3B0IGZyb20gRE9NIGRhdGFzZXRcbiAgICBvcHQgPSBleHRlbmQoe30sIE1TQVZpZXcuZGVmYXVsdE9wdGlvbnMsIHJvb3QuZGF0YXNldCwgb3B0KTtcblxuICAgIHJvb3QubXNhdmlldyA9IHRoaXM7XG5cbiAgICAvLyBjcmVhdGUgc3RhZ2VcbiAgICB2YXIgY3ZzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cbiAgICByb290LmFwcGVuZENoaWxkKGN2cyk7XG5cbiAgICB2YXIgY29sb3JTY2hlbWUgPSBjb2xvclNjaGVtZVNlbGVjdG9yLmdldENvbG9yKG9wdC5jb2xvclNjaGVtZSk7XG4gICAgdmFyIHNjcm9sbCA9IHt4OiAwfDAsIHk6IDB8MCwgbWF4WDogMHwwLCBtYXhZOiAwfDB9O1xuICAgIHZhciBhbG4gPSBuZXcgTVNBKHJvb3QuZGF0YXNldC5hbGlnbm1lbnQpO1xuICAgIHZhciBjdHggPSBjdnMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICB2YXIgcmVjdCA9IG51bGw7XG4gICAgdmFyIG1vdXNlID0gbnVsbDtcbiAgICB2YXIgTE9DSyA9IGZhbHNlO1xuICAgIHZhciBkcmF3QWdhaW4gPSBmYWxzZTtcbiAgICB2YXIgY2hhcldpZHRoID0gbnVsbDtcbiAgICB2YXIgZW0gPSBudWxsO1xuICAgIHZhciBsaW5lSGVpZ2h0ID0gb3B0LmxpbmVIZWlnaHQ7XG4gICAgdmFyIGxldHRlclNwYWNpbmcgPSBvcHQubGV0dGVyU3BhY2luZztcbiAgICB2YXIgbGFiZWxXaWR0aCA9IG9wdC5sYWJlbFdpZHRoO1xuICAgIHZhciBsZWZ0TWFyZ2luID0gb3B0LmxlZnRNYXJnaW47XG5cbiAgICAvLyBhcHBseSBvcHRpb25zXG4gICAgaWYgKCdiY25Nc2FGdWxsc2NyZWVuJyBpbiBvcHQpXG4gICAgICAgIHJvb3Quc3R5bGUud2lkdGggPSByb290LnN0eWxlLmhlaWdodCA9ICcxMDAlJztcblxuICAgIC8vIHNldCBjdnMgcHJvcG9ydGlvbnNcbiAgICBjdnMud2lkdGggPSByb290Lm9mZnNldFdpZHRoO1xuICAgIGN2cy5oZWlnaHQgPSByb290Lm9mZnNldEhlaWdodDtcblxuICAgIHZhciBIID0gY3ZzLmNsaWVudEhlaWdodDtcbiAgICB2YXIgVyA9IGN2cy5jbGllbnRXaWR0aDtcblxuICAgIC8vIGF0dGFjaCBldmVudCBoYW5kbGVyc1xuICAgIGlmICgnb253aGVlbCcgaW4gY3ZzKSB7XG4gICAgICAgIGN2cy5hZGRFdmVudExpc3RlbmVyKCd3aGVlbCcsIG9uU2Nyb2xsKTtcbiAgICB9IGVsc2UgaWYgKCdvbm1vdXNld2hlZWwnIGluIGN2cykge1xuICAgICAgICBjdnMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsIG9uU2Nyb2xsKTtcbiAgICB9XG5cbiAgICBjdnMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgb25Qb2ludGVyTW92ZSk7XG4gICAgY3ZzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCBvblBvaW50ZXJPdXQpO1xuICAgIGN2cy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBvblBvaW50ZXJEb3duKTtcbiAgICBjdnMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIG9uUG9pbnRlclVwKTtcbiAgICBjdnMuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoZSkge2UucHJldmVudERlZmF1bHQoKTt9KTtcblxuICAgIHRoaXMuc2V0Rm9udCA9IGZ1bmN0aW9uIChmb250KSB7XG4gICAgICAgIHZhciBpO1xuXG4gICAgICAgIGN0eC5mb250ID0gZm9udDtcbiAgICAgICAgY2hhcldpZHRoID0gKGN0eC5tZWFzdXJlVGV4dCgneCcpLndpZHRoICsgMSkgfDA7XG4gICAgICAgIGVtID0gKGNoYXJXaWR0aCArIGxldHRlclNwYWNpbmcpIHwwO1xuICAgICAgICByZWN0ID0gY3ZzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIH07XG5cbiAgICB0aGlzLnNldEZvbnQob3B0LmZvbnQpO1xuXG4gICAgdmFyIHRyYWNrcyA9IFtdO1xuICAgIHZhciB2aWV3ID0ge1xuICAgICAgICBoZWlnaHQ6IChmbG9vcihIIC8gbGluZUhlaWdodCkgLSA0KSB8MFxuICAgICAgICAsIHNlcU9mZnNldDogKGxhYmVsV2lkdGggKyBsZXR0ZXJTcGFjaW5nICsgbGVmdE1hcmdpbikgfDBcbiAgICAgICAgLCBsYWJlbFRydW5jYXRlOiAoKGxhYmVsV2lkdGggLSBsZWZ0TWFyZ2luKSAvIChjaGFyV2lkdGgtMSkpIHwwXG4gICAgfTtcblxuICAgIHVwZGF0ZVZpZXcoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVZpZXcgKCkge1xuXG4gICAgICAgIGlmIChMT0NLKVxuICAgICAgICAgICAgcmV0dXJuIExPQ0s7XG5cbiAgICAgICAgaWYgKCEodmlldykpXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgICAgICAgcmV0dXJuIChMT0NLID0gUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgYWxuLmdldExpbmVzKHZpZXcub2Zmc2V0WSwgdmlldy5vZmZzZXRZICsgdmlldy5oZWlnaHQpXG4gICAgICAgICAgICAsIGFsbi5nZXRTaXplKClcbiAgICAgICAgXSkudGhlbihmdW5jdGlvbiAocmVzKSB7XG5cbiAgICAgICAgICAgIHRyYWNrcyA9IHJlc1swXTtcbiAgICAgICAgICAgIHZpZXcuYWxpZ25tZW50ID0gcmVzWzFdLmFsaWdubWVudDtcbiAgICAgICAgICAgIHZpZXcuY291bnQgPSByZXNbMV0uc2VxdWVuY2VDb3VudDtcbiAgICAgICAgICAgIHZpZXcuc2VxdWVuY2VXaWR0aCA9IHJlc1sxXS5zZXF1ZW5jZVdpZHRoO1xuXG4gICAgICAgICAgICBzY3JvbGwubWF4WCA9IGZsb29yKHZpZXcuc2VxdWVuY2VXaWR0aCAqIGVtKVxuICAgICAgICAgICAgICAgIC0gVyArIG9wdC5sYWJlbFdpZHRoICsgb3B0LmxlZnRNYXJnaW47XG4gICAgICAgICAgICBzY3JvbGwubWF4WSA9IChyZXNbMV0uc2VxdWVuY2VDb3VudCAtIHZpZXcuaGVpZ2h0KVxuICAgICAgICAgICAgICAgICogb3B0LmxpbmVIZWlnaHQgLSBIO1xuXG4gICAgICAgICAgICB2aWV3Lmxhc3RPZmZzZXRZID0gdmlldy5vZmZzZXRZO1xuICAgICAgICAgICAgTE9DSyA9IGZhbHNlO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGRyYXcsIDEwKTtcbiAgICAgICAgfSkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uU2Nyb2xsIChlKSB7XG5cbiAgICAgICAgaWYgKExPQ0spXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgcmVjdCA9IGN2cy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgZHggPSBlLmRlbHRhWCB8MDtcbiAgICAgICAgZHkgPSBlLmRlbHRhWSB8MDtcblxuICAgICAgICBpZiAoaXNGaXJlZm94KSB7XG4gICAgICAgICAgICBkeCA9IGR4ICogMTAgfDA7XG4gICAgICAgICAgICBkeSA9IGR5ICogMTAgfDA7XG4gICAgICAgICAgICByZXR1cm4gY29uc29sZS5sb2coZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzY3JvbGwubGFzdFggPSBzY3JvbGwueDtcbiAgICAgICAgc2Nyb2xsLmxhc3RZID0gc2Nyb2xsLnk7XG5cbiAgICAgICAgc2Nyb2xsLnggPSBtaW5tYXh2YWwoMCwgc2Nyb2xsLm1heFgsIHNjcm9sbC54ICsgZHgpO1xuICAgICAgICBzY3JvbGwueSA9IG1pbm1heHZhbCgwLCBzY3JvbGwubWF4WSwgc2Nyb2xsLnkgKyBkeSk7XG5cbiAgICAgICAgZHJhdygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUG9pbnRlck91dCAoKSB7XG4gICAgICAgIG1vdXNlID0gbnVsbDtcbiAgICAgICAgZHJhdygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUG9pbnRlck1vdmUgKGUpIHtcbiAgICAgICAgcmVjdCA9IGN2cy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgbW91c2UgPSB7XG4gICAgICAgICAgICBsZWZ0OiBtb3VzZSAmJiBtb3VzZS5sZWZ0XG4gICAgICAgICAgICAsIHJpZ2h0OiBtb3VzZSAmJiBtb3VzZS5yaWdodFxuICAgICAgICAgICAgLCBtaWRkbGU6IG1vdXNlICYmIG1vdXNlLm1pZGRsZVxuICAgICAgICAgICAgLCB5OiBlLmNsaWVudFkgLSByZWN0LnRvcFxuICAgICAgICAgICAgLCB4OiBlLmNsaWVudFggLSByZWN0LmxlZnRcbiAgICAgICAgfTtcblxuXG5cbiAgICAgICAgZHJhdygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uUG9pbnRlckRvd24gKGUpIHtcbiAgICAgICAgaWYgKCFtb3VzZSkgcmV0dXJuO1xuXG4gICAgICAgIHN3aXRjaCAoZS53aGljaCkge1xuICAgICAgICBjYXNlIDE6IG1vdXNlLmxlZnQgPSB0cnVlOyBicmVhaztcbiAgICAgICAgY2FzZSAzOiBtb3VzZS5yaWdodCA9IHRydWU7IGJyZWFrO1xuICAgICAgICBjYXNlIDI6IG1vdXNlLm1pZGRsZSA9IHRydWU7IGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1vdXNlLm1pZGRsZSlcbiAgICAgICAgICAgIHNjcm9sbC5wYW4gPSB7eDogbW91c2UueCwgeTogbW91c2UueX07XG5cbiAgICAgICAgaWYgKG1vdXNlLmxlZnQpXG4gICAgICAgICAgICB2aWV3Lm1hcmsgPSB7c3g6IG1vdXNlLnN4LCBzeTogbW91c2Uuc3l9O1xuXG4gICAgICAgIGRyYXcoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblBvaW50ZXJVcCAoZSkge1xuICAgICAgICBpZiAobW91c2UubWlkZGxlKVxuICAgICAgICAgICAgc2Nyb2xsLnBhbiA9IG51bGw7XG5cbiAgICAgICAgc3dpdGNoIChlLndoaWNoKSB7XG4gICAgICAgICAgICBjYXNlIDE6IG1vdXNlLmxlZnQgPSBmYWxzZTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM6IG1vdXNlLnJpZ2h0ID0gZmFsc2U7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOiBtb3VzZS5taWRkbGUgPSBmYWxzZTsgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBkcmF3KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZHJhdyAoKSB7XG4gICAgICAgIHJldHVybiBkcmF3QWdhaW4gPyBudWxsIDogcmVxdWVzdEFuaW1hdGlvbkZyYW1lKF9kcmF3KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZHJhdyAodCkge1xuXG4gICAgICAgIGRyYXdBZ2FpbiA9IGZhbHNlO1xuXG4gICAgICAgIHZhciB4LCB5LCBkeCwgZHksIGksIGosIGssIGwsIG0sIG4sIGxlbiA9IHRyYWNrcy5sZW5ndGhcbiAgICAgICAgLCBoID0gbW91c2UgJiYgKG1vdXNlLnN4IDwgdmlldy5vZmZzZXRYKSAvLyBpcyBtb3VzZSBvdmVyIGxhYmVscz9cbiAgICAgICAgLCByZWRyYXdMYWJlbHMgPSB0cnVlXG4gICAgICAgICwgcmVkcmF3UnVsZXIgPSB0cnVlXG4gICAgICAgIDtcblxuICAgICAgICAvLyBjaGVjayBtb3VzZSBtaWRkbGUgYnV0dG9uIHNjcm9sbFxuICAgICAgICBpZiAobW91c2UgJiYgbW91c2UubWlkZGxlKSB7XG4gICAgICAgICAgICBzY3JvbGwueCA9IG1pbm1heHZhbCgwLCBzY3JvbGwubWF4WCwgc2Nyb2xsLnhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgKChtb3VzZS54IC0gc2Nyb2xsLnBhbi54KSAvIDEwKSk7XG4gICAgICAgICAgICBzY3JvbGwueSA9IG1pbm1heHZhbCgwLCBzY3JvbGwubWF4WSwgc2Nyb2xsLnlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgKChtb3VzZS55IC0gc2Nyb2xsLnBhbi55KSAvIDEwKSk7XG5cbiAgICAgICAgICAgIGRyYXdBZ2FpbiA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB2aWV3Lm9mZnNldFggPSAoc2Nyb2xsLnggLyBlbSkgICAgICAgICB8MDtcbiAgICAgICAgdmlldy5vZmZzZXRZID0gKHNjcm9sbC55IC8gbGluZUhlaWdodCkgfDA7XG5cbiAgICAgICAgLy8gZ2V0IG1vdXNlIGNvb3JkaW5hdGVzIHJlbGF0aXZlIHRvIHNlcXVlbmNlIGFuZFxuICAgICAgICAvLyBhbWlub2FjaWQgcG9zaXRpb25cbiAgICAgICAgaWYgKG1vdXNlKSB7XG4gICAgICAgICAgICBtb3VzZS5zeCA9ICgoKG1vdXNlLnggLSB2aWV3LnNlcU9mZnNldCkgLyBlbSkgKyB2aWV3Lm9mZnNldFgpIHwwO1xuICAgICAgICAgICAgbW91c2Uuc3kgPSAoKG1vdXNlLnkgLyBsaW5lSGVpZ2h0KSAtIDIgKyB2aWV3Lm9mZnNldFkpICAgICAgICB8MDtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLy8gbWF5YmUgd2UgbmVlZCB0byBmZXRjaCBuZXcgbGluZXMgZnJvbSB0aGUgdW5kZXJseWluZyBzb3VyY2VcbiAgICAgICAgaWYgKCFMT0NLICYmICh2aWV3Lm9mZnNldFkgIT09IHZpZXcubGFzdE9mZnNldFkpKVxuICAgICAgICAgICAgdXBkYXRlVmlldygpO1xuXG4gICAgICAgIC8vIGNsZWFyIGNhbnZhcywgbGVhdmUgbGFiZWxzIGFuZCBydWxlciBpbnRhY3QgaWYgcG9zc2libGVcbiAgICAgICAgeCA9IDA7XG4gICAgICAgIHkgPSAwO1xuICAgICAgICBpZiAoc2Nyb2xsLmxhc3RZID09PSBzY3JvbGwueSkge1xuICAgICAgICAgICAgeCA9IHZpZXcuc2VxT2Zmc2V0O1xuICAgICAgICAgICAgcmVkcmF3TGFiZWxzID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNjcm9sbC5sYXN0WCA9PT0gc2Nyb2xsLngpIHtcbiAgICAgICAgICAgIHkgPSBsaW5lSGVpZ2h0O1xuICAgICAgICAgICAgcmVkcmF3UnVsZXIgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGN0eC5jbGVhclJlY3QoeCwgeSwgVywgSCk7XG5cbiAgICAgICAgLy8gbG9hZGluZyB0ZXh0XG4gICAgICAgIGlmIChMT0NLKVxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KG9wdC5sb2FkaW5nVGV4dCwgbGVmdE1hcmdpbiwgbGluZUhlaWdodCk7XG5cbiAgICAgICAgLy8gcnVsZXJcbiAgICAgICAgaWYgKHJlZHJhd1J1bGVyKSB7XG4gICAgICAgICAgICB4ID0gdmlldy5zZXFPZmZzZXQgICB8MDsgLy8gc3RhcnQgcG9zIG9uIHggYXhpc1xuICAgICAgICAgICAgeSA9IGxpbmVIZWlnaHQgKiAyICAgfDA7IC8vIHdyaXRlIHJ1bGVyIG9uIDJuZCBsaW5lXG4gICAgICAgICAgICBpID0gdmlldy5vZmZzZXRYICsgMSB8MDsgLy8gb2Zmc2V0WCBhcmUgdGhlIHBvc2l0aW9ucyBoaWRkZW4gb24gdGhlIGxlZnRcbiAgICAgICAgICAgIC8vIHBvc2l0aW9ucyBhcmUgMS1pbmRleGVkLCBub3QgMC1pbmRleGVkLCB0aHVzICsxXG4gICAgICAgICAgICBqID0gMCAgICAgICAgICAgICAgICB8MDsgLy8gc3RhdGUgdmFyaWFibGVcblxuICAgICAgICAgICAgd2hpbGUgKHggPCBXKSB7XG4gICAgICAgICAgICAgICAgaWYgKGogPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgaiA9IDEgfDA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGogPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGksIHgsIHkpOyAgIC8vIGRyYXcgZmlyc3QgbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgIGogPSAyIHwwOyAgICAgICAgICAgICAgICAvLyBqdW1wIGF0IGxlYXN0IDIgbnVtYmVycyBhZnRlciB0aGUgZmlyc3Qgb25lXG4gICAgICAgICAgICAgICAgICAgIC8vIHRodXMgYXZvaWRpbmcgdGhlIGZpcnN0IG51bWJlciBvdmVybGFwcGluZ1xuICAgICAgICAgICAgICAgICAgICAvLyB3aXRoIHRoZSBuZXh0XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgJSAxMCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGkrJycsIHgsIHkpOyAvLyBkcmF3IGV2ZXJ5IHRlbnRoIG51bWJlclxuICAgICAgICAgICAgICAgICAgICAgICAgaiA9IDUgfDA7ICAgICAgICAgICAgICAgICAvLyByZW1lbWJlciB0aGF0IHdlIGhhdmUgZm91bmQgYSBiYXNlLTUgbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoaSAlIDUgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dCgnLicsIHgsIHkpOyAvLyBkcmF3IGEgZG90IGZvciBldmVyeSBmaWZ0aFxuICAgICAgICAgICAgICAgICAgICAgICAgaiA9IDUgfDA7ICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIHRoYXQgd2UgaGF2ZSBmb3VuZCBhIGJhc2UtNSBudW1iZXJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGkgPSBpICsgaiAgICAgIHwwOyAgICAgICAvLyBhZHZhbmNlIHRoZSBudW1iZXJcbiAgICAgICAgICAgICAgICB4ID0geCArIGogKiBlbSB8MDsgICAgICAgLy8gYWR2YW5jZSBvdXIgeC1wb3NpdGlvblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdHJhY2tzXG4gICAgICAgIGlmIChsZW4pIHtcblxuICAgICAgICAgICAgLy8gY29sb3JzXG4gICAgICAgICAgICB4ID0gdmlldy5zZXFPZmZzZXQgLSBlbS80ICAgfDA7IC8vIGNvbG9yIGJveGVzIGhhdmUgYSBlbS80IG9mZnNldCB0byB0aGUgbGVmdFxuICAgICAgICAgICAgaSA9IHZpZXcub2Zmc2V0WCAgICAgICAgICAgIHwwOyAvLyBzdGFydCBpbmRleFxuXG4gICAgICAgICAgICB3aGlsZSAoeCA8IFcpIHtcblxuICAgICAgICAgICAgICAgIHkgPSAobGluZUhlaWdodCAqIDEuMykgIHwwOyAvLyBzdGFydCBwb3Mgb24geSBpcyAzcmQgbGluZVxuICAgICAgICAgICAgICAgIGogPSAwICAgICAgICAgICAgICAgICAgIHwwOyAvLyB0cmFjayBpbmRleFxuICAgICAgICAgICAgICAgIG4gPSBsaW5lSGVpZ2h0ICAgICAgICAgIHwwOyAvLyBib3ggaGVpZ2h0XG4gICAgICAgICAgICAgICAgbCA9IDBbMF07ICAgICAgICAgICAgICAgICAgIC8vIHVuZGVmaW5lZCBsYXN0IHNlZW4gY29sb3JcblxuICAgICAgICAgICAgICAgIHdoaWxlIChqICE9PSBsZW4pIHtcblxuICAgICAgICAgICAgICAgICAgICBrID0gdHJhY2tzW2pdICYmIHRyYWNrc1tqXS5zZXF1ZW5jZVtpXTsgLy8gYW1pbm8gYWNpZFxuICAgICAgICAgICAgICAgICAgICBtID0gY29sb3JTY2hlbWVba107ICAgICAgICAgICAgICAgICAgICAgLy8gbmV3IGNvbG9yXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgbGFzdCBzZWVuIGFuZCBjdXJyZW50IGNvbG9yIGFyZSB0aGUgc2FtZSxcbiAgICAgICAgICAgICAgICAgICAgLy8gaW5jcmVhc2UgYm94IGhlaWdodFxuICAgICAgICAgICAgICAgICAgICBpZiAobSA9PT0gbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbiA9IChuICsgbGluZUhlaWdodCkgfDA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkcmF3IGJveCBpZiBjb2xvciBpcyBzZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmZpbGxSZWN0KHgsIHksIGVtLCBuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IHkgKyBuICAgICAgfDA7IC8vIG5ldyB5IHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBuID0gbGluZUhlaWdodCB8MDsgLy8gcmVzZXQgYm94IGhlaWdodFxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbCA9IG07ICAgICAgIC8vIHVwZGF0ZSBsYXN0IHNlZW4gY29sb3JcbiAgICAgICAgICAgICAgICAgICAgaiA9IGogKyAxfDA7IC8vIG5leHQgc2VxdWVuY2VcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBjbG9zZSBsYXN0IGJveFxuICAgICAgICAgICAgICAgIGlmIChsKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBsO1xuICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFJlY3QoeCwgeSwgZW0sIG4pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHggPSB4ICsgZW0gfDA7IC8vIG5leHQgZHJhdyBjb2x1bW5cbiAgICAgICAgICAgICAgICBpID0gaSArIDEgIHwwOyAvLyBuZXh0IHNlcXVlbmNlIGNvbHVtblxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIC8vIHNlcXVlbmNlc1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdibGFjayc7IC8vIGJsYWNrIGNoYXJhY3RlcnNcbiAgICAgICAgICAgIHkgPSBsaW5lSGVpZ2h0ICogMyAgIHwwOyAvLyBzdGFydCBwb3Mgb24geSBpcyAzcmQgbGluZVxuICAgICAgICAgICAgaSA9IDAgICAgICAgICAgICAgICAgfDA7IC8vIHRyYWNrIGluZGV4XG5cbiAgICAgICAgICAgIHdoaWxlICgoayA9IHRyYWNrc1tpXSkpIHtcblxuICAgICAgICAgICAgICAgIC8vIGRyYXcgc2VxdWVuY2VcbiAgICAgICAgICAgICAgICB4ID0gdmlldy5zZXFPZmZzZXQgICB8MDsgLy8gc3RhcnQgcG9zIG9uIHggYXhpc1xuICAgICAgICAgICAgICAgIGogPSB2aWV3Lm9mZnNldFggICAgIHwwOyAvLyBhbWlub2FjaWQgaW5kZXhcblxuICAgICAgICAgICAgICAgIHdoaWxlICgobCA9IGsuc2VxdWVuY2Vbal0pICYmICh4IDwgVykpIHtcblxuICAgICAgICAgICAgICAgICAgICAvLyB3cml0ZSBhbWlubyBhY2lkXG4gICAgICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dChsLCB4LCB5KTtcblxuICAgICAgICAgICAgICAgICAgICBqID0gaiArIDEgIHwwOyAvLyBhZHZhbmNlIGFtaW5vYWNpZCBpbmRleFxuICAgICAgICAgICAgICAgICAgICB4ID0geCArIGVtIHwwOyAvLyBhZHZhbmNlIG9uZSBjaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmVkcmF3TGFiZWxzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgbW91c2UgaXMgb3ZlciB0aGUgbGFiZWwsIGRyYXcgZnVsbCBsYWJlbCwgd2l0aCBhXG4gICAgICAgICAgICAgICAgICAgIC8vIHdoaXRlIGJhY2tncm91bmQsIGVsc2UgZHJhdyB0dW5jYXRlZCBsYWJlbFxuICAgICAgICAgICAgICAgICAgICBpZiAoaCAmJiAobW91c2Uuc3kgPT09IHZpZXcub2Zmc2V0WSArIGkpKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JnYigyNTUsIDI1NSwgMjU1KSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFJlY3QobGVmdE1hcmdpbiwgeSAtIGxpbmVIZWlnaHQgKyAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLCBXLCBsaW5lSGVpZ2h0ICsgNCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGsubGFiZWwsIGxlZnRNYXJnaW4sIHkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGsubGFiZWwuc3Vic3RyKDAsIHZpZXcubGFiZWxUcnVuY2F0ZSksIGxlZnRNYXJnaW4sIHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaSA9IGkgKyAxICAgICAgICAgIHwwOyAvLyBhZHZhbmNlIHRyYWNrIGluZGV4XG4gICAgICAgICAgICAgICAgeSA9IHkgKyBsaW5lSGVpZ2h0IHwwOyAvLyBhZHZhbmNlIG9uZSBsaW5lXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbn1cblxuXG5NU0FWaWV3LmRlZmF1bHRPcHRpb25zID0ge1xuICAgIGZvbnQ6ICcxMnB4IG1vbm9zcGFjZSdcbiAgICAsIGxpbmVIZWlnaHQ6IDE0ICB8MCAgLy8gcHggZm9yY2UgSW50MzIgYXJpdGhtZXRpY1xuICAgICwgbGFiZWxXaWR0aDogMTAwIHwwICAvLyBweFxuICAgICwgbGVmdE1hcmdpbjogMjAgIHwwICAvLyBweFxuICAgICwgbGV0dGVyU3BhY2luZzogOHwwICAvLyBweCBiZXR3ZWVuIGFtaW5vYWNpZHNcbiAgICAsIGN1cnNvckNvbG9yOiAncmdiYSgxMjgsIDEyOCwgMTI4LCAwLjIpJ1xuICAgICwgbG9hZGluZ1RleHQ6ICdsb2FkaW5nLi4uJ1xuICAgICwgY29sb3JTY2hlbWU6ICdjbHVzdGFsMidcbn07XG5cblxuaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIHJlcXVpcmUuanMgbW9kdWxlXG4gICAgZGVmaW5lKE1TQVZpZXcpO1xufSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICB3aW5kb3cuTVNBVmlldyA9IE1TQVZpZXc7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2luZGV4LmpzJylcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBOiBcIiMwMGEzNWNcIixcbiAgUjogXCIjMDBmYzAzXCIsXG4gIE46IFwiIzAwZWIxNFwiLFxuICBEOiBcIiMwMGViMTRcIixcbiAgQzogXCIjMDAwMGZmXCIsXG4gIFE6IFwiIzAwZjEwZVwiLFxuICBFOiBcIiMwMGYxMGVcIixcbiAgRzogXCIjMDA5ZDYyXCIsXG4gIEg6IFwiIzAwZDUyYVwiLFxuICBJOiBcIiMwMDU0YWJcIixcbiAgTDogXCIjMDA3Yjg0XCIsXG4gIEs6IFwiIzAwZmYwMFwiLFxuICBNOiBcIiMwMDk3NjhcIixcbiAgRjogXCIjMDA4Nzc4XCIsXG4gIFA6IFwiIzAwZTAxZlwiLFxuICBTOiBcIiMwMGQ1MmFcIixcbiAgVDogXCIjMDBkYjI0XCIsXG4gIFc6IFwiIzAwYTg1N1wiLFxuICBZOiBcIiMwMGU2MTlcIixcbiAgVjogXCIjMDA1ZmEwXCIsXG4gIEI6IFwiIzAwZWIxNFwiLFxuICBYOiBcIiMwMGI2NDlcIixcbiAgWjogXCIjMDBmMTBlXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjQkJCQkJCXCIsXG4gIEI6IFwiZ3JleVwiLFxuICBDOiBcInllbGxvd1wiLFxuICBEOiBcInJlZFwiLFxuICBFOiBcInJlZFwiLFxuICBGOiBcIm1hZ2VudGFcIixcbiAgRzogXCJicm93blwiLFxuICBIOiBcIiMwMEZGRkZcIixcbiAgSTogXCIjQkJCQkJCXCIsXG4gIEo6IFwiI2ZmZlwiLFxuICBLOiBcIiMwMEZGRkZcIixcbiAgTDogXCIjQkJCQkJCXCIsXG4gIE06IFwiI0JCQkJCQlwiLFxuICBOOiBcImdyZWVuXCIsXG4gIE86IFwiI2ZmZlwiLFxuICBQOiBcImJyb3duXCIsXG4gIFE6IFwiZ3JlZW5cIixcbiAgUjogXCIjMDBGRkZGXCIsXG4gIFM6IFwiZ3JlZW5cIixcbiAgVDogXCJncmVlblwiLFxuICBVOiBcIiNmZmZcIixcbiAgVjogXCIjQkJCQkJCXCIsXG4gIFc6IFwibWFnZW50YVwiLFxuICBYOiBcImdyZXlcIixcbiAgWTogXCJtYWdlbnRhXCIsXG4gIFo6IFwiZ3JleVwiLFxuICBHYXA6IFwiZ3JleVwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwib3JhbmdlXCIsXG4gIEI6IFwiI2ZmZlwiLFxuICBDOiBcImdyZWVuXCIsXG4gIEQ6IFwicmVkXCIsXG4gIEU6IFwicmVkXCIsXG4gIEY6IFwiYmx1ZVwiLFxuICBHOiBcIm9yYW5nZVwiLFxuICBIOiBcInJlZFwiLFxuICBJOiBcImdyZWVuXCIsXG4gIEo6IFwiI2ZmZlwiLFxuICBLOiBcInJlZFwiLFxuICBMOiBcImdyZWVuXCIsXG4gIE06IFwiZ3JlZW5cIixcbiAgTjogXCIjZmZmXCIsXG4gIE86IFwiI2ZmZlwiLFxuICBQOiBcIm9yYW5nZVwiLFxuICBROiBcIiNmZmZcIixcbiAgUjogXCJyZWRcIixcbiAgUzogXCJvcmFuZ2VcIixcbiAgVDogXCJvcmFuZ2VcIixcbiAgVTogXCIjZmZmXCIsXG4gIFY6IFwiZ3JlZW5cIixcbiAgVzogXCJibHVlXCIsXG4gIFg6IFwiI2ZmZlwiLFxuICBZOiBcImJsdWVcIixcbiAgWjogXCIjZmZmXCIsXG4gIEdhcDogXCIjZmZmXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjODBhMGYwXCIsXG4gIFI6IFwiI2YwMTUwNVwiLFxuICBOOiBcIiMwMGZmMDBcIixcbiAgRDogXCIjYzA0OGMwXCIsXG4gIEM6IFwiI2YwODA4MFwiLFxuICBROiBcIiMwMGZmMDBcIixcbiAgRTogXCIjYzA0OGMwXCIsXG4gIEc6IFwiI2YwOTA0OFwiLFxuICBIOiBcIiMxNWE0YTRcIixcbiAgSTogXCIjODBhMGYwXCIsXG4gIEw6IFwiIzgwYTBmMFwiLFxuICBLOiBcIiNmMDE1MDVcIixcbiAgTTogXCIjODBhMGYwXCIsXG4gIEY6IFwiIzgwYTBmMFwiLFxuICBQOiBcIiNmZmZmMDBcIixcbiAgUzogXCIjMDBmZjAwXCIsXG4gIFQ6IFwiIzAwZmYwMFwiLFxuICBXOiBcIiM4MGEwZjBcIixcbiAgWTogXCIjMTVhNGE0XCIsXG4gIFY6IFwiIzgwYTBmMFwiLFxuICBCOiBcIiNmZmZcIixcbiAgWDogXCIjZmZmXCIsXG4gIFo6IFwiI2ZmZlwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiI2U3MThlN1wiLFxuICBSOiBcIiM2ZjkwNmZcIixcbiAgTjogXCIjMWJlNDFiXCIsXG4gIEQ6IFwiIzc3ODg3N1wiLFxuICBDOiBcIiMyM2RjMjNcIixcbiAgUTogXCIjOTI2ZDkyXCIsXG4gIEU6IFwiI2ZmMDBmZlwiLFxuICBHOiBcIiMwMGZmMDBcIixcbiAgSDogXCIjNzU4YTc1XCIsXG4gIEk6IFwiIzhhNzU4YVwiLFxuICBMOiBcIiNhZTUxYWVcIixcbiAgSzogXCIjYTA1ZmEwXCIsXG4gIE06IFwiI2VmMTBlZlwiLFxuICBGOiBcIiM5ODY3OThcIixcbiAgUDogXCIjMDBmZjAwXCIsXG4gIFM6IFwiIzM2YzkzNlwiLFxuICBUOiBcIiM0N2I4NDdcIixcbiAgVzogXCIjOGE3NThhXCIsXG4gIFk6IFwiIzIxZGUyMVwiLFxuICBWOiBcIiM4NTdhODVcIixcbiAgQjogXCIjNDliNjQ5XCIsXG4gIFg6IFwiIzc1OGE3NVwiLFxuICBaOiBcIiNjOTM2YzlcIlxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBOiBcIiNhZDAwNTJcIixcbiAgQjogXCIjMGMwMGYzXCIsXG4gIEM6IFwiI2MyMDAzZFwiLFxuICBEOiBcIiMwYzAwZjNcIixcbiAgRTogXCIjMGMwMGYzXCIsXG4gIEY6IFwiI2NiMDAzNFwiLFxuICBHOiBcIiM2YTAwOTVcIixcbiAgSDogXCIjMTUwMGVhXCIsXG4gIEk6IFwiI2ZmMDAwMFwiLFxuICBKOiBcIiNmZmZcIixcbiAgSzogXCIjMDAwMGZmXCIsXG4gIEw6IFwiI2VhMDAxNVwiLFxuICBNOiBcIiNiMDAwNGZcIixcbiAgTjogXCIjMGMwMGYzXCIsXG4gIE86IFwiI2ZmZlwiLFxuICBQOiBcIiM0NjAwYjlcIixcbiAgUTogXCIjMGMwMGYzXCIsXG4gIFI6IFwiIzAwMDBmZlwiLFxuICBTOiBcIiM1ZTAwYTFcIixcbiAgVDogXCIjNjEwMDllXCIsXG4gIFU6IFwiI2ZmZlwiLFxuICBWOiBcIiNmNjAwMDlcIixcbiAgVzogXCIjNWIwMGE0XCIsXG4gIFg6IFwiIzY4MDA5N1wiLFxuICBZOiBcIiM0ZjAwYjBcIixcbiAgWjogXCIjMGMwMGYzXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cy5zZWxlY3RvciA9IHJlcXVpcmUoXCIuL3NlbGVjdG9yXCIpO1xuXG4vLyBiYXNpY3Ncbm1vZHVsZS5leHBvcnRzLnRheWxvciA9IHJlcXVpcmUoXCIuL3RheWxvclwiKTtcbm1vZHVsZS5leHBvcnRzLnphcHBvPSByZXF1aXJlKFwiLi96YXBwb1wiKTtcbm1vZHVsZS5leHBvcnRzLmh5ZHJvPSByZXF1aXJlKFwiLi9oeWRyb3Bob2JpY2l0eVwiKTtcblxubW9kdWxlLmV4cG9ydHMuY2x1c3RhbCA9IHJlcXVpcmUoXCIuL2NsdXN0YWxcIik7XG5tb2R1bGUuZXhwb3J0cy5jbHVzdGFsMiA9IHJlcXVpcmUoXCIuL2NsdXN0YWwyXCIpO1xuXG5tb2R1bGUuZXhwb3J0cy5jdXJpZWQgPSByZXF1aXJlKFwiLi9idXJpZWRcIik7XG5tb2R1bGUuZXhwb3J0cy5jaW5lbWEgPSByZXF1aXJlKFwiLi9jaW5lbWFcIik7XG5tb2R1bGUuZXhwb3J0cy5udWNsZW90aWRlICA9IHJlcXVpcmUoXCIuL251Y2xlb3RpZGVcIik7XG5tb2R1bGUuZXhwb3J0cy5oZWxpeCAgPSByZXF1aXJlKFwiLi9oZWxpeFwiKTtcbm1vZHVsZS5leHBvcnRzLmxlc2sgID0gcmVxdWlyZShcIi4vbGVza1wiKTtcbm1vZHVsZS5leHBvcnRzLm1hZSA9IHJlcXVpcmUoXCIuL21hZVwiKTtcbm1vZHVsZS5leHBvcnRzLnB1cmluZSA9IHJlcXVpcmUoXCIuL3B1cmluZVwiKTtcbm1vZHVsZS5leHBvcnRzLnN0cmFuZCA9IHJlcXVpcmUoXCIuL3N0cmFuZFwiKTtcbm1vZHVsZS5leHBvcnRzLnR1cm4gPSByZXF1aXJlKFwiLi90dXJuXCIpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiIG9yYW5nZVwiLFxuICBCOiBcIiAjZmZmXCIsXG4gIEM6IFwiIGdyZWVuXCIsXG4gIEQ6IFwiIHJlZFwiLFxuICBFOiBcIiByZWRcIixcbiAgRjogXCIgZ3JlZW5cIixcbiAgRzogXCIgb3JhbmdlXCIsXG4gIEg6IFwiIG1hZ2VudGFcIixcbiAgSTogXCIgZ3JlZW5cIixcbiAgSjogXCIgI2ZmZlwiLFxuICBLOiBcIiByZWRcIixcbiAgTDogXCIgZ3JlZW5cIixcbiAgTTogXCIgZ3JlZW5cIixcbiAgTjogXCIgbWFnZW50YVwiLFxuICBPOiBcIiAjZmZmXCIsXG4gIFA6IFwiIGdyZWVuXCIsXG4gIFE6IFwiIG1hZ2VudGFcIixcbiAgUjogXCIgcmVkXCIsXG4gIFM6IFwiIG9yYW5nZVwiLFxuICBUOiBcIiBvcmFuZ2VcIixcbiAgVTogXCIgI2ZmZlwiLFxuICBWOiBcIiBncmVlblwiLFxuICBXOiBcIiBncmVlblwiLFxuICBYOiBcIiAjZmZmXCIsXG4gIFk6IFwiIGdyZWVuXCIsXG4gIFo6IFwiICNmZmZcIixcbiAgR2FwOiBcIiAjZmZmXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIgIzc3ZGQ4OFwiLFxuICBCOiBcIiAjZmZmXCIsXG4gIEM6IFwiICM5OWVlNjZcIixcbiAgRDogXCIgIzU1YmIzM1wiLFxuICBFOiBcIiAjNTViYjMzXCIsXG4gIEY6IFwiICM5OTk5ZmZcIixcbiAgRzogXCIgIzc3ZGQ4OFwiLFxuICBIOiBcIiAjNTU1NWZmXCIsXG4gIEk6IFwiICM2NmJiZmZcIixcbiAgSjogXCIgI2ZmZlwiLFxuICBLOiBcIiAjZmZjYzc3XCIsXG4gIEw6IFwiICM2NmJiZmZcIixcbiAgTTogXCIgIzY2YmJmZlwiLFxuICBOOiBcIiAjNTViYjMzXCIsXG4gIE86IFwiICNmZmZcIixcbiAgUDogXCIgI2VlYWFhYVwiLFxuICBROiBcIiAjNTViYjMzXCIsXG4gIFI6IFwiICNmZmNjNzdcIixcbiAgUzogXCIgI2ZmNDQ1NVwiLFxuICBUOiBcIiAjZmY0NDU1XCIsXG4gIFU6IFwiICNmZmZcIixcbiAgVjogXCIgIzY2YmJmZlwiLFxuICBXOiBcIiAjOTk5OWZmXCIsXG4gIFg6IFwiICNmZmZcIixcbiAgWTogXCIgIzk5OTlmZlwiLFxuICBaOiBcIiAjZmZmXCIsXG4gIEdhcDogXCIgI2ZmZlwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiICM2NEY3M0ZcIixcbiAgQzogXCIgI0ZGQjM0MFwiLFxuICBHOiBcIiAjRUI0MTNDXCIsXG4gIFQ6IFwiICMzQzg4RUVcIixcbiAgVTogXCIgIzNDODhFRVwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiICNGRjgzRkFcIixcbiAgQzogXCIgIzQwRTBEMFwiLFxuICBHOiBcIiAjRkY4M0ZBXCIsXG4gIFI6IFwiICNGRjgzRkFcIixcbiAgVDogXCIgIzQwRTBEMFwiLFxuICBVOiBcIiAjNDBFMEQwXCIsXG4gIFk6IFwiICM0MEUwRDBcIlxufTtcbiIsInZhciBCdXJpZWQgPSByZXF1aXJlKFwiLi9idXJpZWRcIik7XG52YXIgQ2luZW1hID0gcmVxdWlyZShcIi4vY2luZW1hXCIpO1xudmFyIENsdXN0YWwgPSByZXF1aXJlKFwiLi9jbHVzdGFsXCIpO1xudmFyIENsdXN0YWwyID0gcmVxdWlyZShcIi4vY2x1c3RhbDJcIik7XG52YXIgSGVsaXggPSByZXF1aXJlKFwiLi9oZWxpeFwiKTtcbnZhciBIeWRybyA9IHJlcXVpcmUoXCIuL2h5ZHJvcGhvYmljaXR5XCIpO1xudmFyIExlc2sgPSByZXF1aXJlKFwiLi9sZXNrXCIpO1xudmFyIE1hZSA9IHJlcXVpcmUoXCIuL21hZVwiKTtcbnZhciBOdWNsZW90aWRlID0gcmVxdWlyZShcIi4vbnVjbGVvdGlkZVwiKTtcbnZhciBQdXJpbmUgPSByZXF1aXJlKFwiLi9wdXJpbmVcIik7XG52YXIgU3RyYW5kID0gcmVxdWlyZShcIi4vc3RyYW5kXCIpO1xudmFyIFRheWxvciA9IHJlcXVpcmUoXCIuL3RheWxvclwiKTtcbnZhciBUdXJuID0gcmVxdWlyZShcIi4vdHVyblwiKTtcbnZhciBaYXBwbyA9IHJlcXVpcmUoXCIuL3phcHBvXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9ycyA9IHtcbiAgbWFwcGluZzoge1xuICAgIGJ1cmllZDogQnVyaWVkLFxuICAgIGJ1cmllZF9pbmRleDogQnVyaWVkLFxuICAgIGNpbmVtYTogQ2luZW1hLFxuICAgIGNsdXN0YWwyOiBDbHVzdGFsMixcbiAgICBjbHVzdGFsOiBDbHVzdGFsLFxuICAgIGhlbGl4OiBIZWxpeCxcbiAgICBoZWxpeF9wcm9wZW5zaXR5OiBIZWxpeCxcbiAgICBoeWRybzogSHlkcm8sXG4gICAgbGVzazogTGVzayxcbiAgICBtYWU6IE1hZSxcbiAgICBudWNsZW90aWRlOiBOdWNsZW90aWRlLFxuICAgIHB1cmluZTogUHVyaW5lLFxuICAgIHB1cmluZV9weXJpbWlkaW5lOiBQdXJpbmUsXG4gICAgc3RyYW5kOiBTdHJhbmQsXG4gICAgc3RyYW5kX3Byb3BlbnNpdHk6IFN0cmFuZCxcbiAgICB0YXlsb3I6IFRheWxvcixcbiAgICB0dXJuOiBUdXJuLFxuICAgIHR1cm5fcHJvcGVuc2l0eTogVHVybixcbiAgICB6YXBwbzogWmFwcG8sXG4gIH0sXG4gIGdldENvbG9yOiBmdW5jdGlvbihzY2hlbWUpIHtcbiAgICB2YXIgY29sb3IgPSBDb2xvcnMubWFwcGluZ1tzY2hlbWVdO1xuICAgIGlmIChjb2xvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb2xvciA9IHt9O1xuICAgIH1cbiAgICByZXR1cm4gY29sb3I7XG4gIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjNTg1OGE3XCIsXG4gIFI6IFwiIzZiNmI5NFwiLFxuICBOOiBcIiM2NDY0OWJcIixcbiAgRDogXCIjMjEyMWRlXCIsXG4gIEM6IFwiIzlkOWQ2MlwiLFxuICBROiBcIiM4YzhjNzNcIixcbiAgRTogXCIjMDAwMGZmXCIsXG4gIEc6IFwiIzQ5NDliNlwiLFxuICBIOiBcIiM2MDYwOWZcIixcbiAgSTogXCIjZWNlYzEzXCIsXG4gIEw6IFwiI2IyYjI0ZFwiLFxuICBLOiBcIiM0NzQ3YjhcIixcbiAgTTogXCIjODI4MjdkXCIsXG4gIEY6IFwiI2MyYzIzZFwiLFxuICBQOiBcIiMyMzIzZGNcIixcbiAgUzogXCIjNDk0OWI2XCIsXG4gIFQ6IFwiIzlkOWQ2MlwiLFxuICBXOiBcIiNjMGMwM2ZcIixcbiAgWTogXCIjZDNkMzJjXCIsXG4gIFY6IFwiI2ZmZmYwMFwiLFxuICBCOiBcIiM0MzQzYmNcIixcbiAgWDogXCIjNzk3OTg2XCIsXG4gIFo6IFwiIzQ3NDdiOFwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiI2NjZmYwMFwiLFxuICBSOiBcIiMwMDAwZmZcIixcbiAgTjogXCIjY2MwMGZmXCIsXG4gIEQ6IFwiI2ZmMDAwMFwiLFxuICBDOiBcIiNmZmZmMDBcIixcbiAgUTogXCIjZmYwMGNjXCIsXG4gIEU6IFwiI2ZmMDA2NlwiLFxuICBHOiBcIiNmZjk5MDBcIixcbiAgSDogXCIjMDA2NmZmXCIsXG4gIEk6IFwiIzY2ZmYwMFwiLFxuICBMOiBcIiMzM2ZmMDBcIixcbiAgSzogXCIjNjYwMGZmXCIsXG4gIE06IFwiIzAwZmYwMFwiLFxuICBGOiBcIiMwMGZmNjZcIixcbiAgUDogXCIjZmZjYzAwXCIsXG4gIFM6IFwiI2ZmMzMwMFwiLFxuICBUOiBcIiNmZjY2MDBcIixcbiAgVzogXCIjMDBjY2ZmXCIsXG4gIFk6IFwiIzAwZmZjY1wiLFxuICBWOiBcIiM5OWZmMDBcIixcbiAgQjogXCIjZmZmXCIsXG4gIFg6IFwiI2ZmZlwiLFxuICBaOiBcIiNmZmZcIlxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBOiBcIiMyY2QzZDNcIixcbiAgUjogXCIjNzA4ZjhmXCIsXG4gIE46IFwiI2ZmMDAwMFwiLFxuICBEOiBcIiNlODE3MTdcIixcbiAgQzogXCIjYTg1NzU3XCIsXG4gIFE6IFwiIzNmYzBjMFwiLFxuICBFOiBcIiM3Nzg4ODhcIixcbiAgRzogXCIjZmYwMDAwXCIsXG4gIEg6IFwiIzcwOGY4ZlwiLFxuICBJOiBcIiMwMGZmZmZcIixcbiAgTDogXCIjMWNlM2UzXCIsXG4gIEs6IFwiIzdlODE4MVwiLFxuICBNOiBcIiMxZWUxZTFcIixcbiAgRjogXCIjMWVlMWUxXCIsXG4gIFA6IFwiI2Y2MDkwOVwiLFxuICBTOiBcIiNlMTFlMWVcIixcbiAgVDogXCIjNzM4YzhjXCIsXG4gIFc6IFwiIzczOGM4Y1wiLFxuICBZOiBcIiM5ZDYyNjJcIixcbiAgVjogXCIjMDdmOGY4XCIsXG4gIEI6IFwiI2YzMGMwY1wiLFxuICBYOiBcIiM3YzgzODNcIixcbiAgWjogXCIjNWJhNGE0XCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjZmZhZmFmXCIsXG4gIFI6IFwiIzY0NjRmZlwiLFxuICBOOiBcIiMwMGZmMDBcIixcbiAgRDogXCIjZmYwMDAwXCIsXG4gIEM6IFwiI2ZmZmYwMFwiLFxuICBROiBcIiMwMGZmMDBcIixcbiAgRTogXCIjZmYwMDAwXCIsXG4gIEc6IFwiI2ZmMDBmZlwiLFxuICBIOiBcIiM2NDY0ZmZcIixcbiAgSTogXCIjZmZhZmFmXCIsXG4gIEw6IFwiI2ZmYWZhZlwiLFxuICBLOiBcIiM2NDY0ZmZcIixcbiAgTTogXCIjZmZhZmFmXCIsXG4gIEY6IFwiI2ZmYzgwMFwiLFxuICBQOiBcIiNmZjAwZmZcIixcbiAgUzogXCIjMDBmZjAwXCIsXG4gIFQ6IFwiIzAwZmYwMFwiLFxuICBXOiBcIiNmZmM4MDBcIixcbiAgWTogXCIjZmZjODAwXCIsXG4gIFY6IFwiI2ZmYWZhZlwiLFxuICBCOiBcIiNmZmZcIixcbiAgWDogXCIjZmZmXCIsXG4gIFo6IFwiI2ZmZlwiXG59O1xuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHQndXNlIHN0cmljdCc7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9IGVsc2UgaWYgKCh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB8fCB0YXJnZXQgPT0gbnVsbCkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbaV07XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmIChvcHRpb25zICE9IG51bGwpIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAobmFtZSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFtuYW1lXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbbmFtZV07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAodGFyZ2V0ID09PSBjb3B5KSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKGRlZXAgJiYgY29weSAmJiAoaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvcHkpKSkpIHtcblx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gZXh0ZW5kKGRlZXAsIGNsb25lLCBjb3B5KTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29weSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iLCJ2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpXG4sIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpXG47XG5cbmZ1bmN0aW9uIG1pbihhcnIpIHtcbiAgICByZXR1cm4gTWF0aC5taW4uYXBwbHkoTWF0aCwgYXJyKTtcbn1cblxuZnVuY3Rpb24gbWF4KGFycikge1xuICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBhcnIpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVMaW5lQ2FjaGUgKCkge1xuICAgIHZhciBsYyA9IFtdLCBpZHggPSBbXSwgbGVuID0gTVNBLm51bUNhY2hlZExpbmVzO1xuXG4gICAgdmFyIHRvID0gbnVsbDtcbiAgICBmdW5jdGlvbiB0cmltKGRpcikge1xuICAgICAgICB2YXIgYSwgYjtcbiAgICAgICAgd2hpbGUgKCAoYT1tYXgoaWR4KSkgLSAoYj1taW4oaWR4KSkgPiBsZW4pIHtcbiAgICAgICAgICAgIGkgPSBkaXIgPyBiIDogYTtcbiAgICAgICAgICAgIGRlbGV0ZSBsY1tpXTtcbiAgICAgICAgICAgIGlkeC5zcGxpY2UoaWR4LmluZGV4T2YoaSksIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbGMuc2V0ID0gZnVuY3Rpb24gKGksIHZhbCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodG8pO1xuICAgICAgICB2YXIgZGlyID0gaSA+IG1heChpZHgpID8gMSA6IDA7XG4gICAgICAgIHRoaXNbaV0gPSB2YWw7XG4gICAgICAgIGlkeC5wdXNoKGkpO1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgICAgIHRvID0gc2V0VGltZW91dCh0cmltLmJpbmQobnVsbCwgZGlyKSwgMzAwKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobGMsIHtcbiAgICAgICAgJ2xhc3REZWZpbmVkSW5kZXgnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtyZXR1cm4gbWF4KGlkeCk7fVxuICAgICAgICB9LCAnZmlyc3REZWZpbmVkSW5kZXgnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtyZXR1cm4gbWluKGlkeCk7fVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbGM7XG59XG5cblxuZnVuY3Rpb24gTVNBKHNyYykge1xuICAgIHRoaXMuc3JjID0gbnVsbDtcbiAgICB0aGlzLmhyZWYgPSBudWxsO1xuICAgIHRoaXMuc2l6ZVByb21pc2UgPSBudWxsO1xuICAgIHRoaXMubGluZUNhY2hlID0gY3JlYXRlTGluZUNhY2hlKCk7XG4gICAgdGhpcy5saW5lUHJvbWlzZXMgPSBbXTtcbiAgICB0aGlzLkxPQ0sgPSBmYWxzZTtcblxuICAgIGlmICghKC9odHRwLy50ZXN0KHNyYykpKSB7XG4gICAgICAgIHRoaXMuc3JjID0gc3JjO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaHJlZiA9IHNyYztcbiAgICB9XG59XG5cblxuLyoqIEBwcm9wIHtudW1iZXJ9IHNldCB0aGUgbnVtYmVyIG9mIGxpbmVzIHRoYXQgc2hvdWxkIGJlIGNhY2hlZCBhdCBtb3N0ICovXG5NU0EubnVtQ2FjaGVkTGluZXMgPSAzMDAwO1xuXG4vKiogQHByb3Age251bWJlcn0gc2V0IHRoZSBudW1iZXIgb2YgbGluZXMgdG8gZmV0Y2ggZWFnZXJseSAqL1xuTVNBLm51bVByZWZldGNoTGluZXMgPSAxMDAwO1xuXG4vKiogQHByb3Age251bWJlcn0gZnJhY3Rpb24gYXQgd2hpY2ggdG8gdHJpZ2dlciBwcmVmZXRjaCAqL1xuTVNBLm51bVByZWZldGNoVHJpZ2dlciA9IDAuNTtcblxuXG4vKipcbiAqIEZldGNoIGFuZCBjYWxjdWxhdGUgZGlmZmVyZW50IGFzcGVjdHMgb2YgdGhlIE1TQS5cbiAqIFJldHVybnMgdGhlIHByb21pc2Ugb2YgYW4gb2JqZWN0OlxuICogICB7XG4gKiAgICAge251bWJlcn0gc2l6ZSAgICAgICBUaGUgYnl0ZXNpemUgb2YgdGhlIHdob2xlIE1TQSBmaWxlXG4gKiAgICAge251bWJlcn0gd2lkdGggICAgICBUaGUgd2lkaHQgb2YgdGhlIE1TQSwgaS5lLiB0aGUgbGluZSBsZW5ndGhcbiAqICAgICAgICAgICAgICAgICAgICAgIG9mIHRob3NlIGxpbmVzIGFjdHVhbGx5IGNvbnRhaW5pbmcgc2VxdWVuY2VzXG4gKiAgICAge251bWJlcn0gb2Zmc2V0ICAgICBUaGUgYnl0ZSBvZmZzZXQgdG8gdGhlIGZpcnN0IHNlcXVlbmNlXG4gKiAgICAge251bWJlcn0gY291bnQgICAgICBUaGUgbnVtYmVyIG9mIHNlcXVlbmNlcyBpbiB0aGUgTVNBXG4gKiAgICAge251bWJlcn0gbGFiZWxXaWR0aCBUaGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgcmVzZXJ2ZWQgZm9yIGxhYmVsc1xuICogICAgICAgICAgICAgICAgICAgICAgaW4gZnJvbnQgb2YgdGhlIHNlcXVlbmNlc1xuICogICB9XG4gKlxuICogQHJldHVybiB7UHJvbWlzZX1cbiAqL1xuXG5NU0EucHJvdG90eXBlLmdldFNpemUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgbGluZUNhY2hlID0gdGhpcy5saW5lQ2FjaGU7XG5cbiAgICAvLyBSZXR1cm4gdGhlIHByb21pc2UgaWYgdGhlIHF1ZXJzIGhhcyBiZWVuXG4gICAgLy8gcGVyZm9ybWVkIGJlZm9yZVxuICAgIGlmICh0aGlzLnNpemVQcm9taXNlKVxuICAgICAgICByZXR1cm4gdGhpcy5zaXplUHJvbWlzZTtcblxuXG4gICAgLy8gR2V0IHRoZSBoZWFkZXJzIGZvciB0aGUgZmlsZSB0byBmaW5kIG91dCB0aGUgdG90YWxcbiAgICAvLyBmaWxlIHNpemVcbiAgICB2YXIgaGVhZFAgPSByZXF1ZXN0KHRoaXMuaHJlZiwge21ldGhvZDogJ0hFQUQnfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcSl7XG4gICAgICAgICAgICByZXR1cm4ge3NpemU6IHBhcnNlSW50KHJlcS5nZXRSZXNwb25zZUhlYWRlcignQ29udGVudC1MZW5ndGgnKSwgMTApfTtcbiAgICAgICAgfSk7XG5cbiAgICAvLyBnZXQgdGhlIGZpcnN0IDEwIGtiIHRvIGZpbmQgb3V0IHRoZSBsaW5lIHdpZHRoLCBsYWJlbCB3aWR0aFxuICAgIC8vIGFuZCBieXRlIG9mZnNldCB0byB0aGUgZmlyc3Qgc2VxdWVuY2VcbiAgICB2YXIgc3RhcnRQID0gcmVxdWVzdCh0aGlzLmhyZWYsIHtoZWFkZXJzOiB7cmFuZ2U6ICdieXRlcz0wLTEwMjQwJ319KVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgICAgICB2YXIgaSA9IDAsIGxpbmVXaWR0aCwgbGFiZWxXaWR0aCwgbGluZXMgPSByZXEucmVzcG9uc2Uuc3BsaXQoJ1xcbicpXG4gICAgICAgICAgICAsIGxPZmZzZXQgPSAxLCBvZmZzZXQgPSBsaW5lc1swXS5sZW5ndGggKyAxLCBzZXE7XG5cbiAgICAgICAgICAgIC8vIHdhbGsgZG93biB0aGUgZmlsZSwgZm9yIGVhY2ggJ2VtcHR5J1xuICAgICAgICAgICAgLy8gbGluZSBhZGQgb25lIHRvIHRoZSBvZmZzZXQsIGJlY2F1c2Ugb2YgdGhlIFxcblxuICAgICAgICAgICAgLy8gcmVtb3ZlZCBkdXJpbmcgdGhlIHNwbGl0KCdcXG4nKVxuICAgICAgICAgICAgd2hpbGUgKCFsaW5lc1srK2ldLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9mZnNldCsrO1xuICAgICAgICAgICAgICAgIGxPZmZzZXQrKztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaSBpcyBub3cgdGhlIGZpcnN0IGxpbmUgd2l0aCBhbiBhY3R1YWwgc2VxdWVuY2VcbiAgICAgICAgICAgIC8vIGFkZCBvbmUgYmVjYXVzZSBvZiB0aGUgXFxuIHdlIGxvc3QgaW4gdGhlIHNwbGl0XG4gICAgICAgICAgICBsaW5lV2lkdGggPSBsaW5lc1tpXS5sZW5ndGggKyAxO1xuICAgICAgICAgICAgbGFiZWxXaWR0aCA9IGxpbmVzW2ldLm1hdGNoKC8uKiArLylbMF0ubGVuZ3RoO1xuXG4gICAgICAgICAgICAvLyBub3cgcHVzaCB0aGUgcmVzdCBvZiB0aGUgbGluZXMgb250byB0aGUgY2FjaGVcbiAgICAgICAgICAgIC8vIGlmIHRoZXkgYXJlIHdob2xlXG4gICAgICAgICAgICB3aGlsZSAoKGxpbmVzW2ldLmxlbmd0aCArIDEpID09PSBsaW5lV2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgc2VxID0ge1xuICAgICAgICAgICAgICAgICAgICBsYWJlbDogbGluZXNbaV0uc3Vic3RyKDAsIGxhYmVsV2lkdGgpXG4gICAgICAgICAgICAgICAgICAgICwgc2VxdWVuY2U6IGxpbmVzW2ldLnN1YnN0cihsYWJlbFdpZHRoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbGluZUNhY2hlLnNldChpLWxPZmZzZXQsIHNlcSk7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGxhYmVsV2lkdGg6IGxhYmVsV2lkdGhcbiAgICAgICAgICAgICAgICAsIGxpbmVXaWR0aDogbGluZVdpZHRoXG4gICAgICAgICAgICAgICAgLCBzZXF1ZW5jZVdpZHRoOiBsaW5lV2lkdGggLSBsYWJlbFdpZHRoXG4gICAgICAgICAgICAgICAgLCBvZmZzZXQ6IG9mZnNldFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIC8vIGdldCBsYXN0IDEwa2IgdG8gZ2V0IHRoZSBhbGlnbm1lbnQgZnJvbSB0aGUgbGFzdCBsaW5lXG4gICAgdmFyIGVuZFAgPSByZXF1ZXN0KHRoaXMuaHJlZiwge2hlYWRlcnM6IHtyYW5nZTogJ2J5dGVzPS0xMDI0MCd9fSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICAgICAgdmFyIGxpbmVzID0gcmVxLnJlc3BvbnNlLnNwbGl0KCdcXG4nKVxuICAgICAgICAgICAgLCBhbG4gPSBsaW5lcy5zbGljZSgtMilbMF1cbiAgICAgICAgICAgIDtcblxuICAgICAgICAgICAgcmV0dXJuIHthbGlnbm1lbnQ6IGFsbn07XG4gICAgICAgIH0pO1xuXG4gICAgLy8gYW5kIGNvdW50IHRoZSBudW1iZXIgb2Ygc2VxdWVuY2VzXG4gICAgdGhpcy5zaXplUHJvbWlzZSA9IFByb21pc2UuYWxsKFtoZWFkUCwgc3RhcnRQLCBlbmRQXSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICAgICAgICAvLyBtZXJnZSBldmVyeXRoaW5nIGludG8gb25lIG9iamVjdFxuICAgICAgICAgICAgcHJvcHMgPSBleHRlbmQoe30sIHByb3BzWzBdLCBwcm9wc1sxXSwgcHJvcHNbMl0pO1xuXG4gICAgICAgICAgICAvLyBjYWxjdWxhdGUgc2VxdWVuY2UgY291bnQgYW5kIHdpZHRoXG4gICAgICAgICAgICBwcm9wcy5zZXF1ZW5jZUNvdW50ID0gKHByb3BzLnNpemUgLSBwcm9wcy5vZmZzZXQpIC8gcHJvcHMubGluZVdpZHRoIC0gMjtcblxuICAgICAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgICAgICB9KTtcblxuICAgIHJldHVybiB0aGlzLnNpemVQcm9taXNlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBQcm9taXNlIG9mIGEgc3RyaW5nIGNvbnRhaW5pbmdcbiAqIHRoZSBhY3R1YWwgYWxpZ25tZW50IGluZm9ybWF0aW9uXG4gKlxuICogQHJldHVybiB7UHJvbWlzZX1cbiAqL1xuXG5NU0EucHJvdG90eXBlLmdldEFsaWdubWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTaXplKCkudGhlbihmdW5jdGlvbiAocHJvcHMpIHtcbiAgICAgICAgcmV0dXJuIHByb3BzLmFsaWdubWVudDtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgUHJvbWlzZSBvZiBhbiBpbnRlZ2VyIGNvbnRhaW5pbmdcbiAqIHRoZSBzZXF1ZW5jZSBjb3VudFxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cblxuTVNBLnByb3RvdHlwZS5nZXRDb3VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTaXplKCkudGhlbihmdW5jdGlvbiAocHJvcHMpIHtcbiAgICAgICAgcmV0dXJuIHByb3BzLnNlcXVlbmNlQ291bnQ7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgUHJvbWlzZSBvZiBhIHNpbmdsZSBzZXF1ZW5jZSBvYmplY3RcbiAqIGNvbnRhaW5pbmdcbiAqIHtcbiAqICAge3N0cmluZ30gbGFiZWxcbiAqICAge3N0cmluZ30gc2VxdWVuY2VcbiAqIH1cbiAqXG4gKiBAcGFyYW0ge251bWJlcn0gbCBsaW5lIHRvIGdldCwgMC1pbmRleGVkXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5cbk1TQS5wcm90b3R5cGUuZ2V0TGluZSA9IGZ1bmN0aW9uIChsKSB7XG4gICAgdmFyIHg7XG5cbiAgICBpZiAoKHggPSB0aGlzLmxpbmVDYWNoZVtsXSkpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh4KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRMaW5lcyhsLCBsLCB0cnVlKS50aGVuKGZ1bmN0aW9uIChsaW5lcykge3JldHVybiBsaW5lc1swXTt9KTtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRoZSBQcm9taXNlIG9mIGFuIGFycmF5IG9mIHNlcXVlbmNlIG9iamVjdHNcbiAqIGNvbnRhaW5pbmdcbiAqIHtcbiAqICAge3N0cmluZ30gbGFiZWxcbiAqICAge3N0cmluZ30gc2VxdWVuY2VcbiAqIH1cbiAqXG4gKiBAcGFyYW0ge251bWJlcn0gYSAgICAgICAgICAgICAgZmlyc3QgbGluZSB0byBnZXQsIDAtaW5kZXhlZFxuICogQHBhcmFtIHtudW1iZXJ9IFtiXSAgICAgICAgICAgIGxhc3QgbGluZSB0byBnZXQsIGRlZmF1bHRzIHRvIGFcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2RvTm90UHJlZmV0Y2hdIGZsYWcgdG8gc3VwcmVzcyBwcmVmZXRjaFxuICogQHJldHVybiB7UHJvbWlzZX1cbiAqL1xuXG5NU0EucHJvdG90eXBlLmdldExpbmVzID0gZnVuY3Rpb24gKGEsIGIsIGRvTm90UHJlZmV0Y2gpIHtcbiAgICBiID0gYiB8fCBhO1xuXG4gICAgdmFyIGxpbmVDYWNoZSA9IHRoaXMubGluZUNhY2hlXG4gICAgLCBsaW5lUHJvbWlzZXMgPSB0aGlzLmxpbmVQcm9taXNlc1xuICAgICwgaHJlZiA9IHRoaXMuaHJlZlxuICAgIDtcblxuICAgIHJldHVybiB0aGlzLmdldFNpemUoKS50aGVuKGZ1bmN0aW9uIChwcm9wcykge1xuICAgICAgICB2YXIgbGFiZWxXaWR0aCA9IHByb3BzLmxhYmVsV2lkdGhcbiAgICAgICAgLCBsaW5lV2lkdGggPSBwcm9wcy5saW5lV2lkdGhcbiAgICAgICAgLCBjb3VudCA9IHByb3BzLnNlcXVlbmNlQ291bnRcbiAgICAgICAgLCBvZmZzZXQgPSBwcm9wcy5vZmZzZXRcbiAgICAgICAgLCByZXMgPSBbXSwgZmV0Y2ggPSBbXSwgd2FpdCA9IFtdXG4gICAgICAgICwgcmFuZ2UsIHgsIGksIHAsIGMsIGQsIGUsIGZcbiAgICAgICAgO1xuXG5cbiAgICAgICAgaWYgKGEgPiBjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChiID4gY291bnQpIHtcbiAgICAgICAgICAgIGIgPSBjb3VudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGdldCBsaW5lcyBmcm9tIENhY2hlIGlmIGF2YWlsYWJsZVxuICAgICAgICBmb3IgKGkgPSBhOyBpIDw9IGI7IGkrKykge1xuICAgICAgICAgICAgaWYgKCh4ID0gbGluZUNhY2hlW2ldKSkge1xuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgoeCA9IGxpbmVQcm9taXNlc1tpXSkpIHtcbiAgICAgICAgICAgICAgICBpZiAod2FpdC5pbmRleE9mKHgpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB3YWl0LnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmZXRjaC5wdXNoKGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdHJpZ2dlciBlYWdlciBwcmVmZXRjaFxuICAgICAgICBpZiAoIWRvTm90UHJlZmV0Y2ggJiYgIXRoaXMuTE9DSykge1xuICAgICAgICAgICAgZSA9IGxpbmVDYWNoZS5sYXN0RGVmaW5lZEluZGV4IC0gKE1TQS5udW1QcmVmZXRjaExpbmVzICogTVNBLm51bVByZWZldGNoVHJpZ2dlcik7XG4gICAgICAgICAgICBmID0gbGluZUNhY2hlLmZpcnN0RGVmaW5lZEluZGV4ICsgKE1TQS5udW1QcmVmZXRjaExpbmVzICogTVNBLm51bVByZWZldGNoVHJpZ2dlcik7XG5cbiAgICAgICAgICAgIGlmIChiID4gZSAmJiBsaW5lQ2FjaGUubGFzdERlZmluZWRJbmRleCA8IGNvdW50KSB7XG4gICAgICAgICAgICAgICAgLy8gcHJlZmV0Y2ggZm9yd2FyZFxuICAgICAgICAgICAgICAgIGUgPSBsaW5lQ2FjaGUubGFzdERlZmluZWRJbmRleDtcbiAgICAgICAgICAgICAgICBmID0gbWluKFtlICsgTVNBLm51bVByZWZldGNoTGluZXMsIGNvdW50XSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGEgPCBmICYmIGxpbmVDYWNoZS5maXJzdERlZmluZWRJbmRleCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBwcmVmZXRjaCBiYWNrd2FyZFxuICAgICAgICAgICAgICAgIGYgPSBsaW5lQ2FjaGUuZmlyc3REZWZpbmVkSW5kZXg7XG4gICAgICAgICAgICAgICAgZSA9IG1heChbZiAtIE1TQS5udW1QcmVmZXRjaExpbmVzLCAwXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGUgPSBmID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLkxPQ0sgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0TGluZXMoZSwgZiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuTE9DSyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgd2UgZG8gbm90IG5lZWQgdG8gZmV0Y2ggbW9yZSBsaW5lc1xuICAgICAgICAvLyBmcm9tIHRoZSByZW1vdGUgc291cmNlLCByZXR1cm4gdGhlXG4gICAgICAgIC8vIHJlc3VsdHMgbm93XG4gICAgICAgIGlmIChmZXRjaC5sZW5ndGggPT09IDAgJiYgd2FpdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmZXRjaC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBjb25zdHJ1Y3QgcmFuZ2UgcmVxdWVzdFxuICAgICAgICAgICAgYyA9IG1pbihmZXRjaCk7IGQgPSBtYXgoZmV0Y2gpO1xuXG4gICAgICAgICAgICByYW5nZSA9IFtcbiAgICAgICAgICAgICAgICBvZmZzZXQgKyBjICogbGluZVdpZHRoXG4gICAgICAgICAgICAgICAgLCBvZmZzZXQgKyAoZCsxKSAqIGxpbmVXaWR0aCAtIDJcbiAgICAgICAgICAgIF0uam9pbignLScpO1xuXG4gICAgICAgICAgICBwID0gcmVxdWVzdChocmVmLCB7aGVhZGVyczoge3JhbmdlOiAnYnl0ZXM9JyArIHJhbmdlfX0pXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXQgYWxsIHRoZSBmZXRjaGVzIGxpbmVzIG9udG8gdGhlIGxpbmVjYWNoZVxuICAgICAgICAgICAgICAgICAgICAvLyBhbmQgcHVzaCB0aGVtIHRvIHRoZSByZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICByZXEucmVzcG9uc2Uuc3BsaXQoJ1xcbicpLmZvckVhY2goZnVuY3Rpb24gKGwsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZXEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IGwuc3Vic3RyKDAsIGxhYmVsV2lkdGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLCBzZXF1ZW5jZTogbC5zdWJzdHIobGFiZWxXaWR0aClcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lQ2FjaGUuc2V0KGMraSwgc2VxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBsaW5lUHJvbWlzZXNbYytpXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB3YWl0LnB1c2gocCk7XG4gICAgICAgICAgICBmb3IgKGk9YztpIDw9ZDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGluZVByb21pc2VzW2ldID0gcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh3YWl0KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpbmVDYWNoZS5zbGljZShhLCBiKzEpO1xuICAgICAgICB9KTtcbiAgICB9LmJpbmQodGhpcykpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNU0E7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJlcXVlc3QodXJsLCBvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgcmVxLm9wZW4ob3B0Lm1ldGhvZCB8fCAnR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxLm92ZXJyaWRlTWltZVR5cGUoJ3RleHQvcGxhaW4nKTtcblxuICAgICAgICBPYmplY3Qua2V5cyhvcHQuaGVhZGVycyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoaywgb3B0LmhlYWRlcnNba10pO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlcS5zdGF0dXMgPj0gNDAwID8gcmVqZWN0KHJlcSkgOiByZXNvbHZlKHJlcSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxLnNlbmQob3B0LmRhdGEgfHwgdm9pZCAwKTtcbiAgICB9KTtcbn07XG4iXX0=
