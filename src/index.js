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
