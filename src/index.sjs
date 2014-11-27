var request = require('./request')
, MSA = require('./MSASource')
, extend = require('extend')
, colorSchemeSelector = require('biojs-util-colorschemes').selector
, Readable = require('stream').Readable
, Writable = require('stream').Writable
, zlib = require('browserify-zlib')
;

function streamify(buff) {
    var start = 0, len = buff.length;
    var stream = new Readable();

    stream._read = function (size) {
        size = size || 4 * 1024;

        var end = start + size;

        if (start > len)
            return this.push(null);

        if (end > len)
            end = len;

        this.push(buff.slice(start, end));

        start += size;
    };

    return stream;
}

function analysis() {
    var consensus = [];

    var stream = new Writable();
    stream.on('finish', e => {

        console.log('file processed after', floor((+new Date() - t)/10)/10, 's');
        t = +new Date();


        var seq = consensus.reduce(function (memo, pos) {
            return memo + Object.keys(pos).reduce(function (memo, k) {
                                            return pos[k] > memo ? k : memo;
                }, '');
        }, '');


        console.log(seq);
    });

    stream.on('error', console.log.bind(console));

    var buffer = '';
    var inBody = false;
    var header = [];
    var t;

    stream._write = function (chunk, enc, cb) {


        if (!t) {
            console.log('starting analysis...');
            t = +new Date();
        }

        buffer += chunk.toString('utf8');

        var i, l, line
        ,  lastEOL = buffer.lastIndexOf('\n');

        if (lastEOL === -1)
            lastEOL = buffer.size;

        chunk = buffer.substring(0, lastEOL).split('\n');
        buffer = buffer.substring(lastEOL);

        l = chunk.length;
        i = 0;

        while (i < l) {
            line = chunk[i++];

            if (!inBody) {
                if (line.length === 0 || header.length === 0)
                    header.push(line);
                else
                    inBody = true;
            }

            if (inBody) {
                let lbl = line.substring(0, line.indexOf(' '));
                let seq = line.substring(line.lastIndexOf(' ')+1);
                let j = 0, m = seq.length;

                while (j < m) {
                    let aa = seq[j++];

                    if (aa !== '-') {
                        if (!consensus[j]) consensus[j] = {};
                        if (!consensus[j][aa]) consensus[j][aa] = 0;
                        consensus[j][aa]++;
                    }
                }
            }
        }


        return cb(), true;
    };

    return stream;
}


window.analyze = function (url) {

    var xhr = new XMLHttpRequest();

    var x = 10;

    xhr.open('GET', url + '.gz');
    xhr.responseType = 'arraybuffer';

    xhr.onload = function (e) {
        var b = new Buffer(new Uint8Array(xhr.response));

        console.log('download complete after', floor((+new Date() - t)/10)/100, 's');

        streamify(b)
            .pipe(zlib.createGunzip())
            .pipe(analysis(b));

        xhr = null;
    };

    var t = +new Date();
    console.log('starting download...');
    xhr.send(null);

};

/**
 * Helpers
 */

var floor = Math.floor.bind(Math);
var ceil = Math.ceil.bind(Math);

function minmaxval(mi, ma, val) {
    if (val < mi) return mi;
    if (val > ma) return ma;
    return val;
}

function slice(arr, a, b) {
    return Array.prototype.slice.call(arr, a, b);
}

function $(q, r) {
    return (r||document).querySelector(q);
}

function $$(q, r) {
    if (q.constructor.name !== 'NodeList')
        q = (r||document).querySelectorAll(q);

    return slice(q);
}

/**
 * MultiSequenceAlignment Viewer class
 */


class MSAView  {

    /**
     * Create MutliSequenceAlignment Viewer
     * Options include
     *     font: {string} like '12px monospace'
     *     lineHeight: {int}
     *     labelWidth: {int}
     *     leftMargin: {int}
     *     letterSpacing: {int}
     *     cursorColor: {string} like 'rgba(128, 128, 128, 0.2)'
     *     loadingText: {string}
     *
     * @constructor
     * @param {DOMNode} root
     * @param {object}  options
     */

