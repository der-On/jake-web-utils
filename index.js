var fs = require('fs');
var path = require('path');
var less = require('less');
var jake = require('jake');
var exorcist = require('exorcist');
var stream = require('stream');
var Buffer = require('buffer').Buffer;
var gaze = require('gaze');
var browserify = require('browserify');
var watchify = require('watchify');

function noop() {}

function compileLess(options, cb)
{
  cb = cb || noop;
  var src = options.src;
  var dest = options.dest;

  var lessFiles = new jake.FileList();
  lessFiles.include(src);

  var done = 0;

  lessFiles.toArray().forEach(function(file) {
    var destFile = path.join(dest, path.basename(file).replace('.less', '.css'));

    // remove existing css
    jake.rmRf(destFile, {silent: true});

    console.log('Writing css to ' + destFile);
    less.render(
        fs.readFileSync(file, 'utf8'),
        {
          paths: src.map(function(_src) { return path.dirname(_src); }),
          sourceMap: true
        },
        onRendered.bind(null, destFile)
    );
  });

  function onRendered(dest, error, css) {
    if (error) {
      console.error(error);
      onDone();
    }
    else {
      if (!options.debug) {
        fs.writeFile(dest, css.css, 'utf8', onDone);
        return;
      }

      var s = new stream.Readable();
      s._read = noop;
      s.push(css.css);
      s.push(null);

      var smap = new stream.Duplex();

      smap._write = function(data) {
        smap.push(data.toString().replace(new RegExp("\/\/# sourceMappingURL=(.*)?"), '/*# sourceMappingURL=$1*/'));
        smap.push(null);
      };
      smap._read = noop;

      s.pipe(exorcist(dest + '.map'))
          .pipe(smap)
          .pipe(fs.createWriteStream(dest, 'utf8'))
          .on('finish', onDone);
    }
  }

  function onDone()
  {
    done++;

    if (done === lessFiles.length) {
      cb(null);
    }
  }
}
module.exports.compileLess = compileLess;

function watchLess(options)
{
  var g = new gaze(options.src);
  g.on('all', cb);
  cb();

  function cb() {
    compileLess(options);
  }
}
module.exports.watchLess = watchLess;

function noop() {}

function getVendors(pathToPackage, exclude)
{
  exclude = exclude || [];
  var pkg = require(pathToPackage);

  var packages = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
  return packages.filter(function(name) {
    return (exclude.indexOf(name) === -1);
  });
}

function writeBrowserifyBundle(b, dest, cb)
{
  if (typeof cb !== 'function') cb = noop;

  console.log('Writing bundle to ' + dest);
  b.bundle(onBundle)
      .pipe(exorcist(dest + '.map'))
      .pipe(fs.createWriteStream(dest, 'utf8'))
      .on('finish', cb);

  function onBundle(error) {
    if (error) {
      console.error(error);
    }
  }
}

function createBrowserifyBundles(options)
{
  var vendors = getVendors(options.package || './package.json', options.vendorExclude);

  var opts = {
    cache: {},
    packageCache: {},
    //fullPaths: true,
    basedir: options.baseDir || './',
    debug: (typeof options.debug !== 'undefined') ? options.debug : true
  };

  var appBundle = browserify(
    options.src,
    opts
  );

  appBundle.external(vendors);

  var vendorsBundle = browserify(
    options.vendorSrc,
    opts
  );

  vendorsBundle.require(vendors);

  var bundles = {};
  bundles[options.dest] = appBundle;
  bundles[options.vendorDest] = vendorsBundle;

  return bundles;
}

function compileBrowserify(options, cb)
{
  var bundles = createBrowserifyBundles(options);
  var done = 0;
  var num = Object.keys(bundles).length;
  Object.keys(bundles).forEach(function(dest) {
    writeBrowserifyBundle(bundles[dest], dest, onBundled);
  });

  function onBundled() {
    done++;

    if (done === num) {
      cb();
    }
  }
}
module.exports.compileBrowserify = compileBrowserify;

function watchBrowserify(options)
{
  var bundles = createBrowserifyBundles(options);
  Object.keys(bundles).forEach(function(dest) {
    bundles[dest] = watchify(bundles[dest]);
    var bundle = bundles[dest];
    writeBrowserifyBundle(bundle, dest, noop);
    bundle.on('update', writeBrowserifyBundle.bind(null, bundle, dest));
  });
}
module.exports.watchBrowserify = watchBrowserify;