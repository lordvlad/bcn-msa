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