    constructor (root, options) {

        window.a = this;

        var canvas;

        // include default options and options from DOM dataset
        options = extend({}, MSAView.defaultOptions, root.dataset, options);

        // create canvas if not present
        if (!(canvas = $('canvas', root)))
            root.appendChild(canvas = document.createElement('canvas'));

        if ('bcnMsaFullscreen' in options)
            root.style.width = root.style.height = '100%';

        // set canvas proportions and hide cursor
        canvas.width = root.offsetWidth;
        canvas.height = root.offsetHeight;
        // canvas.style.cursor = 'none';

        // convenience method
        canvas.on = (event, callback) => {
            return canvas.addEventListener(event, callback.bind(this));
        };

        // attach event handlers
        canvas.on('mousewheel', this.onScroll);
        canvas.on('wheel', this.onScroll);
        canvas.on('mousemove', this.onPointerMove);
        canvas.on('mouseout', this.onPointerOut);
        canvas.on('mousedown', this.onPointerDown);
        canvas.on('mouseup', this.onPointerUp);
        canvas.on('contextmenu', e => e.preventDefault() );

        this.alignment = new MSA(root.dataset.alignment);
        this.scrollPos = {x: 0, y: 0, maxX: 0, maxY: 0};
        this.ctx = canvas.getContext('2d');
        this.ctx.font = options.font;
        this.draw = this.draw.bind(this);
        this.render = this.draw.bind(this);
        this.colorScheme = colorSchemeSelector.getColor(options.colorScheme);
        this.options = options;
        this.canvas = canvas;
        this.mousePos = null;
        this.LOCK = false;
        this.view = null;
        this.updateView();

        requestAnimationFrame(this.draw);
    }

    updateView () {

        if (this.LOCK)
            return this.LOCK;

        if (!(this.view))
            return Promise.resolve();


        var cvs = this.canvas
        , aln = this.alignment
        , opt = this.options
        , view = this.view
        , scroll = this.scrollPos
        , em = view.charWidth + opt.letterSpacing
        , H = cvs.clientHeight, W = cvs.clientWidth
        ;

        return (this.LOCK = Promise.all([
            aln.getLines(view.offsetY, view.offsetY + view.height)
            , aln.getSize()
        ]).then(function (res) {

            view.tracks = res[0];
            view.alignment = res[1].alignment;
            view.count = res[1].sequenceCount;
            view.sequenceWidth = res[1].sequenceWidth;

            scroll.maxX = floor(view.sequenceWidth * em)
                - W + opt.labelWidth + opt.leftMargin;
            scroll.maxY = (res[1].sequenceCount - view.height)
                * opt.lineHeight - H;

            view.lastOffsetY = view.offsetY;
            this.LOCK = false;
        }.bind(this)));
    }

    onScroll (e) {
        if (this.LOCK)
            return;

        var s = this.scrollPos
        , dx = e.deltaX || -e.wheelDeltaX
        , dy = e.deltaY || -e.wheelDeltaY
        ;

        s.x = floor(minmaxval(0, s.maxX, s.x + dx));
        s.y = floor(minmaxval(0, s.maxY, s.y + dy));
    }

    onPointerOut () {
        this.mousePos = null;
    }

    onPointerMove (e) {
        var r = this.canvas.getBoundingClientRect()
        , m = this.mousePos || {}
        ;

        this.mousePos = {
            left: m.left
            , right: m.right
            , middle: m.middle
            , y: e.clientY - r.top
            , x: e.clientX - r.left
        };
    }

    onPointerDown (e) {
        var m = this.mousePos;

        if (!m) return;

        switch (e.which) {
            case 1: m.left = true; break;
            case 3: m.right = true; break;
            case 2: m.middle = true; break;
        }

        if (m.middle)
            this.scrollPos.pan = {x: m.x, y: m.y};

        if (m.left)
            this.view.mark = {sx: m.sx, sy: m.sy};

    }

    onPointerUp (e) {
        var m = this.mousePos;

        if (m.middle)
            this.scrollPos.pan = null;

        switch (e.which) {
            case 1: m.left = false; break;
            case 3: m.right = false; break;
            case 2: m.middle = false; break;
        }


    }

