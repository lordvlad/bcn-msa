(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./src/index.sjs":[function(require,module,exports){
var request$1308 = require('./request'), MSA$1309 = require('./MSASource'), extend$1310 = require('extend'), colorSchemeSelector$1311 = require('biojs-util-colorschemes').selector;
/**
 * Helpers
 */
var floor$1313 = Math.floor.bind(Math);
var ceil$1315 = Math.ceil.bind(Math);
function minmaxval$1317(min$1320, max$1321, val$1322) {
    if (typeof min$1320 !== 'undefined' && val$1322 < min$1320)
        return min$1320;
    if (typeof max$1321 !== 'undefined' && val$1322 > max$1321)
        return max$1321;
    return val$1322;
}
/**
 * MultiSequenceAlignment Viewer class
 */
function MSAView$1318(root$1323, options$1324) {
    window.a = this;
    var canvas$1326;
    // include default options and options from DOM dataset
    options$1324 = extend$1310({}, MSAView$1318.defaultOptions, root$1323.dataset, options$1324);
    // create canvas if not present
    if (!(canvas$1326 = root$1323.querySelector('canvas')))
        root$1323.appendChild(canvas$1326 = document.createElement('canvas'));
    if ('bcnMsaFullscreen' in options$1324)
        root$1323.style.width = root$1323.style.height = '100%';
    // set canvas proportions and hide cursor
    canvas$1326.width = root$1323.offsetWidth;
    canvas$1326.height = root$1323.offsetHeight;
    // canvas.style.cursor = 'none';
    // convenience method
    canvas$1326.on = function (__fa_args$1329, event$1330, callback$1331) {
        return canvas$1326.addEventListener(event$1330, callback$1331.bind(this));
    }.bind(this, typeof arguments !== 'undefined' ? arguments : undefined);
    // attach event handlers
    canvas$1326.on('mousewheel', this.onScroll);
    canvas$1326.on('wheel', this.onScroll);
    canvas$1326.on('mousemove', this.onPointerMove);
    canvas$1326.on('mouseout', this.onPointerOut);
    canvas$1326.on('mousedown', this.onPointerDown);
    canvas$1326.on('mouseup', this.onPointerUp);
    canvas$1326.on('contextmenu', function (__fa_args$1333, e$1334) {
        return e$1334.preventDefault();
    }.bind(this, typeof arguments !== 'undefined' ? arguments : undefined));
    this.alignment = new MSA$1309(root$1323.dataset.alignment);
    this.scrollPos = {
        x: 0,
        y: 0,
        maxX: 0,
        maxY: 0
    };
    this.ctx = canvas$1326.getContext('2d');
    this.ctx.font = options$1324.font;
    this.draw = this.draw.bind(this);
    this.render = this.draw.bind(this);
    this.colorScheme = colorSchemeSelector$1311.getColor(options$1324.colorScheme);
    this.options = options$1324;
    this.canvas = canvas$1326;
    this.mousePos = null;
    this.LOCK = false;
    this.view = null;
    this.updateView();
    requestAnimationFrame(this.draw);
}
MSAView$1318.prototype.updateView = function updateView() {
    if (this.LOCK)
        return this.LOCK;
    if (!this.view)
        return Promise.resolve();
    var cvs$1337 = this.canvas, aln$1338 = this.alignment, opt$1339 = this.options, view$1340 = this.view, scroll$1341 = this.scrollPos, em$1342 = view$1340.charWidth + opt$1339.letterSpacing, H$1343 = cvs$1337.clientHeight, W$1344 = cvs$1337.clientWidth;
    return this.LOCK = Promise.all([
        aln$1338.getLines(view$1340.offsetY, view$1340.offsetY + view$1340.height),
        aln$1338.getSize()
    ]).then(function (res$1345) {
        view$1340.tracks = res$1345[0];
        view$1340.alignment = res$1345[1].alignment;
        view$1340.count = res$1345[1].sequenceCount;
        view$1340.sequenceWidth = res$1345[1].sequenceWidth;
        scroll$1341.maxX = floor$1313(view$1340.sequenceWidth * em$1342) - W$1344 + opt$1339.labelWidth + opt$1339.leftMargin;
        scroll$1341.maxY = (res$1345[1].sequenceCount - view$1340.height) * opt$1339.lineHeight - H$1343;
        view$1340.lastOffsetY = view$1340.offsetY;
        this.LOCK = false;
    }.bind(this));
};
MSAView$1318.prototype.onScroll = function onScroll(e$1346) {
    if (this.LOCK)
        return;
    var s$1349 = this.scrollPos, dx$1350 = e$1346.deltaX || -e$1346.wheelDeltaX, dy$1351 = e$1346.deltaY || -e$1346.wheelDeltaY;
    s$1349.x = floor$1313(minmaxval$1317(0, s$1349.maxX, s$1349.x + dx$1350));
    s$1349.y = floor$1313(minmaxval$1317(0, s$1349.maxY, s$1349.y + dy$1351));
};
MSAView$1318.prototype.onPointerOut = function onPointerOut() {
    this.mousePos = null;
};
MSAView$1318.prototype.onPointerMove = function onPointerMove(e$1352) {
    var r$1354 = this.canvas.getBoundingClientRect(), m$1355 = this.mousePos || {};
    this.mousePos = {
        left: m$1355.left,
        right: m$1355.right,
        middle: m$1355.middle,
        y: e$1352.clientY - r$1354.top,
        x: e$1352.clientX - r$1354.left
    };
};
MSAView$1318.prototype.onPointerDown = function onPointerDown(e$1356) {
    var m$1358 = this.mousePos;
    if (!m$1358)
        return;
    switch (e$1356.which) {
    case 1:
        m$1358.left = true;
        break;
    case 3:
        m$1358.right = true;
        break;
    case 2:
        m$1358.middle = true;
        break;
    }
    if (m$1358.middle)
        this.scrollPos.pan = {
            x: m$1358.x,
            y: m$1358.y
        };
    if (m$1358.left)
        this.view.mark = {
            sx: m$1358.sx,
            sy: m$1358.sy
        };
};
MSAView$1318.prototype.onPointerUp = function onPointerUp(e$1359) {
    var m$1361 = this.mousePos;
    if (m$1361.middle)
        this.scrollPos.pan = null;
    switch (e$1359.which) {
    case 1:
        m$1361.left = false;
        break;
    case 3:
        m$1361.right = false;
        break;
    case 2:
        m$1361.middle = false;
        break;
    }
};
MSAView$1318.prototype.draw = function draw(t$1362) {
    var cvs$1364 = this.canvas, ctx$1365 = this.ctx, opt$1366 = this.options, view$1367 = this.view, lock$1368 = this.LOCK, mouse$1369 = this.mousePos, scroll$1370 = this.scrollPos, col$1371 = this.colorScheme, em$1372 = view$1367 && view$1367.charWidth + opt$1366.letterSpacing, charWidth$1373 = view$1367 && view$1367.charWidth, H$1374 = cvs$1364.clientHeight, W$1375 = cvs$1364.clientWidth, lineHeight$1376 = opt$1366.lineHeight, letterSpacing$1377 = opt$1366.letterSpacing, labelWidth$1378 = opt$1366.labelWidth, leftMargin$1379 = opt$1366.leftMargin;
    if (!view$1367) {
        view$1367 = this.view = { tracks: [] };
        charWidth$1373 = view$1367.charWidth = ceil$1315(ctx$1365.measureText('x').width);
        em$1372 = view$1367.charWidth + letterSpacing$1377;
        view$1367.height = floor$1313(H$1374 / lineHeight$1376) - 4;
        view$1367.seqOffset = labelWidth$1378 + letterSpacing$1377 + leftMargin$1379;
        view$1367.labelTruncate = floor$1313((labelWidth$1378 - leftMargin$1379) / charWidth$1373);
    }
    // check mouse middle button scroll
    if (mouse$1369 && mouse$1369.middle) {
        var dx$1382 = (mouse$1369.x - scroll$1370.pan.x) / 10, dy$1383 = (mouse$1369.y - scroll$1370.pan.y) / 10;
        scroll$1370.x = floor$1313(minmaxval$1317(0, scroll$1370.maxX, scroll$1370.x + dx$1382));
        scroll$1370.y = floor$1313(minmaxval$1317(0, scroll$1370.maxY, scroll$1370.y + dy$1383));
    }
    view$1367.offsetX = floor$1313(scroll$1370.x / em$1372);
    view$1367.offsetY = floor$1313(scroll$1370.y / lineHeight$1376);
    // get mouse coordinates relative to sequence and
    // aminoacid position
    if (mouse$1369) {
        mouse$1369.sx = floor$1313((mouse$1369.x - view$1367.seqOffset) / em$1372) + view$1367.offsetX;
        mouse$1369.sy = floor$1313(mouse$1369.y / lineHeight$1376) - 2 + view$1367.offsetY;
    }
    // maybe we need to fetch new lines from the underlying source
    if (!lock$1368 && view$1367.offsetY !== view$1367.lastOffsetY)
        this.updateView();
    // clear canvas
    ctx$1365.clearRect(0, 0, W$1375, H$1374);
    // loading text
    if (lock$1368)
        ctx$1365.fillText(opt$1366.loadingText, leftMargin$1379, lineHeight$1376);
    // ruler
    {
        var y$1386 = lineHeight$1376 * 2, x$1387 = view$1367.seqOffset, i$1388 = view$1367.offsetX + 1;
        while (x$1387 < W$1375) {
            if (i$1388 % 10 === 0 || i$1388 === 1)
                ctx$1365.fillText(i$1388 + '', x$1387, y$1386);
            else if (i$1388 % 5 === 0)
                ctx$1365.fillText('.', x$1387, y$1386);
            i$1388 += 1;
            x$1387 += em$1372;
        }
    }
    // tracks
    if (view$1367 && view$1367.tracks) {
        var bgW$1391 = em$1372 + 2, bgH$1392 = lineHeight$1376 + 2, bgX$1393 = -em$1372 / 4, bgY$1394 = -lineHeight$1376 * 4 / 5, m$1395 = mouse$1369;
        view$1367.tracks.forEach(function (t$1396, i$1397) {
            var y$1400 = (i$1397 + 3) * lineHeight$1376, x$1401 = view$1367.seqOffset, j$1402 = view$1367.offsetX, s$1403 = t$1396.sequence, l$1404 = t$1396.label;
            // sequence
            while (x$1401 < W$1375) {
                var a$1407 = s$1403[j$1402];
                if ((aa = s$1403[j$1402]) !== '-' && col$1371[aa]) {
                    ctx$1365.beginPath();
                    ctx$1365.fillStyle = col$1371[aa];
                    ctx$1365.strokeStyle = col$1371[aa];
                    ctx$1365.rect(x$1401 + bgX$1393, y$1400 + bgY$1394, em$1372, lineHeight$1376);
                    ctx$1365.fill();
                    ctx$1365.stroke();
                    ctx$1365.closePath();
                    ctx$1365.fillStyle = 'black';
                }
                ctx$1365.fillText(aa, x$1401, y$1400);
                j$1402 += 1;
                x$1401 += em$1372;
            }
            // label
            if (m$1395 && mouse$1369.sx < view$1367.offsetX && mouse$1369.sy === view$1367.offsetY + i$1397) {
                ctx$1365.save();
                ctx$1365.fillStyle = 'rgb(255, 255, 255)';
                ctx$1365.fillRect(leftMargin$1379, y$1400 - lineHeight$1376 + 2, W$1375, lineHeight$1376 + 4);
                ctx$1365.restore();
            } else {
                l$1404 = l$1404.substr(0, view$1367.labelTruncate) + '...';
            }
            ctx$1365.fillText(l$1404, leftMargin$1379, y$1400);
        });
    }
    if (mouse$1369) {
        var r$1410 = mouse$1369.left || mouse$1369.right || mouse$1369.middle ? 6 : 4;
        // info line
        if (view$1367.tracks && view$1367.tracks[mouse$1369.sy]) {
            var seq$1413 = view$1367.tracks[mouse$1369.sy], pos$1414 = seq$1413.sequence[mouse$1369.sx];
            if (pos$1414 && pos$1414 !== '-') {
                pos$1414 += seq$1413.sequence.substr(0, mouse$1369.sx).replace(/-/g, '').length + 1;
                ctx$1365.fillText(pos$1414, view$1367.seqOffset, lineHeight$1376);
            }
            ctx$1365.fillText(seq$1413.label, view$1367.seqOffset + 6 * charWidth$1373, lineHeight$1376);
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
function fillCircle$1319(x$1415, y$1416, r$1417, ctx$1418) {
    ctx$1418.beginPath();
    ctx$1418.arc(x$1415, y$1416, r$1417, 0, Math.PI * 2);
    ctx$1418.fill();
    ctx$1418.closePath();
}
MSAView$1318.create = function (options$1419, domNode$1420) {
    return new MSAView$1318(domNode$1420, options$1419);
};
MSAView$1318.defaultOptions = {
    font: '12px monospace',
    lineHeight: 14,
    labelWidth: 100,
    leftMargin: 20,
    letterSpacing: 8,
    cursorColor: 'rgba(128, 128, 128, 0.2)',
    loadingText: 'loading...',
    colorScheme: 'clustal2'
};
if (typeof define === 'function' && define.amd) {
    // require.js module
    define(MSAView$1318);
} else {
    // Browser globals
    window.MSAView = MSAView$1318;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS93cmUvZGV2L2pzL21zYS9zcmMvaW5kZXguc2pzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9idXJpZWQuanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL2NpbmVtYS5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvY2x1c3RhbC5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvY2x1c3RhbDIuanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL2hlbGl4LmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9oeWRyb3Bob2JpY2l0eS5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL2xlc2suanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL21hZS5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvbnVjbGVvdGlkZS5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvcHVyaW5lLmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy9zZWxlY3Rvci5qcyIsIm5vZGVfbW9kdWxlcy9iaW9qcy11dGlsLWNvbG9yc2NoZW1lcy9zcmMvc3RyYW5kLmpzIiwibm9kZV9tb2R1bGVzL2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzL3NyYy90YXlsb3IuanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL3R1cm4uanMiLCJub2RlX21vZHVsZXMvYmlvanMtdXRpbC1jb2xvcnNjaGVtZXMvc3JjL3phcHBvLmpzIiwibm9kZV9tb2R1bGVzL2V4dGVuZC9pbmRleC5qcyIsInNyYy9NU0FTb3VyY2UuanMiLCJzcmMvcmVxdWVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ3dVSSxJQXhVQSxZQUFBLEdBQVUsT0FBQSxDQUFRLFdBQVIsQ0F3VVYsRUF2VUYsUUFBQSxHQUFNLE9BQUEsQ0FBUSxhQUFSLENBdVVKLEVBdFVGLFdBQUEsR0FBUyxPQUFBLENBQVEsUUFBUixDQXNVUCxFQXJVRix3QkFBQSxHQUFzQixPQUFBLENBQVEseUJBQVIsRUFBbUMsUUFxVXZELENBeFVKO0FBd1VJO0FBQUE7QUFBQTtBQUFBLElBOVRBLFVBQUEsR0FBUSxJQUFBLENBQUssS0FBTCxDQUFXLElBQVgsQ0FBZ0IsSUFBaEIsQ0E4VFIsQ0F4VUo7QUF3VUksSUE3VEEsU0FBQSxHQUFPLElBQUEsQ0FBSyxJQUFMLENBQVUsSUFBVixDQUFlLElBQWYsQ0E2VFAsQ0F4VUo7QUFhQSxTQUFTLGNBQVQsQ0FBbUIsUUFBbkIsRUFBd0IsUUFBeEIsRUFBNkIsUUFBN0IsRUFBa0M7QUFBQSxJQUM5QixJQUFJLE9BQU8sUUFBUCxLQUFlLFdBQWYsSUFBOEIsUUFBQSxHQUFNLFFBQXhDO0FBQUEsUUFBNkMsT0FBTyxRQUFQLENBRGY7QUFBQSxJQUU5QixJQUFJLE9BQU8sUUFBUCxLQUFlLFdBQWYsSUFBOEIsUUFBQSxHQUFNLFFBQXhDO0FBQUEsUUFBNkMsT0FBTyxRQUFQLENBRmY7QUFBQSxJQUc5QixPQUFPLFFBQVAsQ0FIOEI7QUFBQSxDQWJsQztBQTJLUTtBQUFBO0FBQUE7QUFBQSxTQXBKRixZQW9KRSxDQWpJUyxTQWlJVCxFQWpJZSxZQWlJZixFQWpJd0I7QUFBQSxJQUV4QixNQUFBLENBQU8sQ0FB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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpXG4sIE1TQSA9IHJlcXVpcmUoJy4vTVNBU291cmNlJylcbiwgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJylcbiwgY29sb3JTY2hlbWVTZWxlY3RvciA9IHJlcXVpcmUoJ2Jpb2pzLXV0aWwtY29sb3JzY2hlbWVzJykuc2VsZWN0b3JcbjtcblxuLyoqXG4gKiBIZWxwZXJzXG4gKi9cblxudmFyIGZsb29yID0gTWF0aC5mbG9vci5iaW5kKE1hdGgpO1xudmFyIGNlaWwgPSBNYXRoLmNlaWwuYmluZChNYXRoKTtcblxuZnVuY3Rpb24gbWlubWF4dmFsKG1pbiwgbWF4LCB2YWwpIHtcbiAgICBpZiAodHlwZW9mIG1pbiAhPT0gJ3VuZGVmaW5lZCcgJiYgdmFsIDwgbWluKSByZXR1cm4gbWluO1xuICAgIGlmICh0eXBlb2YgbWF4ICE9PSAndW5kZWZpbmVkJyAmJiB2YWwgPiBtYXgpIHJldHVybiBtYXg7XG4gICAgcmV0dXJuIHZhbDtcbn1cblxuLyoqXG4gKiBNdWx0aVNlcXVlbmNlQWxpZ25tZW50IFZpZXdlciBjbGFzc1xuICovXG5cbmNsYXNzIE1TQVZpZXcgIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBNdXRsaVNlcXVlbmNlQWxpZ25tZW50IFZpZXdlclxuICAgICAqIE9wdGlvbnMgaW5jbHVkZVxuICAgICAqICAgICBmb250OiB7c3RyaW5nfSBsaWtlICcxMnB4IG1vbm9zcGFjZSdcbiAgICAgKiAgICAgbGluZUhlaWdodDoge2ludH1cbiAgICAgKiAgICAgbGFiZWxXaWR0aDoge2ludH1cbiAgICAgKiAgICAgbGVmdE1hcmdpbjoge2ludH1cbiAgICAgKiAgICAgbGV0dGVyU3BhY2luZzoge2ludH1cbiAgICAgKiAgICAgY3Vyc29yQ29sb3I6IHtzdHJpbmd9IGxpa2UgJ3JnYmEoMTI4LCAxMjgsIDEyOCwgMC4yKSdcbiAgICAgKiAgICAgbG9hZGluZ1RleHQ6IHtzdHJpbmd9XG4gICAgICogICAgIGNvbG9yU2NoZW1lOiB7c3RyaW5nfSBwcm92aWRlZCBieSBiaW9qcy11dGlsLWNvbG9yc2NoZW1lc1xuICAgICAqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHtET01Ob2RlfSByb290XG4gICAgICogQHBhcmFtIHtvYmplY3R9ICBvcHRpb25zXG4gICAgICovXG5cbiAgICBjb25zdHJ1Y3RvciAocm9vdCwgb3B0aW9ucykge1xuXG4gICAgICAgIHdpbmRvdy5hID0gdGhpcztcblxuICAgICAgICB2YXIgY2FudmFzO1xuXG4gICAgICAgIC8vIGluY2x1ZGUgZGVmYXVsdCBvcHRpb25zIGFuZCBvcHRpb25zIGZyb20gRE9NIGRhdGFzZXRcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZCh7fSwgTVNBVmlldy5kZWZhdWx0T3B0aW9ucywgcm9vdC5kYXRhc2V0LCBvcHRpb25zKTtcblxuICAgICAgICAvLyBjcmVhdGUgY2FudmFzIGlmIG5vdCBwcmVzZW50XG4gICAgICAgIGlmICghKGNhbnZhcyA9IHJvb3QucXVlcnlTZWxlY3RvcignY2FudmFzJykpKVxuICAgICAgICAgICAgcm9vdC5hcHBlbmRDaGlsZChjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSk7XG5cbiAgICAgICAgaWYgKCdiY25Nc2FGdWxsc2NyZWVuJyBpbiBvcHRpb25zKVxuICAgICAgICAgICAgcm9vdC5zdHlsZS53aWR0aCA9IHJvb3Quc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xuXG4gICAgICAgIC8vIHNldCBjYW52YXMgcHJvcG9ydGlvbnMgYW5kIGhpZGUgY3Vyc29yXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHJvb3Qub2Zmc2V0V2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSByb290Lm9mZnNldEhlaWdodDtcbiAgICAgICAgLy8gY2FudmFzLnN0eWxlLmN1cnNvciA9ICdub25lJztcblxuICAgICAgICAvLyBjb252ZW5pZW5jZSBtZXRob2RcbiAgICAgICAgY2FudmFzLm9uID0gKGV2ZW50LCBjYWxsYmFjaykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBjYWxsYmFjay5iaW5kKHRoaXMpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBhdHRhY2ggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgY2FudmFzLm9uKCdtb3VzZXdoZWVsJywgdGhpcy5vblNjcm9sbCk7XG4gICAgICAgIGNhbnZhcy5vbignd2hlZWwnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICAgICAgY2FudmFzLm9uKCdtb3VzZW1vdmUnLCB0aGlzLm9uUG9pbnRlck1vdmUpO1xuICAgICAgICBjYW52YXMub24oJ21vdXNlb3V0JywgdGhpcy5vblBvaW50ZXJPdXQpO1xuICAgICAgICBjYW52YXMub24oJ21vdXNlZG93bicsIHRoaXMub25Qb2ludGVyRG93bik7XG4gICAgICAgIGNhbnZhcy5vbignbW91c2V1cCcsIHRoaXMub25Qb2ludGVyVXApO1xuICAgICAgICBjYW52YXMub24oJ2NvbnRleHRtZW51JywgZSA9PiBlLnByZXZlbnREZWZhdWx0KCkgKTtcblxuICAgICAgICB0aGlzLmFsaWdubWVudCA9IG5ldyBNU0Eocm9vdC5kYXRhc2V0LmFsaWdubWVudCk7XG4gICAgICAgIHRoaXMuc2Nyb2xsUG9zID0ge3g6IDAsIHk6IDAsIG1heFg6IDAsIG1heFk6IDB9O1xuICAgICAgICB0aGlzLmN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICB0aGlzLmN0eC5mb250ID0gb3B0aW9ucy5mb250O1xuICAgICAgICB0aGlzLmRyYXcgPSB0aGlzLmRyYXcuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yZW5kZXIgPSB0aGlzLmRyYXcuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5jb2xvclNjaGVtZSA9IGNvbG9yU2NoZW1lU2VsZWN0b3IuZ2V0Q29sb3Iob3B0aW9ucy5jb2xvclNjaGVtZSk7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgICAgICB0aGlzLm1vdXNlUG9zID0gbnVsbDtcbiAgICAgICAgdGhpcy5MT0NLID0gZmFsc2U7XG4gICAgICAgIHRoaXMudmlldyA9IG51bGw7XG4gICAgICAgIHRoaXMudXBkYXRlVmlldygpO1xuXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmRyYXcpO1xuICAgIH1cblxuICAgIHVwZGF0ZVZpZXcgKCkge1xuXG4gICAgICAgIGlmICh0aGlzLkxPQ0spXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5MT0NLO1xuXG4gICAgICAgIGlmICghKHRoaXMudmlldykpXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cblxuICAgICAgICB2YXIgY3ZzID0gdGhpcy5jYW52YXNcbiAgICAgICAgLCBhbG4gPSB0aGlzLmFsaWdubWVudFxuICAgICAgICAsIG9wdCA9IHRoaXMub3B0aW9uc1xuICAgICAgICAsIHZpZXcgPSB0aGlzLnZpZXdcbiAgICAgICAgLCBzY3JvbGwgPSB0aGlzLnNjcm9sbFBvc1xuICAgICAgICAsIGVtID0gdmlldy5jaGFyV2lkdGggKyBvcHQubGV0dGVyU3BhY2luZ1xuICAgICAgICAsIEggPSBjdnMuY2xpZW50SGVpZ2h0LCBXID0gY3ZzLmNsaWVudFdpZHRoXG4gICAgICAgIDtcblxuICAgICAgICByZXR1cm4gKHRoaXMuTE9DSyA9IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIGFsbi5nZXRMaW5lcyh2aWV3Lm9mZnNldFksIHZpZXcub2Zmc2V0WSArIHZpZXcuaGVpZ2h0KVxuICAgICAgICAgICAgLCBhbG4uZ2V0U2l6ZSgpXG4gICAgICAgIF0pLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXG4gICAgICAgICAgICB2aWV3LnRyYWNrcyA9IHJlc1swXTtcbiAgICAgICAgICAgIHZpZXcuYWxpZ25tZW50ID0gcmVzWzFdLmFsaWdubWVudDtcbiAgICAgICAgICAgIHZpZXcuY291bnQgPSByZXNbMV0uc2VxdWVuY2VDb3VudDtcbiAgICAgICAgICAgIHZpZXcuc2VxdWVuY2VXaWR0aCA9IHJlc1sxXS5zZXF1ZW5jZVdpZHRoO1xuXG4gICAgICAgICAgICBzY3JvbGwubWF4WCA9IGZsb29yKHZpZXcuc2VxdWVuY2VXaWR0aCAqIGVtKVxuICAgICAgICAgICAgICAgIC0gVyArIG9wdC5sYWJlbFdpZHRoICsgb3B0LmxlZnRNYXJnaW47XG4gICAgICAgICAgICBzY3JvbGwubWF4WSA9IChyZXNbMV0uc2VxdWVuY2VDb3VudCAtIHZpZXcuaGVpZ2h0KVxuICAgICAgICAgICAgICAgICogb3B0LmxpbmVIZWlnaHQgLSBIO1xuXG4gICAgICAgICAgICB2aWV3Lmxhc3RPZmZzZXRZID0gdmlldy5vZmZzZXRZO1xuICAgICAgICAgICAgdGhpcy5MT0NLID0gZmFsc2U7XG4gICAgICAgIH0uYmluZCh0aGlzKSkpO1xuICAgIH1cblxuICAgIG9uU2Nyb2xsIChlKSB7XG4gICAgICAgIGlmICh0aGlzLkxPQ0spXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIHMgPSB0aGlzLnNjcm9sbFBvc1xuICAgICAgICAsIGR4ID0gZS5kZWx0YVggfHwgLWUud2hlZWxEZWx0YVhcbiAgICAgICAgLCBkeSA9IGUuZGVsdGFZIHx8IC1lLndoZWVsRGVsdGFZXG4gICAgICAgIDtcblxuICAgICAgICBzLnggPSBmbG9vcihtaW5tYXh2YWwoMCwgcy5tYXhYLCBzLnggKyBkeCkpO1xuICAgICAgICBzLnkgPSBmbG9vcihtaW5tYXh2YWwoMCwgcy5tYXhZLCBzLnkgKyBkeSkpO1xuICAgIH1cblxuICAgIG9uUG9pbnRlck91dCAoKSB7XG4gICAgICAgIHRoaXMubW91c2VQb3MgPSBudWxsO1xuICAgIH1cblxuICAgIG9uUG9pbnRlck1vdmUgKGUpIHtcbiAgICAgICAgdmFyIHIgPSB0aGlzLmNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuICAgICAgICAsIG0gPSB0aGlzLm1vdXNlUG9zIHx8IHt9XG4gICAgICAgIDtcblxuICAgICAgICB0aGlzLm1vdXNlUG9zID0ge1xuICAgICAgICAgICAgbGVmdDogbS5sZWZ0XG4gICAgICAgICAgICAsIHJpZ2h0OiBtLnJpZ2h0XG4gICAgICAgICAgICAsIG1pZGRsZTogbS5taWRkbGVcbiAgICAgICAgICAgICwgeTogZS5jbGllbnRZIC0gci50b3BcbiAgICAgICAgICAgICwgeDogZS5jbGllbnRYIC0gci5sZWZ0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgb25Qb2ludGVyRG93biAoZSkge1xuICAgICAgICB2YXIgbSA9IHRoaXMubW91c2VQb3M7XG5cbiAgICAgICAgaWYgKCFtKSByZXR1cm47XG5cbiAgICAgICAgc3dpdGNoIChlLndoaWNoKSB7XG4gICAgICAgIGNhc2UgMTogbS5sZWZ0ID0gdHJ1ZTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMzogbS5yaWdodCA9IHRydWU7IGJyZWFrO1xuICAgICAgICBjYXNlIDI6IG0ubWlkZGxlID0gdHJ1ZTsgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobS5taWRkbGUpXG4gICAgICAgICAgICB0aGlzLnNjcm9sbFBvcy5wYW4gPSB7eDogbS54LCB5OiBtLnl9O1xuXG4gICAgICAgIGlmIChtLmxlZnQpXG4gICAgICAgICAgICB0aGlzLnZpZXcubWFyayA9IHtzeDogbS5zeCwgc3k6IG0uc3l9O1xuXG4gICAgfVxuXG4gICAgb25Qb2ludGVyVXAgKGUpIHtcbiAgICAgICAgdmFyIG0gPSB0aGlzLm1vdXNlUG9zO1xuXG4gICAgICAgIGlmIChtLm1pZGRsZSlcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsUG9zLnBhbiA9IG51bGw7XG5cbiAgICAgICAgc3dpdGNoIChlLndoaWNoKSB7XG4gICAgICAgIGNhc2UgMTogbS5sZWZ0ID0gZmFsc2U7IGJyZWFrO1xuICAgICAgICBjYXNlIDM6IG0ucmlnaHQgPSBmYWxzZTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMjogbS5taWRkbGUgPSBmYWxzZTsgYnJlYWs7XG4gICAgICAgIH1cblxuXG4gICAgfVxuXG4gICAgZHJhdyAodCkge1xuXG4gICAgICAgIHZhciBjdnMgPSB0aGlzLmNhbnZhc1xuICAgICAgICAsIGN0eCA9IHRoaXMuY3R4XG4gICAgICAgICwgb3B0ID0gdGhpcy5vcHRpb25zXG4gICAgICAgICwgdmlldyA9IHRoaXMudmlld1xuICAgICAgICAsIGxvY2sgPSB0aGlzLkxPQ0tcbiAgICAgICAgLCBtb3VzZSA9IHRoaXMubW91c2VQb3NcbiAgICAgICAgLCBzY3JvbGwgPSB0aGlzLnNjcm9sbFBvc1xuICAgICAgICAsIGNvbCA9IHRoaXMuY29sb3JTY2hlbWVcbiAgICAgICAgLCBlbSA9IHZpZXcgJiYgKHZpZXcuY2hhcldpZHRoICsgb3B0LmxldHRlclNwYWNpbmcpXG4gICAgICAgICwgY2hhcldpZHRoID0gdmlldyAmJiB2aWV3LmNoYXJXaWR0aFxuICAgICAgICAsIEggPSBjdnMuY2xpZW50SGVpZ2h0LCBXID0gY3ZzLmNsaWVudFdpZHRoXG4gICAgICAgICwgbGluZUhlaWdodCA9IG9wdC5saW5lSGVpZ2h0XG4gICAgICAgICwgbGV0dGVyU3BhY2luZyA9IG9wdC5sZXR0ZXJTcGFjaW5nXG4gICAgICAgICwgbGFiZWxXaWR0aCA9IG9wdC5sYWJlbFdpZHRoXG4gICAgICAgICwgbGVmdE1hcmdpbiA9IG9wdC5sZWZ0TWFyZ2luXG4gICAgICAgIDtcblxuICAgICAgICBpZiAoIXZpZXcpIHtcbiAgICAgICAgICAgIHZpZXcgPSB0aGlzLnZpZXcgPSB7dHJhY2tzOiBbXX07XG4gICAgICAgICAgICBjaGFyV2lkdGggPSB2aWV3LmNoYXJXaWR0aCA9IGNlaWwoY3R4Lm1lYXN1cmVUZXh0KCd4Jykud2lkdGgpO1xuICAgICAgICAgICAgZW0gPSB2aWV3LmNoYXJXaWR0aCArIGxldHRlclNwYWNpbmc7XG4gICAgICAgICAgICB2aWV3LmhlaWdodCA9IGZsb29yKEggLyBsaW5lSGVpZ2h0KSAtIDQ7XG4gICAgICAgICAgICB2aWV3LnNlcU9mZnNldCA9IGxhYmVsV2lkdGggKyBsZXR0ZXJTcGFjaW5nICsgbGVmdE1hcmdpbjtcbiAgICAgICAgICAgIHZpZXcubGFiZWxUcnVuY2F0ZSA9IGZsb29yKChsYWJlbFdpZHRoIC0gbGVmdE1hcmdpbikgLyBjaGFyV2lkdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hlY2sgbW91c2UgbWlkZGxlIGJ1dHRvbiBzY3JvbGxcbiAgICAgICAgaWYgKG1vdXNlICYmIG1vdXNlLm1pZGRsZSkge1xuICAgICAgICAgICAgbGV0IGR4ID0gKG1vdXNlLnggLSBzY3JvbGwucGFuLngpIC8gMTBcbiAgICAgICAgICAgICwgZHkgPSAobW91c2UueSAtIHNjcm9sbC5wYW4ueSkgLyAxMFxuICAgICAgICAgICAgO1xuXG4gICAgICAgICAgICBzY3JvbGwueCA9IGZsb29yKG1pbm1heHZhbCgwLCBzY3JvbGwubWF4WCwgc2Nyb2xsLnggKyBkeCkpO1xuICAgICAgICAgICAgc2Nyb2xsLnkgPSBmbG9vcihtaW5tYXh2YWwoMCwgc2Nyb2xsLm1heFksIHNjcm9sbC55ICsgZHkpKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgdmlldy5vZmZzZXRYID0gZmxvb3Ioc2Nyb2xsLnggLyBlbSk7XG4gICAgICAgIHZpZXcub2Zmc2V0WSA9IGZsb29yKHNjcm9sbC55IC8gbGluZUhlaWdodCk7XG5cbiAgICAgICAgLy8gZ2V0IG1vdXNlIGNvb3JkaW5hdGVzIHJlbGF0aXZlIHRvIHNlcXVlbmNlIGFuZFxuICAgICAgICAvLyBhbWlub2FjaWQgcG9zaXRpb25cbiAgICAgICAgaWYgKG1vdXNlKSB7XG4gICAgICAgICAgICBtb3VzZS5zeCA9IGZsb29yKChtb3VzZS54IC0gdmlldy5zZXFPZmZzZXQpIC8gZW0pICsgdmlldy5vZmZzZXRYO1xuICAgICAgICAgICAgbW91c2Uuc3kgPSBmbG9vcihtb3VzZS55IC8gbGluZUhlaWdodCkgLSAyICsgdmlldy5vZmZzZXRZO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbWF5YmUgd2UgbmVlZCB0byBmZXRjaCBuZXcgbGluZXMgZnJvbSB0aGUgdW5kZXJseWluZyBzb3VyY2VcbiAgICAgICAgaWYgKCFsb2NrICYmICh2aWV3Lm9mZnNldFkgIT09IHZpZXcubGFzdE9mZnNldFkpKVxuICAgICAgICAgICAgdGhpcy51cGRhdGVWaWV3KCk7XG5cbiAgICAgICAgLy8gY2xlYXIgY2FudmFzXG4gICAgICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgVywgSCk7XG5cbiAgICAgICAgLy8gbG9hZGluZyB0ZXh0XG4gICAgICAgIGlmIChsb2NrKVxuICAgICAgICAgICAgY3R4LmZpbGxUZXh0KG9wdC5sb2FkaW5nVGV4dCwgbGVmdE1hcmdpbiwgbGluZUhlaWdodCk7XG5cblxuICAgICAgICAvLyBydWxlclxuICAgICAgICB7XG4gICAgICAgICAgICBsZXQgeSA9IGxpbmVIZWlnaHQgKiAyLCB4ID0gdmlldy5zZXFPZmZzZXQsIGkgPSB2aWV3Lm9mZnNldFggKyAxO1xuICAgICAgICAgICAgd2hpbGUgKHggPCBXKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgJSAxMCA9PT0gMCB8fCBpID09PSAxKVxuICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFRleHQoaSsnJywgeCwgeSk7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaSAlIDUgPT09IDApXG4gICAgICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dCgnLicsIHgsIHkpO1xuXG4gICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIHggKz0gZW07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIHRyYWNrc1xuICAgICAgICBpZiAodmlldyAmJiB2aWV3LnRyYWNrcykge1xuICAgICAgICAgICAgbGV0IGJnVyA9IGVtICsgMiwgYmdIID0gbGluZUhlaWdodCArIDJcbiAgICAgICAgICAgICwgYmdYID0gLWVtLzQsIGJnWSA9IC1saW5lSGVpZ2h0ICogNC81XG4gICAgICAgICAgICAsIG0gPSBtb3VzZVxuICAgICAgICAgICAgO1xuXG4gICAgICAgICAgICB2aWV3LnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uICh0LCBpKSB7XG5cbiAgICAgICAgICAgICAgICBsZXQgeSA9IChpICsgMykgKiBsaW5lSGVpZ2h0LCB4ID0gdmlldy5zZXFPZmZzZXRcbiAgICAgICAgICAgICAgICAsIGogPSB2aWV3Lm9mZnNldFgsIHMgPSAgdC5zZXF1ZW5jZSwgbCA9IHQubGFiZWxcbiAgICAgICAgICAgICAgICA7XG5cbiAgICAgICAgICAgICAgICAvLyBzZXF1ZW5jZVxuICAgICAgICAgICAgICAgIHdoaWxlICh4IDwgVykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYSA9IHNbal07XG4gICAgICAgICAgICAgICAgICAgIGlmICgoYWEgPSBzW2pdKSAhPT0gJy0nICYmIGNvbFthYV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSBjb2xbYWFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gY29sW2FhXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5yZWN0KHggKyBiZ1gsIHkgKyBiZ1ksIGVtLCBsaW5lSGVpZ2h0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5maWxsKCk7IGN0eC5zdHJva2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnYmxhY2snO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dChhYSwgeCwgeSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaiArPSAxO1xuICAgICAgICAgICAgICAgICAgICB4ICs9IGVtO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGxhYmVsXG4gICAgICAgICAgICAgICAgaWYgKG0gJiYgKG1vdXNlLnN4IDwgdmlldy5vZmZzZXRYKSAmJiBtb3VzZS5zeSA9PT0gdmlldy5vZmZzZXRZICsgaSkge1xuICAgICAgICAgICAgICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICAgICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JnYigyNTUsIDI1NSwgMjU1KSc7XG4gICAgICAgICAgICAgICAgICAgIGN0eC5maWxsUmVjdChsZWZ0TWFyZ2luLCB5IC0gbGluZUhlaWdodCArIDJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICwgVywgbGluZUhlaWdodCArIDQpO1xuICAgICAgICAgICAgICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGwgPSBsLnN1YnN0cigwLCB2aWV3LmxhYmVsVHJ1bmNhdGUpICsgJy4uLic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KGwsIGxlZnRNYXJnaW4sIHkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobW91c2UpIHtcbiAgICAgICAgICAgIGxldCByID0gbW91c2UubGVmdCB8fCBtb3VzZS5yaWdodCB8fCBtb3VzZS5taWRkbGUgPyA2IDogNDtcblxuICAgICAgICAgICAgLy8gaW5mbyBsaW5lXG4gICAgICAgICAgICBpZiAodmlldy50cmFja3MgJiYgdmlldy50cmFja3NbbW91c2Uuc3ldKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNlcSA9IHZpZXcudHJhY2tzW21vdXNlLnN5XVxuICAgICAgICAgICAgICAgICwgcG9zID0gc2VxLnNlcXVlbmNlW21vdXNlLnN4XTtcblxuICAgICAgICAgICAgICAgIGlmIChwb3MgJiYgcG9zICE9PSAnLScpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zICs9IHNlcS5zZXF1ZW5jZS5zdWJzdHIoMCwgbW91c2Uuc3gpLnJlcGxhY2UoLy0vZywnJykubGVuZ3RoKzE7XG4gICAgICAgICAgICAgICAgICAgIGN0eC5maWxsVGV4dChwb3MsIHZpZXcuc2VxT2Zmc2V0LCBsaW5lSGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3R4LmZpbGxUZXh0KHNlcS5sYWJlbCwgdmlldy5zZXFPZmZzZXQgKyA2ICogY2hhcldpZHRoLCBsaW5lSGVpZ2h0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY3R4LnNhdmUoKTtcbiAgICAgICAgICAgIC8vIGN0eC5maWxsU3R5bGUgPSBvcHQuY3Vyc29yQ29sb3I7XG5cbiAgICAgICAgICAgIC8vIC8vIGlmIG1pZGRsZSBidXR0b24gaXMgcHJlc3NlZFxuICAgICAgICAgICAgLy8gaWYgKG1vdXNlLm1pZGRsZSkge1xuXG4gICAgICAgICAgICAvLyAgICAgLy8gZHJhdyAzIGNpcmNsZXMgYmV0d2VlbiB0aGUgcG9pbnQgd2hlcmVcbiAgICAgICAgICAgIC8vICAgICAvLyB0aGUgbW91c2UgYnV0dG9uIGhhcyBmaXJzdCBiZWVuIHByZXNzZWRcbiAgICAgICAgICAgIC8vICAgICAvLyBhbmQgdGhlIGN1cnJlbnQgY29vcmRpbmF0ZXM7XG4gICAgICAgICAgICAvLyAgICAgbGV0IHggPSBzY3JvbGwucGFuLngsIHkgPSBzY3JvbGwucGFuLnksIGkgPSA0XG4gICAgICAgICAgICAvLyAgICAgLCBkeCA9ICh4LW1vdXNlLngpIC8gaSwgZHkgPSAoeS1tb3VzZS55KSAvIGlcbiAgICAgICAgICAgIC8vICAgICA7XG5cbiAgICAgICAgICAgIC8vICAgICBmaWxsQ2lyY2xlKHgsIHksIHIgKiAzLCBjdHgpO1xuXG4gICAgICAgICAgICAvLyAgICAgd2hpbGUgKC0taSlcbiAgICAgICAgICAgIC8vICAgICAgICAgZmlsbENpcmNsZSh4IC0gZHgqaSwgeSAtIGR5KmksIGkgKiByLzIsIGN0eCk7XG4gICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gICAgIGZpbGxDaXJjbGUobW91c2UueCwgbW91c2UueSwgciAqIDMsIGN0eCk7XG4gICAgICAgICAgICAvLyB9XG5cbiAgICAgICAgICAgIC8vIC8vIGRyYXcgc21hbGwgaW5uZXIgY2lyY2xlXG4gICAgICAgICAgICAvLyBmaWxsQ2lyY2xlKG1vdXNlLngsIG1vdXNlLnksIHIgKiAyLCBjdHgpO1xuXG4gICAgICAgICAgICAvLyBjdHgucmVzdG9yZSgpO1xuICAgICAgICB9XG5cblxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5kcmF3KTtcbiAgICB9XG5cbn1cblxuZnVuY3Rpb24gZmlsbENpcmNsZSh4LCB5LCByLCBjdHgpIHtcblxuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBjdHguYXJjKHgsIHksIHIsIDAsIE1hdGguUEkqMik7XG4gICAgY3R4LmZpbGwoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG59XG5cbk1TQVZpZXcuY3JlYXRlID0gZnVuY3Rpb24gKG9wdGlvbnMsIGRvbU5vZGUpIHtcbiAgICByZXR1cm4gbmV3IE1TQVZpZXcoZG9tTm9kZSwgb3B0aW9ucyk7XG59O1xuXG5NU0FWaWV3LmRlZmF1bHRPcHRpb25zID0ge1xuICAgIGZvbnQ6ICcxMnB4IG1vbm9zcGFjZSdcbiAgICAsIGxpbmVIZWlnaHQ6IDE0ICAgICAvLyBweFxuICAgICwgbGFiZWxXaWR0aDogMTAwICAgIC8vIHB4XG4gICAgLCBsZWZ0TWFyZ2luOiAyMCAgICAgLy8gcHhcbiAgICAsIGxldHRlclNwYWNpbmc6IDggICAvLyBweCBiZXR3ZWVuIGFtaW5vYWNpZHNcbiAgICAsIGN1cnNvckNvbG9yOiAncmdiYSgxMjgsIDEyOCwgMTI4LCAwLjIpJ1xuICAgICwgbG9hZGluZ1RleHQ6ICdsb2FkaW5nLi4uJ1xuICAgICwgY29sb3JTY2hlbWU6ICdjbHVzdGFsMidcbn07XG5cblxuaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIHJlcXVpcmUuanMgbW9kdWxlXG4gICAgZGVmaW5lKE1TQVZpZXcpO1xufSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICB3aW5kb3cuTVNBVmlldyA9IE1TQVZpZXc7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2luZGV4LmpzJylcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBOiBcIiMwMGEzNWNcIixcbiAgUjogXCIjMDBmYzAzXCIsXG4gIE46IFwiIzAwZWIxNFwiLFxuICBEOiBcIiMwMGViMTRcIixcbiAgQzogXCIjMDAwMGZmXCIsXG4gIFE6IFwiIzAwZjEwZVwiLFxuICBFOiBcIiMwMGYxMGVcIixcbiAgRzogXCIjMDA5ZDYyXCIsXG4gIEg6IFwiIzAwZDUyYVwiLFxuICBJOiBcIiMwMDU0YWJcIixcbiAgTDogXCIjMDA3Yjg0XCIsXG4gIEs6IFwiIzAwZmYwMFwiLFxuICBNOiBcIiMwMDk3NjhcIixcbiAgRjogXCIjMDA4Nzc4XCIsXG4gIFA6IFwiIzAwZTAxZlwiLFxuICBTOiBcIiMwMGQ1MmFcIixcbiAgVDogXCIjMDBkYjI0XCIsXG4gIFc6IFwiIzAwYTg1N1wiLFxuICBZOiBcIiMwMGU2MTlcIixcbiAgVjogXCIjMDA1ZmEwXCIsXG4gIEI6IFwiIzAwZWIxNFwiLFxuICBYOiBcIiMwMGI2NDlcIixcbiAgWjogXCIjMDBmMTBlXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjQkJCQkJCXCIsXG4gIEI6IFwiZ3JleVwiLFxuICBDOiBcInllbGxvd1wiLFxuICBEOiBcInJlZFwiLFxuICBFOiBcInJlZFwiLFxuICBGOiBcIm1hZ2VudGFcIixcbiAgRzogXCJicm93blwiLFxuICBIOiBcIiMwMEZGRkZcIixcbiAgSTogXCIjQkJCQkJCXCIsXG4gIEo6IFwiI2ZmZlwiLFxuICBLOiBcIiMwMEZGRkZcIixcbiAgTDogXCIjQkJCQkJCXCIsXG4gIE06IFwiI0JCQkJCQlwiLFxuICBOOiBcImdyZWVuXCIsXG4gIE86IFwiI2ZmZlwiLFxuICBQOiBcImJyb3duXCIsXG4gIFE6IFwiZ3JlZW5cIixcbiAgUjogXCIjMDBGRkZGXCIsXG4gIFM6IFwiZ3JlZW5cIixcbiAgVDogXCJncmVlblwiLFxuICBVOiBcIiNmZmZcIixcbiAgVjogXCIjQkJCQkJCXCIsXG4gIFc6IFwibWFnZW50YVwiLFxuICBYOiBcImdyZXlcIixcbiAgWTogXCJtYWdlbnRhXCIsXG4gIFo6IFwiZ3JleVwiLFxuICBHYXA6IFwiZ3JleVwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwib3JhbmdlXCIsXG4gIEI6IFwiI2ZmZlwiLFxuICBDOiBcImdyZWVuXCIsXG4gIEQ6IFwicmVkXCIsXG4gIEU6IFwicmVkXCIsXG4gIEY6IFwiYmx1ZVwiLFxuICBHOiBcIm9yYW5nZVwiLFxuICBIOiBcInJlZFwiLFxuICBJOiBcImdyZWVuXCIsXG4gIEo6IFwiI2ZmZlwiLFxuICBLOiBcInJlZFwiLFxuICBMOiBcImdyZWVuXCIsXG4gIE06IFwiZ3JlZW5cIixcbiAgTjogXCIjZmZmXCIsXG4gIE86IFwiI2ZmZlwiLFxuICBQOiBcIm9yYW5nZVwiLFxuICBROiBcIiNmZmZcIixcbiAgUjogXCJyZWRcIixcbiAgUzogXCJvcmFuZ2VcIixcbiAgVDogXCJvcmFuZ2VcIixcbiAgVTogXCIjZmZmXCIsXG4gIFY6IFwiZ3JlZW5cIixcbiAgVzogXCJibHVlXCIsXG4gIFg6IFwiI2ZmZlwiLFxuICBZOiBcImJsdWVcIixcbiAgWjogXCIjZmZmXCIsXG4gIEdhcDogXCIjZmZmXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjODBhMGYwXCIsXG4gIFI6IFwiI2YwMTUwNVwiLFxuICBOOiBcIiMwMGZmMDBcIixcbiAgRDogXCIjYzA0OGMwXCIsXG4gIEM6IFwiI2YwODA4MFwiLFxuICBROiBcIiMwMGZmMDBcIixcbiAgRTogXCIjYzA0OGMwXCIsXG4gIEc6IFwiI2YwOTA0OFwiLFxuICBIOiBcIiMxNWE0YTRcIixcbiAgSTogXCIjODBhMGYwXCIsXG4gIEw6IFwiIzgwYTBmMFwiLFxuICBLOiBcIiNmMDE1MDVcIixcbiAgTTogXCIjODBhMGYwXCIsXG4gIEY6IFwiIzgwYTBmMFwiLFxuICBQOiBcIiNmZmZmMDBcIixcbiAgUzogXCIjMDBmZjAwXCIsXG4gIFQ6IFwiIzAwZmYwMFwiLFxuICBXOiBcIiM4MGEwZjBcIixcbiAgWTogXCIjMTVhNGE0XCIsXG4gIFY6IFwiIzgwYTBmMFwiLFxuICBCOiBcIiNmZmZcIixcbiAgWDogXCIjZmZmXCIsXG4gIFo6IFwiI2ZmZlwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiI2U3MThlN1wiLFxuICBSOiBcIiM2ZjkwNmZcIixcbiAgTjogXCIjMWJlNDFiXCIsXG4gIEQ6IFwiIzc3ODg3N1wiLFxuICBDOiBcIiMyM2RjMjNcIixcbiAgUTogXCIjOTI2ZDkyXCIsXG4gIEU6IFwiI2ZmMDBmZlwiLFxuICBHOiBcIiMwMGZmMDBcIixcbiAgSDogXCIjNzU4YTc1XCIsXG4gIEk6IFwiIzhhNzU4YVwiLFxuICBMOiBcIiNhZTUxYWVcIixcbiAgSzogXCIjYTA1ZmEwXCIsXG4gIE06IFwiI2VmMTBlZlwiLFxuICBGOiBcIiM5ODY3OThcIixcbiAgUDogXCIjMDBmZjAwXCIsXG4gIFM6IFwiIzM2YzkzNlwiLFxuICBUOiBcIiM0N2I4NDdcIixcbiAgVzogXCIjOGE3NThhXCIsXG4gIFk6IFwiIzIxZGUyMVwiLFxuICBWOiBcIiM4NTdhODVcIixcbiAgQjogXCIjNDliNjQ5XCIsXG4gIFg6IFwiIzc1OGE3NVwiLFxuICBaOiBcIiNjOTM2YzlcIlxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBOiBcIiNhZDAwNTJcIixcbiAgQjogXCIjMGMwMGYzXCIsXG4gIEM6IFwiI2MyMDAzZFwiLFxuICBEOiBcIiMwYzAwZjNcIixcbiAgRTogXCIjMGMwMGYzXCIsXG4gIEY6IFwiI2NiMDAzNFwiLFxuICBHOiBcIiM2YTAwOTVcIixcbiAgSDogXCIjMTUwMGVhXCIsXG4gIEk6IFwiI2ZmMDAwMFwiLFxuICBKOiBcIiNmZmZcIixcbiAgSzogXCIjMDAwMGZmXCIsXG4gIEw6IFwiI2VhMDAxNVwiLFxuICBNOiBcIiNiMDAwNGZcIixcbiAgTjogXCIjMGMwMGYzXCIsXG4gIE86IFwiI2ZmZlwiLFxuICBQOiBcIiM0NjAwYjlcIixcbiAgUTogXCIjMGMwMGYzXCIsXG4gIFI6IFwiIzAwMDBmZlwiLFxuICBTOiBcIiM1ZTAwYTFcIixcbiAgVDogXCIjNjEwMDllXCIsXG4gIFU6IFwiI2ZmZlwiLFxuICBWOiBcIiNmNjAwMDlcIixcbiAgVzogXCIjNWIwMGE0XCIsXG4gIFg6IFwiIzY4MDA5N1wiLFxuICBZOiBcIiM0ZjAwYjBcIixcbiAgWjogXCIjMGMwMGYzXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cy5zZWxlY3RvciA9IHJlcXVpcmUoXCIuL3NlbGVjdG9yXCIpO1xuXG4vLyBiYXNpY3Ncbm1vZHVsZS5leHBvcnRzLnRheWxvciA9IHJlcXVpcmUoXCIuL3RheWxvclwiKTtcbm1vZHVsZS5leHBvcnRzLnphcHBvPSByZXF1aXJlKFwiLi96YXBwb1wiKTtcbm1vZHVsZS5leHBvcnRzLmh5ZHJvPSByZXF1aXJlKFwiLi9oeWRyb3Bob2JpY2l0eVwiKTtcblxubW9kdWxlLmV4cG9ydHMuY2x1c3RhbCA9IHJlcXVpcmUoXCIuL2NsdXN0YWxcIik7XG5tb2R1bGUuZXhwb3J0cy5jbHVzdGFsMiA9IHJlcXVpcmUoXCIuL2NsdXN0YWwyXCIpO1xuXG5tb2R1bGUuZXhwb3J0cy5jdXJpZWQgPSByZXF1aXJlKFwiLi9idXJpZWRcIik7XG5tb2R1bGUuZXhwb3J0cy5jaW5lbWEgPSByZXF1aXJlKFwiLi9jaW5lbWFcIik7XG5tb2R1bGUuZXhwb3J0cy5udWNsZW90aWRlICA9IHJlcXVpcmUoXCIuL251Y2xlb3RpZGVcIik7XG5tb2R1bGUuZXhwb3J0cy5oZWxpeCAgPSByZXF1aXJlKFwiLi9oZWxpeFwiKTtcbm1vZHVsZS5leHBvcnRzLmxlc2sgID0gcmVxdWlyZShcIi4vbGVza1wiKTtcbm1vZHVsZS5leHBvcnRzLm1hZSA9IHJlcXVpcmUoXCIuL21hZVwiKTtcbm1vZHVsZS5leHBvcnRzLnB1cmluZSA9IHJlcXVpcmUoXCIuL3B1cmluZVwiKTtcbm1vZHVsZS5leHBvcnRzLnN0cmFuZCA9IHJlcXVpcmUoXCIuL3N0cmFuZFwiKTtcbm1vZHVsZS5leHBvcnRzLnR1cm4gPSByZXF1aXJlKFwiLi90dXJuXCIpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiIG9yYW5nZVwiLFxuICBCOiBcIiAjZmZmXCIsXG4gIEM6IFwiIGdyZWVuXCIsXG4gIEQ6IFwiIHJlZFwiLFxuICBFOiBcIiByZWRcIixcbiAgRjogXCIgZ3JlZW5cIixcbiAgRzogXCIgb3JhbmdlXCIsXG4gIEg6IFwiIG1hZ2VudGFcIixcbiAgSTogXCIgZ3JlZW5cIixcbiAgSjogXCIgI2ZmZlwiLFxuICBLOiBcIiByZWRcIixcbiAgTDogXCIgZ3JlZW5cIixcbiAgTTogXCIgZ3JlZW5cIixcbiAgTjogXCIgbWFnZW50YVwiLFxuICBPOiBcIiAjZmZmXCIsXG4gIFA6IFwiIGdyZWVuXCIsXG4gIFE6IFwiIG1hZ2VudGFcIixcbiAgUjogXCIgcmVkXCIsXG4gIFM6IFwiIG9yYW5nZVwiLFxuICBUOiBcIiBvcmFuZ2VcIixcbiAgVTogXCIgI2ZmZlwiLFxuICBWOiBcIiBncmVlblwiLFxuICBXOiBcIiBncmVlblwiLFxuICBYOiBcIiAjZmZmXCIsXG4gIFk6IFwiIGdyZWVuXCIsXG4gIFo6IFwiICNmZmZcIixcbiAgR2FwOiBcIiAjZmZmXCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIgIzc3ZGQ4OFwiLFxuICBCOiBcIiAjZmZmXCIsXG4gIEM6IFwiICM5OWVlNjZcIixcbiAgRDogXCIgIzU1YmIzM1wiLFxuICBFOiBcIiAjNTViYjMzXCIsXG4gIEY6IFwiICM5OTk5ZmZcIixcbiAgRzogXCIgIzc3ZGQ4OFwiLFxuICBIOiBcIiAjNTU1NWZmXCIsXG4gIEk6IFwiICM2NmJiZmZcIixcbiAgSjogXCIgI2ZmZlwiLFxuICBLOiBcIiAjZmZjYzc3XCIsXG4gIEw6IFwiICM2NmJiZmZcIixcbiAgTTogXCIgIzY2YmJmZlwiLFxuICBOOiBcIiAjNTViYjMzXCIsXG4gIE86IFwiICNmZmZcIixcbiAgUDogXCIgI2VlYWFhYVwiLFxuICBROiBcIiAjNTViYjMzXCIsXG4gIFI6IFwiICNmZmNjNzdcIixcbiAgUzogXCIgI2ZmNDQ1NVwiLFxuICBUOiBcIiAjZmY0NDU1XCIsXG4gIFU6IFwiICNmZmZcIixcbiAgVjogXCIgIzY2YmJmZlwiLFxuICBXOiBcIiAjOTk5OWZmXCIsXG4gIFg6IFwiICNmZmZcIixcbiAgWTogXCIgIzk5OTlmZlwiLFxuICBaOiBcIiAjZmZmXCIsXG4gIEdhcDogXCIgI2ZmZlwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiICM2NEY3M0ZcIixcbiAgQzogXCIgI0ZGQjM0MFwiLFxuICBHOiBcIiAjRUI0MTNDXCIsXG4gIFQ6IFwiICMzQzg4RUVcIixcbiAgVTogXCIgIzNDODhFRVwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiICNGRjgzRkFcIixcbiAgQzogXCIgIzQwRTBEMFwiLFxuICBHOiBcIiAjRkY4M0ZBXCIsXG4gIFI6IFwiICNGRjgzRkFcIixcbiAgVDogXCIgIzQwRTBEMFwiLFxuICBVOiBcIiAjNDBFMEQwXCIsXG4gIFk6IFwiICM0MEUwRDBcIlxufTtcbiIsInZhciBCdXJpZWQgPSByZXF1aXJlKFwiLi9idXJpZWRcIik7XG52YXIgQ2luZW1hID0gcmVxdWlyZShcIi4vY2luZW1hXCIpO1xudmFyIENsdXN0YWwgPSByZXF1aXJlKFwiLi9jbHVzdGFsXCIpO1xudmFyIENsdXN0YWwyID0gcmVxdWlyZShcIi4vY2x1c3RhbDJcIik7XG52YXIgSGVsaXggPSByZXF1aXJlKFwiLi9oZWxpeFwiKTtcbnZhciBIeWRybyA9IHJlcXVpcmUoXCIuL2h5ZHJvcGhvYmljaXR5XCIpO1xudmFyIExlc2sgPSByZXF1aXJlKFwiLi9sZXNrXCIpO1xudmFyIE1hZSA9IHJlcXVpcmUoXCIuL21hZVwiKTtcbnZhciBOdWNsZW90aWRlID0gcmVxdWlyZShcIi4vbnVjbGVvdGlkZVwiKTtcbnZhciBQdXJpbmUgPSByZXF1aXJlKFwiLi9wdXJpbmVcIik7XG52YXIgU3RyYW5kID0gcmVxdWlyZShcIi4vc3RyYW5kXCIpO1xudmFyIFRheWxvciA9IHJlcXVpcmUoXCIuL3RheWxvclwiKTtcbnZhciBUdXJuID0gcmVxdWlyZShcIi4vdHVyblwiKTtcbnZhciBaYXBwbyA9IHJlcXVpcmUoXCIuL3phcHBvXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbG9ycyA9IHtcbiAgbWFwcGluZzoge1xuICAgIGJ1cmllZDogQnVyaWVkLFxuICAgIGJ1cmllZF9pbmRleDogQnVyaWVkLFxuICAgIGNpbmVtYTogQ2luZW1hLFxuICAgIGNsdXN0YWwyOiBDbHVzdGFsMixcbiAgICBjbHVzdGFsOiBDbHVzdGFsLFxuICAgIGhlbGl4OiBIZWxpeCxcbiAgICBoZWxpeF9wcm9wZW5zaXR5OiBIZWxpeCxcbiAgICBoeWRybzogSHlkcm8sXG4gICAgbGVzazogTGVzayxcbiAgICBtYWU6IE1hZSxcbiAgICBudWNsZW90aWRlOiBOdWNsZW90aWRlLFxuICAgIHB1cmluZTogUHVyaW5lLFxuICAgIHB1cmluZV9weXJpbWlkaW5lOiBQdXJpbmUsXG4gICAgc3RyYW5kOiBTdHJhbmQsXG4gICAgc3RyYW5kX3Byb3BlbnNpdHk6IFN0cmFuZCxcbiAgICB0YXlsb3I6IFRheWxvcixcbiAgICB0dXJuOiBUdXJuLFxuICAgIHR1cm5fcHJvcGVuc2l0eTogVHVybixcbiAgICB6YXBwbzogWmFwcG8sXG4gIH0sXG4gIGdldENvbG9yOiBmdW5jdGlvbihzY2hlbWUpIHtcbiAgICB2YXIgY29sb3IgPSBDb2xvcnMubWFwcGluZ1tzY2hlbWVdO1xuICAgIGlmIChjb2xvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb2xvciA9IHt9O1xuICAgIH1cbiAgICByZXR1cm4gY29sb3I7XG4gIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjNTg1OGE3XCIsXG4gIFI6IFwiIzZiNmI5NFwiLFxuICBOOiBcIiM2NDY0OWJcIixcbiAgRDogXCIjMjEyMWRlXCIsXG4gIEM6IFwiIzlkOWQ2MlwiLFxuICBROiBcIiM4YzhjNzNcIixcbiAgRTogXCIjMDAwMGZmXCIsXG4gIEc6IFwiIzQ5NDliNlwiLFxuICBIOiBcIiM2MDYwOWZcIixcbiAgSTogXCIjZWNlYzEzXCIsXG4gIEw6IFwiI2IyYjI0ZFwiLFxuICBLOiBcIiM0NzQ3YjhcIixcbiAgTTogXCIjODI4MjdkXCIsXG4gIEY6IFwiI2MyYzIzZFwiLFxuICBQOiBcIiMyMzIzZGNcIixcbiAgUzogXCIjNDk0OWI2XCIsXG4gIFQ6IFwiIzlkOWQ2MlwiLFxuICBXOiBcIiNjMGMwM2ZcIixcbiAgWTogXCIjZDNkMzJjXCIsXG4gIFY6IFwiI2ZmZmYwMFwiLFxuICBCOiBcIiM0MzQzYmNcIixcbiAgWDogXCIjNzk3OTg2XCIsXG4gIFo6IFwiIzQ3NDdiOFwiXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEE6IFwiI2NjZmYwMFwiLFxuICBSOiBcIiMwMDAwZmZcIixcbiAgTjogXCIjY2MwMGZmXCIsXG4gIEQ6IFwiI2ZmMDAwMFwiLFxuICBDOiBcIiNmZmZmMDBcIixcbiAgUTogXCIjZmYwMGNjXCIsXG4gIEU6IFwiI2ZmMDA2NlwiLFxuICBHOiBcIiNmZjk5MDBcIixcbiAgSDogXCIjMDA2NmZmXCIsXG4gIEk6IFwiIzY2ZmYwMFwiLFxuICBMOiBcIiMzM2ZmMDBcIixcbiAgSzogXCIjNjYwMGZmXCIsXG4gIE06IFwiIzAwZmYwMFwiLFxuICBGOiBcIiMwMGZmNjZcIixcbiAgUDogXCIjZmZjYzAwXCIsXG4gIFM6IFwiI2ZmMzMwMFwiLFxuICBUOiBcIiNmZjY2MDBcIixcbiAgVzogXCIjMDBjY2ZmXCIsXG4gIFk6IFwiIzAwZmZjY1wiLFxuICBWOiBcIiM5OWZmMDBcIixcbiAgQjogXCIjZmZmXCIsXG4gIFg6IFwiI2ZmZlwiLFxuICBaOiBcIiNmZmZcIlxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBOiBcIiMyY2QzZDNcIixcbiAgUjogXCIjNzA4ZjhmXCIsXG4gIE46IFwiI2ZmMDAwMFwiLFxuICBEOiBcIiNlODE3MTdcIixcbiAgQzogXCIjYTg1NzU3XCIsXG4gIFE6IFwiIzNmYzBjMFwiLFxuICBFOiBcIiM3Nzg4ODhcIixcbiAgRzogXCIjZmYwMDAwXCIsXG4gIEg6IFwiIzcwOGY4ZlwiLFxuICBJOiBcIiMwMGZmZmZcIixcbiAgTDogXCIjMWNlM2UzXCIsXG4gIEs6IFwiIzdlODE4MVwiLFxuICBNOiBcIiMxZWUxZTFcIixcbiAgRjogXCIjMWVlMWUxXCIsXG4gIFA6IFwiI2Y2MDkwOVwiLFxuICBTOiBcIiNlMTFlMWVcIixcbiAgVDogXCIjNzM4YzhjXCIsXG4gIFc6IFwiIzczOGM4Y1wiLFxuICBZOiBcIiM5ZDYyNjJcIixcbiAgVjogXCIjMDdmOGY4XCIsXG4gIEI6IFwiI2YzMGMwY1wiLFxuICBYOiBcIiM3YzgzODNcIixcbiAgWjogXCIjNWJhNGE0XCJcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgQTogXCIjZmZhZmFmXCIsXG4gIFI6IFwiIzY0NjRmZlwiLFxuICBOOiBcIiMwMGZmMDBcIixcbiAgRDogXCIjZmYwMDAwXCIsXG4gIEM6IFwiI2ZmZmYwMFwiLFxuICBROiBcIiMwMGZmMDBcIixcbiAgRTogXCIjZmYwMDAwXCIsXG4gIEc6IFwiI2ZmMDBmZlwiLFxuICBIOiBcIiM2NDY0ZmZcIixcbiAgSTogXCIjZmZhZmFmXCIsXG4gIEw6IFwiI2ZmYWZhZlwiLFxuICBLOiBcIiM2NDY0ZmZcIixcbiAgTTogXCIjZmZhZmFmXCIsXG4gIEY6IFwiI2ZmYzgwMFwiLFxuICBQOiBcIiNmZjAwZmZcIixcbiAgUzogXCIjMDBmZjAwXCIsXG4gIFQ6IFwiIzAwZmYwMFwiLFxuICBXOiBcIiNmZmM4MDBcIixcbiAgWTogXCIjZmZjODAwXCIsXG4gIFY6IFwiI2ZmYWZhZlwiLFxuICBCOiBcIiNmZmZcIixcbiAgWDogXCIjZmZmXCIsXG4gIFo6IFwiI2ZmZlwiXG59O1xuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHQndXNlIHN0cmljdCc7XG5cdGlmICghb2JqIHx8IHRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzX293bl9jb25zdHJ1Y3RvciA9IGhhc093bi5jYWxsKG9iaiwgJ2NvbnN0cnVjdG9yJyk7XG5cdHZhciBoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kID0gb2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgJiYgaGFzT3duLmNhbGwob2JqLmNvbnN0cnVjdG9yLnByb3RvdHlwZSwgJ2lzUHJvdG90eXBlT2YnKTtcblx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRpZiAob2JqLmNvbnN0cnVjdG9yICYmICFoYXNfb3duX2NvbnN0cnVjdG9yICYmICFoYXNfaXNfcHJvcGVydHlfb2ZfbWV0aG9kKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdC8vIGlmIGxhc3Qgb25lIGlzIG93biwgdGhlbiBhbGwgcHJvcGVydGllcyBhcmUgb3duLlxuXHR2YXIga2V5O1xuXHRmb3IgKGtleSBpbiBvYmopIHt9XG5cblx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHQndXNlIHN0cmljdCc7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9IGVsc2UgaWYgKCh0eXBlb2YgdGFyZ2V0ICE9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0ICE9PSAnZnVuY3Rpb24nKSB8fCB0YXJnZXQgPT0gbnVsbCkge1xuXHRcdHRhcmdldCA9IHt9O1xuXHR9XG5cblx0Zm9yICg7IGkgPCBsZW5ndGg7ICsraSkge1xuXHRcdG9wdGlvbnMgPSBhcmd1bWVudHNbaV07XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmIChvcHRpb25zICE9IG51bGwpIHtcblx0XHRcdC8vIEV4dGVuZCB0aGUgYmFzZSBvYmplY3Rcblx0XHRcdGZvciAobmFtZSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFtuYW1lXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbbmFtZV07XG5cblx0XHRcdFx0Ly8gUHJldmVudCBuZXZlci1lbmRpbmcgbG9vcFxuXHRcdFx0XHRpZiAodGFyZ2V0ID09PSBjb3B5KSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKGRlZXAgJiYgY29weSAmJiAoaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGNvcHkpKSkpIHtcblx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gZXh0ZW5kKGRlZXAsIGNsb25lLCBjb3B5KTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoY29weSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0dGFyZ2V0W25hbWVdID0gY29weTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iLCJ2YXIgcmVxdWVzdCA9IHJlcXVpcmUoJy4vcmVxdWVzdCcpXG4sIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpXG47XG5cbmZ1bmN0aW9uIG1pbihhcnIpIHtcbiAgICByZXR1cm4gTWF0aC5taW4uYXBwbHkoTWF0aCwgYXJyKTtcbn1cblxuZnVuY3Rpb24gbWF4KGFycikge1xuICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBhcnIpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVMaW5lQ2FjaGUgKCkge1xuICAgIHZhciBsYyA9IFtdLCBpZHggPSBbXSwgbGVuID0gTVNBLm51bUNhY2hlZExpbmVzO1xuXG4gICAgdmFyIHRvID0gbnVsbDtcbiAgICBmdW5jdGlvbiB0cmltKGRpcikge1xuICAgICAgICB2YXIgYSwgYjtcbiAgICAgICAgd2hpbGUgKCAoYT1tYXgoaWR4KSkgLSAoYj1taW4oaWR4KSkgPiBsZW4pIHtcbiAgICAgICAgICAgIGkgPSBkaXIgPyBiIDogYTtcbiAgICAgICAgICAgIGRlbGV0ZSBsY1tpXTtcbiAgICAgICAgICAgIGlkeC5zcGxpY2UoaWR4LmluZGV4T2YoaSksIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbGMuc2V0ID0gZnVuY3Rpb24gKGksIHZhbCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodG8pO1xuICAgICAgICB2YXIgZGlyID0gaSA+IG1heChpZHgpID8gMSA6IDA7XG4gICAgICAgIHRoaXNbaV0gPSB2YWw7XG4gICAgICAgIGlkeC5wdXNoKGkpO1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPiBsZW4pIHtcbiAgICAgICAgICAgIHRvID0gc2V0VGltZW91dCh0cmltLmJpbmQobnVsbCwgZGlyKSwgMzAwKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobGMsIHtcbiAgICAgICAgJ2xhc3REZWZpbmVkSW5kZXgnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtyZXR1cm4gbWF4KGlkeCk7fVxuICAgICAgICB9LCAnZmlyc3REZWZpbmVkSW5kZXgnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtyZXR1cm4gbWluKGlkeCk7fVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbGM7XG59XG5cblxuZnVuY3Rpb24gTVNBKHNyYykge1xuICAgIHRoaXMuc3JjID0gbnVsbDtcbiAgICB0aGlzLmhyZWYgPSBudWxsO1xuICAgIHRoaXMuc2l6ZVByb21pc2UgPSBudWxsO1xuICAgIHRoaXMubGluZUNhY2hlID0gY3JlYXRlTGluZUNhY2hlKCk7XG4gICAgdGhpcy5saW5lUHJvbWlzZXMgPSBbXTtcbiAgICB0aGlzLkxPQ0sgPSBmYWxzZTtcblxuICAgIGlmICghKC9odHRwLy50ZXN0KHNyYykpKSB7XG4gICAgICAgIHRoaXMuc3JjID0gc3JjO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaHJlZiA9IHNyYztcbiAgICB9XG59XG5cblxuLyoqIEBwcm9wIHtpbnR9IHNldCB0aGUgbnVtYmVyIG9mIGxpbmVzIHRoYXQgc2hvdWxkIGJlIGNhY2hlZCBhdCBtb3N0ICovXG5NU0EubnVtQ2FjaGVkTGluZXMgPSAzMDAwO1xuXG4vKiogQHByb3Age2ludH0gc2V0IHRoZSBudW1iZXIgb2YgbGluZXMgdG8gZmV0Y2ggZWFnZXJseSAqL1xuTVNBLm51bVByZWZldGNoTGluZXMgPSAxMDAwO1xuXG4vKiogQHByb3Age2Zsb2F0fSBmcmFjdGlvbiBhdCB3aGljaCB0byB0cmlnZ2VyIHByZWZldGNoICovXG5NU0EubnVtUHJlZmV0Y2hUcmlnZ2VyID0gMC41O1xuXG5cbi8qKlxuICogRmV0Y2ggYW5kIGNhbGN1bGF0ZSBkaWZmZXJlbnQgYXNwZWN0cyBvZiB0aGUgTVNBLlxuICogUmV0dXJucyB0aGUgcHJvbWlzZSBvZiBhbiBvYmplY3Q6XG4gKiAgIHtcbiAqICAgICB7aW50fSBzaXplICAgICAgIFRoZSBieXRlc2l6ZSBvZiB0aGUgd2hvbGUgTVNBIGZpbGVcbiAqICAgICB7aW50fSB3aWR0aCAgICAgIFRoZSB3aWRodCBvZiB0aGUgTVNBLCBpLmUuIHRoZSBsaW5lIGxlbmd0aFxuICogICAgICAgICAgICAgICAgICAgICAgb2YgdGhvc2UgbGluZXMgYWN0dWFsbHkgY29udGFpbmluZyBzZXF1ZW5jZXNcbiAqICAgICB7aW50fSBvZmZzZXQgICAgIFRoZSBieXRlIG9mZnNldCB0byB0aGUgZmlyc3Qgc2VxdWVuY2VcbiAqICAgICB7aW50fSBjb3VudCAgICAgIFRoZSBudW1iZXIgb2Ygc2VxdWVuY2VzIGluIHRoZSBNU0FcbiAqICAgICB7aW50fSBsYWJlbFdpZHRoIFRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyByZXNlcnZlZCBmb3IgbGFiZWxzXG4gKiAgICAgICAgICAgICAgICAgICAgICBpbiBmcm9udCBvZiB0aGUgc2VxdWVuY2VzXG4gKiAgIH1cbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5cbk1TQS5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBsaW5lQ2FjaGUgPSB0aGlzLmxpbmVDYWNoZTtcblxuICAgIC8vIFJldHVybiB0aGUgcHJvbWlzZSBpZiB0aGUgcXVlcnMgaGFzIGJlZW5cbiAgICAvLyBwZXJmb3JtZWQgYmVmb3JlXG4gICAgaWYgKHRoaXMuc2l6ZVByb21pc2UpXG4gICAgICAgIHJldHVybiB0aGlzLnNpemVQcm9taXNlO1xuXG5cbiAgICAvLyBHZXQgdGhlIGhlYWRlcnMgZm9yIHRoZSBmaWxlIHRvIGZpbmQgb3V0IHRoZSB0b3RhbFxuICAgIC8vIGZpbGUgc2l6ZVxuICAgIHZhciBoZWFkUCA9IHJlcXVlc3QodGhpcy5ocmVmLCB7bWV0aG9kOiAnSEVBRCd9KVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVxKXtcbiAgICAgICAgICAgIHJldHVybiB7c2l6ZTogcGFyc2VJbnQocmVxLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LUxlbmd0aCcpKX07XG4gICAgICAgIH0pO1xuXG4gICAgLy8gZ2V0IHRoZSBmaXJzdCAxMCBrYiB0byBmaW5kIG91dCB0aGUgbGluZSB3aWR0aCwgbGFiZWwgd2lkdGhcbiAgICAvLyBhbmQgYnl0ZSBvZmZzZXQgdG8gdGhlIGZpcnN0IHNlcXVlbmNlXG4gICAgdmFyIHN0YXJ0UCA9IHJlcXVlc3QodGhpcy5ocmVmLCB7aGVhZGVyczoge3JhbmdlOiAnYnl0ZXM9MC0xMDI0MCd9fSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICAgICAgdmFyIGkgPSAwLCBsaW5lV2lkdGgsIGxhYmVsV2lkdGgsIGxpbmVzID0gcmVxLnJlc3BvbnNlLnNwbGl0KCdcXG4nKVxuICAgICAgICAgICAgLCBsT2Zmc2V0ID0gMSwgb2Zmc2V0ID0gbGluZXNbMF0ubGVuZ3RoICsgMSwgc2VxO1xuXG4gICAgICAgICAgICAvLyB3YWxrIGRvd24gdGhlIGZpbGUsIGZvciBlYWNoICdlbXB0eSdcbiAgICAgICAgICAgIC8vIGxpbmUgYWRkIG9uZSB0byB0aGUgb2Zmc2V0LCBiZWNhdXNlIG9mIHRoZSBcXG5cbiAgICAgICAgICAgIC8vIHJlbW92ZWQgZHVyaW5nIHRoZSBzcGxpdCgnXFxuJylcbiAgICAgICAgICAgIHdoaWxlICghbGluZXNbKytpXS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvZmZzZXQrKztcbiAgICAgICAgICAgICAgICBsT2Zmc2V0Kys7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGkgaXMgbm93IHRoZSBmaXJzdCBsaW5lIHdpdGggYW4gYWN0dWFsIHNlcXVlbmNlXG4gICAgICAgICAgICAvLyBhZGQgb25lIGJlY2F1c2Ugb2YgdGhlIFxcbiB3ZSBsb3N0IGluIHRoZSBzcGxpdFxuICAgICAgICAgICAgbGluZVdpZHRoID0gbGluZXNbaV0ubGVuZ3RoICsgMTtcbiAgICAgICAgICAgIGxhYmVsV2lkdGggPSBsaW5lc1tpXS5tYXRjaCgvLiogKy8pWzBdLmxlbmd0aDtcblxuICAgICAgICAgICAgLy8gbm93IHB1c2ggdGhlIHJlc3Qgb2YgdGhlIGxpbmVzIG9udG8gdGhlIGNhY2hlXG4gICAgICAgICAgICAvLyBpZiB0aGV5IGFyZSB3aG9sZVxuICAgICAgICAgICAgd2hpbGUgKChsaW5lc1tpXS5sZW5ndGggKyAxKSA9PT0gbGluZVdpZHRoKSB7XG4gICAgICAgICAgICAgICAgIHNlcSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGFiZWw6IGxpbmVzW2ldLnN1YnN0cigwLCBsYWJlbFdpZHRoKVxuICAgICAgICAgICAgICAgICAgICAsIHNlcXVlbmNlOiBsaW5lc1tpXS5zdWJzdHIobGFiZWxXaWR0aClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGxpbmVDYWNoZS5zZXQoaS1sT2Zmc2V0LCBzZXEpO1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBsYWJlbFdpZHRoOiBsYWJlbFdpZHRoXG4gICAgICAgICAgICAgICAgLCBsaW5lV2lkdGg6IGxpbmVXaWR0aFxuICAgICAgICAgICAgICAgICwgc2VxdWVuY2VXaWR0aDogbGluZVdpZHRoIC0gbGFiZWxXaWR0aFxuICAgICAgICAgICAgICAgICwgb2Zmc2V0OiBvZmZzZXRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAvLyBnZXQgbGFzdCAxMGtiIHRvIGdldCB0aGUgYWxpZ25tZW50IGZyb20gdGhlIGxhc3QgbGluZVxuICAgIHZhciBlbmRQID0gcmVxdWVzdCh0aGlzLmhyZWYsIHtoZWFkZXJzOiB7cmFuZ2U6ICdieXRlcz0tMTAyNDAnfX0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgICAgIHZhciBsaW5lcyA9IHJlcS5yZXNwb25zZS5zcGxpdCgnXFxuJylcbiAgICAgICAgICAgICwgYWxuID0gbGluZXMuc2xpY2UoLTIpWzBdXG4gICAgICAgICAgICA7XG5cbiAgICAgICAgICAgIHJldHVybiB7YWxpZ25tZW50OiBhbG59O1xuICAgICAgICB9KTtcblxuICAgIC8vIGFuZCBjb3VudCB0aGUgbnVtYmVyIG9mIHNlcXVlbmNlc1xuICAgIHRoaXMuc2l6ZVByb21pc2UgPSBQcm9taXNlLmFsbChbaGVhZFAsIHN0YXJ0UCwgZW5kUF0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9wcykge1xuICAgICAgICAgICAgLy8gbWVyZ2UgZXZlcnl0aGluZyBpbnRvIG9uZSBvYmplY3RcbiAgICAgICAgICAgIHByb3BzID0gZXh0ZW5kKHt9LCBwcm9wc1swXSwgcHJvcHNbMV0sIHByb3BzWzJdKTtcblxuICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHNlcXVlbmNlIGNvdW50IGFuZCB3aWR0aFxuICAgICAgICAgICAgcHJvcHMuc2VxdWVuY2VDb3VudCA9IChwcm9wcy5zaXplIC0gcHJvcHMub2Zmc2V0KSAvIHByb3BzLmxpbmVXaWR0aCAtIDI7XG5cbiAgICAgICAgICAgIHJldHVybiBwcm9wcztcbiAgICAgICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcy5zaXplUHJvbWlzZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgUHJvbWlzZSBvZiBhIHN0cmluZyBjb250YWluaW5nXG4gKiB0aGUgYWN0dWFsIGFsaWdubWVudCBpbmZvcm1hdGlvblxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9XG4gKi9cblxuTVNBLnByb3RvdHlwZS5nZXRBbGlnbm1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U2l6ZSgpLnRoZW4oZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICAgIHJldHVybiBwcm9wcy5hbGlnbm1lbnQ7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIFByb21pc2Ugb2YgYW4gaW50ZWdlciBjb250YWluaW5nXG4gKiB0aGUgc2VxdWVuY2UgY291bnRcbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5cbk1TQS5wcm90b3R5cGUuZ2V0Q291bnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U2l6ZSgpLnRoZW4oZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICAgIHJldHVybiBwcm9wcy5zZXF1ZW5jZUNvdW50O1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIFByb21pc2Ugb2YgYSBzaW5nbGUgc2VxdWVuY2Ugb2JqZWN0XG4gKiBjb250YWluaW5nXG4gKiB7XG4gKiAgIHtzdHJpbmd9IGxhYmVsXG4gKiAgIHtzdHJpbmd9IHNlcXVlbmNlXG4gKiB9XG4gKlxuICogQHBhcmFtIHtpbnR9IGwgbGluZSB0byBnZXQsIDAtaW5kZXhlZFxuICogQHJldHVybiB7UHJvbWlzZX1cbiAqL1xuXG5NU0EucHJvdG90eXBlLmdldExpbmUgPSBmdW5jdGlvbiAobCkge1xuICAgIHZhciB4O1xuXG4gICAgaWYgKCh4ID0gdGhpcy5saW5lQ2FjaGVbbF0pKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoeCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0TGluZXMobCwgbCwgdHJ1ZSkudGhlbihmdW5jdGlvbiAobGluZXMpIHtyZXR1cm4gbGluZXNbMF07fSk7XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgUHJvbWlzZSBvZiBhbiBhcnJheSBvZiBzZXF1ZW5jZSBvYmplY3RzXG4gKiBjb250YWluaW5nXG4gKiB7XG4gKiAgIHtzdHJpbmd9IGxhYmVsXG4gKiAgIHtzdHJpbmd9IHNlcXVlbmNlXG4gKiB9XG4gKlxuICogQHBhcmFtIHtpbnR9IGEgICAgICAgICAgICAgIGZpcnN0IGxpbmUgdG8gZ2V0LCAwLWluZGV4ZWRcbiAqIEBwYXJhbSB7aW50fSBbYl0gICAgICAgICAgICBsYXN0IGxpbmUgdG8gZ2V0LCBkZWZhdWx0cyB0byBhXG4gKiBAcGFyYW0ge2Jvb2x9IGRvTm90UHJlZmV0Y2ggZmxhZyB0byBzdXByZXNzIHByZWZldGNoXG4gKiBAcmV0dXJuIHtQcm9taXNlfVxuICovXG5cbk1TQS5wcm90b3R5cGUuZ2V0TGluZXMgPSBmdW5jdGlvbiAoYSwgYiwgZG9Ob3RQcmVmZXRjaCkge1xuICAgIGIgPSBiIHx8IGE7XG5cbiAgICB2YXIgbGluZUNhY2hlID0gdGhpcy5saW5lQ2FjaGVcbiAgICAsIGxpbmVQcm9taXNlcyA9IHRoaXMubGluZVByb21pc2VzXG4gICAgLCBocmVmID0gdGhpcy5ocmVmXG4gICAgO1xuXG4gICAgcmV0dXJuIHRoaXMuZ2V0U2l6ZSgpLnRoZW4oZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICAgIHZhciBsYWJlbFdpZHRoID0gcHJvcHMubGFiZWxXaWR0aFxuICAgICAgICAsIGxpbmVXaWR0aCA9IHByb3BzLmxpbmVXaWR0aFxuICAgICAgICAsIGNvdW50ID0gcHJvcHMuc2VxdWVuY2VDb3VudFxuICAgICAgICAsIG9mZnNldCA9IHByb3BzLm9mZnNldFxuICAgICAgICAsIHJlcyA9IFtdLCBmZXRjaCA9IFtdLCB3YWl0ID0gW11cbiAgICAgICAgLCByYW5nZSwgeCwgaSwgcCwgYywgZCwgZSwgZlxuICAgICAgICA7XG5cblxuICAgICAgICBpZiAoYSA+IGNvdW50KSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGIgPiBjb3VudCkge1xuICAgICAgICAgICAgYiA9IGNvdW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZ2V0IGxpbmVzIGZyb20gQ2FjaGUgaWYgYXZhaWxhYmxlXG4gICAgICAgIGZvciAoaSA9IGE7IGkgPD0gYjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoKHggPSBsaW5lQ2FjaGVbaV0pKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goeCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCh4ID0gbGluZVByb21pc2VzW2ldKSkge1xuICAgICAgICAgICAgICAgIGlmICh3YWl0LmluZGV4T2YoeCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHdhaXQucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZldGNoLnB1c2goaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0cmlnZ2VyIGVhZ2VyIHByZWZldGNoXG4gICAgICAgIGlmICghZG9Ob3RQcmVmZXRjaCAmJiAhdGhpcy5MT0NLKSB7XG4gICAgICAgICAgICBlID0gbGluZUNhY2hlLmxhc3REZWZpbmVkSW5kZXggLSAoTVNBLm51bVByZWZldGNoTGluZXMgKiBNU0EubnVtUHJlZmV0Y2hUcmlnZ2VyKTtcbiAgICAgICAgICAgIGYgPSBsaW5lQ2FjaGUuZmlyc3REZWZpbmVkSW5kZXggKyAoTVNBLm51bVByZWZldGNoTGluZXMgKiBNU0EubnVtUHJlZmV0Y2hUcmlnZ2VyKTtcblxuICAgICAgICAgICAgaWYgKGIgPiBlICYmIGxpbmVDYWNoZS5sYXN0RGVmaW5lZEluZGV4IDwgY291bnQpIHtcbiAgICAgICAgICAgICAgICAvLyBwcmVmZXRjaCBmb3J3YXJkXG4gICAgICAgICAgICAgICAgZSA9IGxpbmVDYWNoZS5sYXN0RGVmaW5lZEluZGV4O1xuICAgICAgICAgICAgICAgIGYgPSBtaW4oW2UgKyBNU0EubnVtUHJlZmV0Y2hMaW5lcywgY291bnRdKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYSA8IGYgJiYgbGluZUNhY2hlLmZpcnN0RGVmaW5lZEluZGV4ID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIHByZWZldGNoIGJhY2t3YXJkXG4gICAgICAgICAgICAgICAgZiA9IGxpbmVDYWNoZS5maXJzdERlZmluZWRJbmRleDtcbiAgICAgICAgICAgICAgICBlID0gbWF4KFtmIC0gTVNBLm51bVByZWZldGNoTGluZXMsIDBdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZSA9IGYgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuTE9DSyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5nZXRMaW5lcyhlLCBmLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5MT0NLID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB3ZSBkbyBub3QgbmVlZCB0byBmZXRjaCBtb3JlIGxpbmVzXG4gICAgICAgIC8vIGZyb20gdGhlIHJlbW90ZSBzb3VyY2UsIHJldHVybiB0aGVcbiAgICAgICAgLy8gcmVzdWx0cyBub3dcbiAgICAgICAgaWYgKGZldGNoLmxlbmd0aCA9PT0gMCAmJiB3YWl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZldGNoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIGNvbnN0cnVjdCByYW5nZSByZXF1ZXN0XG4gICAgICAgICAgICBjID0gbWluKGZldGNoKTsgZCA9IG1heChmZXRjaCk7XG5cbiAgICAgICAgICAgIHJhbmdlID0gW1xuICAgICAgICAgICAgICAgIG9mZnNldCArIGMgKiBsaW5lV2lkdGhcbiAgICAgICAgICAgICAgICAsIG9mZnNldCArIChkKzEpICogbGluZVdpZHRoIC0gMlxuICAgICAgICAgICAgXS5qb2luKCctJyk7XG5cbiAgICAgICAgICAgIHAgPSByZXF1ZXN0KGhyZWYsIHtoZWFkZXJzOiB7cmFuZ2U6ICdieXRlcz0nICsgcmFuZ2V9fSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHB1dCBhbGwgdGhlIGZldGNoZXMgbGluZXMgb250byB0aGUgbGluZWNhY2hlXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZCBwdXNoIHRoZW0gdG8gdGhlIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgIHJlcS5yZXNwb25zZS5zcGxpdCgnXFxuJykuZm9yRWFjaChmdW5jdGlvbiAobCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlcSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogbC5zdWJzdHIoMCwgbGFiZWxXaWR0aClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAsIHNlcXVlbmNlOiBsLnN1YnN0cihsYWJlbFdpZHRoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVDYWNoZS5zZXQoYytpLCBzZXEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGxpbmVQcm9taXNlc1tjK2ldO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdhaXQucHVzaChwKTtcbiAgICAgICAgICAgIGZvciAoaT1jO2kgPD1kOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsaW5lUHJvbWlzZXNbaV0gPSBwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHdhaXQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbGluZUNhY2hlLnNsaWNlKGEsIGIrMSk7XG4gICAgICAgIH0pO1xuICAgIH0uYmluZCh0aGlzKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1TQTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcmVxdWVzdCh1cmwsIG9wdCkge1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICByZXEub3BlbihvcHQubWV0aG9kIHx8ICdHRVQnLCB1cmwsIHRydWUpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKG9wdC5oZWFkZXJzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcihrLCBvcHQuaGVhZGVyc1trXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVxLnN0YXR1cyA+PSA0MDAgPyByZWplY3QocmVxKSA6IHJlc29sdmUocmVxKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXEuc2VuZChvcHQuZGF0YSB8fCB2b2lkIDApO1xuICAgIH0pO1xufTtcbiJdfQ==
