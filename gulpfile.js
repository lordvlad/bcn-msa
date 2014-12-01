var fs = require('fs');
var gulp = require('gulp');
var http = require('http');
var path = require('path');
var extend = require('extend');
var through = require('through');
var gutil = require('gulp-util');
var ecstatic = require('ecstatic');
var watchify = require('watchify');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var streamify = require('gulp-streamify');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var WSS = require('ws').Server;

var bOpt = extend({}, watchify.args, {debug: true});
var sOpt = {modules: ['es6-macros']};

function getBundleName () {
    var version = require('./package.json').version;
    var name = require('./package.json').name;
    return name + '.' + version;
}

gulp.task('dist', function () {

    var name = getBundleName();

    return (browserify('./src/index.js', bOpt)
            .bundle()
            .on('error', gutil.log.bind(gutil, 'Browserify Error'))
            .pipe(source(name + '.js'))
            .pipe(gulp.dest('./dist'))
            .pipe(rename(name + '.min.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({loadMaps: true}))
              .pipe(uglify())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./dist'))
            .pipe(gulp.dest('./demo'))
           );
});


gulp.task('watch', function () {

    http.createServer(ecstatic({root: __dirname + '/demo'})).listen(9080);
    var wss = new WSS({port: 9081});

    wss.on('connection', function (ws) {
        gutil.log('client connected');
    });

    function broadcast() {
        return through(function(){
            for (var i in wss.clients)
                wss.clients[i].send('RELOAD');

            gutil.log('Rebundle done! Reload!');
        });
    }

    var bundler = (watchify(browserify('./src/index.js', bOpt))
                   .on('update', rebundle));

    function rebundle() {
        gutil.log('Rebundle...');
        return (bundler
                .bundle()
                .on('error', gutil.log.bind(gutil, 'Browserify Error'))
                .pipe(source(getBundleName() + '.js'))
                .pipe(jshint())
                .pipe(jshint.reporter('default'))
                .pipe(gulp.dest('./demo'))
                .pipe(broadcast())
               );
    }

    return rebundle();
});