    draw (t) {

        var cvs = this.canvas
        , ctx = this.ctx
        , opt = this.options
        , view = this.view
        , lock = this.LOCK
        , mouse = this.mousePos
        , scroll = this.scrollPos
        , col = this.colorScheme
        , em = view && (view.charWidth + opt.letterSpacing)
        , charWidth = view && view.charWidth
        , H = cvs.clientHeight, W = cvs.clientWidth
        , lineHeight = opt.lineHeight
        , letterSpacing = opt.letterSpacing
        , labelWidth = opt.labelWidth
        , leftMargin = opt.leftMargin
        ;

        if (!view) {
            view = this.view = {tracks: []};
            charWidth = view.charWidth = ceil(ctx.measureText('x').width);
            em = view.charWidth + letterSpacing;
            view.height = floor(H / lineHeight) - 4;
            view.seqOffset = labelWidth + letterSpacing + leftMargin;
            view.labelTruncate = floor((labelWidth - leftMargin) / charWidth);
        }

        // check mouse middle button scroll
        if (mouse && mouse.middle) {
            let dx = (mouse.x - scroll.pan.x) / 10
            , dy = (mouse.y - scroll.pan.y) / 10
            ;

            scroll.x = floor(minmaxval(0, scroll.maxX, scroll.x + dx));
            scroll.y = floor(minmaxval(0, scroll.maxY, scroll.y + dy));
        }


        view.offsetX = floor(scroll.x / em);
        view.offsetY = floor(scroll.y / lineHeight);

        // get mouse coordinates relative to sequence and
        // aminoacid position
        if (mouse) {
            mouse.sx = floor((mouse.x - view.seqOffset) / em) + view.offsetX;
            mouse.sy = floor(mouse.y / lineHeight) - 2 + view.offsetY;
        }

        // maybe we need to fetch new lines from the underlying source
        if (!lock && (view.offsetY !== view.lastOffsetY))
            this.updateView();

        // clear canvas
        ctx.clearRect(0, 0, W, H);

        // loading text
        if (lock)
            ctx.fillText(opt.loadingText, leftMargin, lineHeight);


        // ruler
        {
            let y = lineHeight * 2, x = view.seqOffset, i = view.offsetX + 1;
            while (x < W) {
                if (i % 10 === 0 || i === 1)
                    ctx.fillText(i+'', x, y);
                else if (i % 5 === 0)
                    ctx.fillText('.', x, y);

                i += 1;
                x += em;
            }
        }


        // tracks
        if (view && view.tracks) {
            let bgW = em + 2, bgH = lineHeight + 2
            , bgX = -em/4, bgY = -lineHeight * 4/5
            , m = mouse
            ;

            view.tracks.forEach(function (t, i) {

                let y = (i + 3) * lineHeight, x = view.seqOffset
                , j = view.offsetX, s =  t.sequence, l = t.label
                ;

                // sequence
                while (x < W) {
                    let a = s[j];
                    if ((aa = s[j]) !== '-' && col[aa]) {
                        ctx.beginPath();
                        ctx.fillStyle = col[aa];
                        ctx.strokeStyle = col[aa];
                        ctx.rect(x + bgX, y + bgY, em, lineHeight);
                        ctx.fill(); ctx.stroke();
                        ctx.closePath();
                        ctx.fillStyle = 'black';
                    }
                    ctx.fillText(aa, x, y);

                    j += 1;
                    x += em;
                }

                // label
                if (m && (mouse.sx < view.offsetX) && mouse.sy === view.offsetY + i) {
                    ctx.save();
                    ctx.fillStyle = 'rgb(255, 255, 255)';
                    ctx.fillRect(leftMargin, y - lineHeight + 2
                                 , W, lineHeight + 4);
                    ctx.restore();
                } else {
                    l = l.substr(0, view.labelTruncate) + '...';
                }

                ctx.fillText(l, leftMargin, y);
            });
        }

        if (mouse) {
            let r = mouse.left || mouse.right || mouse.middle ? 6 : 4;

            // info line
            if (view.tracks && view.tracks[mouse.sy]) {
                let seq = view.tracks[mouse.sy]
                , pos = seq.sequence[mouse.sx];

                if (pos && pos !== '-') {
                    pos += seq.sequence.substr(0, mouse.sx).replace(/-/g,'').length+1;
                    ctx.fillText(pos, view.seqOffset, lineHeight);
                }
                ctx.fillText(seq.label, view.seqOffset + 6 * charWidth, lineHeight);
            }

            // ctx.save();
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
        }


        requestAnimationFrame(this.draw);
    }

}

function fillCircle(x, y, r, ctx) {

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.closePath();
}

MSAView.create = function (options, domNode) {
    return new MSAView(domNode, options);
};

MSAView.defaultOptions = {
    font: '12px monospace'
    , lineHeight: 14     // px
    , labelWidth: 100    // px
    , leftMargin: 20     // px
    , letterSpacing: 8   // px between aminoacids
    , cursorColor: 'rgba(128, 128, 128, 0.2)'
    , loadingText: 'loading...'
    , colorScheme: 'clustal2'
};


$$('[data-bcn="msa"]').map(MSAView.create.bind(null, null));
