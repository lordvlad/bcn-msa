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
