var fs = require('fs');
var path = require('path');
var less = require('less');
var stylus = require('stylus');
var jake = require('jake');
var exorcist = require('exorcist');
var stream = require('stream');
var Buffer = require('buffer').Buffer;
var gaze = require('gaze');
var browserify = require('browserify');
var watchify = require('watchify');

function noop() {}

/**
 * Compiles less files to css
 *
 * @param Object options
 * @param Function cb
 *
 * Options:
 *
 * - Array src - List of glob patterns for source files
 * - String dest - Destination directory
 * - Boolean debug - if true source maps will be generated
 */
function compileLess(options, cb)
{
  cb = cb || noop;
  var src = options.src;
  var dest = options.dest;

  var lessFiles = new jake.FileList();
  lessFiles.include(src);

  var done = 0;

  lessFiles = lessFiles.toArray();
  lessFiles.forEach(function(file) {
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

/**
 * Watches and recompiles less files
 * @param Object options
 *
 * See compileLess for available Options
 *
 * Options:
 *
 * - Array watchPaths - Additional paths/glob patterns to watch
 */
function watchLess(options)
{
  // make src paths relative as gaze has problems with absolute patsh
  var cwd = process.cwd();
  var src = options.src.concat(options.watchPaths || []);
  var src = src.map(function(src) {
    return path.relative(cwd, src);
  });

  var g = new gaze(src);
  g.on('all', cb);
  cb();

  function cb() {
    compileLess(options);
  }
}
module.exports.watchLess = watchLess;

/**
 * Compiles Stylus files to css
 *
 * @param Object options
 * @param Function cb
 *
 * Options:
 *
 * - Array src - List of glob patterns for source files
 * - String dest - Destination directory
 * - Boolean debug - if true source maps will be generated
 * - plugins - list of plugins to use (plugin constructors must be insterted executed here)
 */
function compileStylus(options, cb)
{
  cb = cb || noop;
  var src = options.src;
  var dest = options.dest;
  var plugins = options.plugins || [];

  var stylusFiles = new jake.FileList();
  stylusFiles.include(src);

  var done = 0;

  stylusFiles = stylusFiles.toArray();
  stylusFiles.forEach(function(file) {
    var destFile = path.join(dest, path.basename(file).replace('.styl', '.css'));

    // remove existing css
    jake.rmRf(destFile, {silent: true});

    console.log('Writing css to ' + destFile);
    var s = stylus(fs.readFileSync(file, 'utf8'), { filename: file });
    plugins.forEach(function(plugin) {
      s.use(plugin);
    });

    s.render(
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
        fs.writeFile(dest, css, 'utf8', onDone);
        return;
      }

      var s = new stream.Readable();
      s._read = noop;
      s.push(css);
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

    if (done === stylusFiles.length) {
      cb(null);
    }
  }
}
module.exports.compileStylus = compileStylus;

/**
 * Watches and recompiles Stylus files
 * @param Object options
 *
 * See compileStylus for available Options
 *
 * Options:
 *
 * - Array watchPaths - Additional paths/glob patterns to watch
 */
function watchStylus(options)
{
  // make src paths relative as gaze has problems with absolute paths
  var cwd = process.cwd();
  var src = options.src.concat(options.watchPaths || []);
  var src = src.map(function(src) {
    return path.relative(cwd, src);
  });

  var g = new gaze(src);
  g.on('all', cb);
  cb();

  function cb() {
    compileStylus(options);
  }
}
module.exports.watchStylus = watchStylus;

function getVendors(pathToPackage, exclude, include)
{
  exclude = exclude || [];
  include = include || [];
  var pkg = require(pathToPackage);

  var packages = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
  return packages.filter(function(name) {
    if (include.length) {
      return (include.indexOf(name) !== -1);
    }
    else {
      return (exclude.indexOf(name) === -1);
    }
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
  var opts = {
    cache: {},
    packageCache: {},
    //fullPaths: true,
    basedir: options.baseDir || './',
    debug: (typeof options.debug !== 'undefined') ? options.debug : true
  };

  var reservedOpts = [
    'src',
    'dest',
    'vendorSrc',
    'vendorDest',
    'vendorInclude',
    'noVendors',
    'baseDir',
    'package',
    'debug'
  ];

  // copy all other options
  Object.keys(options).forEach(function(key) {
    if (reservedOpts.indexOf(key) === -1) {
      opts[key] = options[key];
    }
  });

  var appBundle = browserify(
      options.src,
      opts
  );

  if (options.transforms) {
    options.transforms.forEach(function(transform) {
      appBundle.transform(transform);
    })
  }

  var bundles = {};
  bundles[options.dest] = appBundle;

  if (!options.noVendors && !options.vendorDest) fail('Missing "vendorDest" option. If you do not want a seperate vendors file use the "noVendors" option.');

  if (options.vendorExclude || options.vendorInclude) {
    var vendors = getVendors(options.package || path.join(process.cwd(), 'package.json'), options.vendorExclude, options.vendorInclude);
    appBundle.external(vendors);
  }

  if (!options.noVendors) {
    var vendorsBundle = browserify(
        options.vendorSrc || path.join(__dirname, 'vendors.js'),
        opts
    );

    vendorsBundle.require(vendors);
    bundles[options.vendorDest] = vendorsBundle;
  }

  return bundles;
}

/**
 * Compiles javascript with browserify
 * @param Object options
 * @param Function cb
 *
 * Options:
 *
 * - Array src - List of glob patterns for source files
 * - String dest - Destination file
 * - Boolean noVendors - if true, no separate vendors file will be used
 * - Array vendorSrc - List of glob pattern for source files of vendor modules
 * - String vendorDest - Destination file for compiled vendors
 * - Array vendorExclude - Module names to exlclude from vendors
 * - Array vendorInclude - Module names to include from vendors (ignores vendorExclude)
 * - Boolean debug - if true source maps will be created
 * - String baseDir - baseDir as in browserify options
 * - String package - path to package.json to use for vendor detection
 * - Array transforms - list of transforms
 */
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

/**
 * Watches javascript files and compiles them with browserify
 * @param options
 *
 * See compileBrowserify for available Options
 */
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

/**
 * Watches one or more paths for changes
 * @param src {String|Array}
 * @param cb {Function}
 */
function watch(src, cb)
{
  var g = new gaze(src);
  g.on('all', cb);
}
module.exports.watch = watch;
